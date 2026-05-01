import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

/**
 * Server-side notification processor.
 * Called by pg_cron every 5 min. Authorized via anon-key bearer.
 *
 * Responsibilities (server-only deltas, beyond what client computes live):
 * - task_due (next 5 min window) — also covered client-side, deduped by dedup_key
 * - task_missed (T+2h, !completed)
 * - task_followup (T+1d after missed if high priority + still incomplete)
 * - habit_reminder (per user habit_reminder_time, if not completed today)
 * - habit_eod (21:00 local-ish; uses prefs.timezone)
 * - interview_pre_day (T-24h)
 * - interview_pre_hour (T-1h)
 * - application_followup (7d after applied_on, status='applied')
 * - cleanup: notifications older than 30d
 */

type Pref = {
  user_id: string;
  enabled: boolean;
  tasks_enabled: boolean;
  habits_enabled: boolean;
  interviews_enabled: boolean;
  career_enabled: boolean;
  habit_reminder_time: string; // "HH:MM:SS"
  timezone: string;
};

function dedupKey(parts: (string | number)[]): string {
  return parts.join(":");
}

function todayInTZ(tz: string): string {
  try {
    const d = new Date();
    const fmt = new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    return fmt.format(d); // YYYY-MM-DD
  } catch {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  }
}

function nowMinutesInTZ(tz: string): number {
  try {
    const fmt = new Intl.DateTimeFormat("en-GB", {
      timeZone: tz,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    const parts = fmt.format(new Date()).split(":");
    return Number(parts[0]) * 60 + Number(parts[1]);
  } catch {
    const d = new Date();
    return d.getUTCHours() * 60 + d.getUTCMinutes();
  }
}

async function processUser(
  admin: any,
  pref: Pref,
  now: Date,
): Promise<number> {
  if (!pref.enabled) return 0;
  const userId = pref.user_id;
  let inserted = 0;
  const inserts: any[] = [];

  // ---------- TASKS ----------
  if (pref.tasks_enabled) {
    const { data: tasks } = await admin
      .from("tasks")
      .select("id,title,due_date,priority,completed,completed_at")
      .eq("user_id", userId)
      .not("due_date", "is", null);

    for (const t of (tasks ?? []) as any[]) {
      const due = new Date(`${t.due_date}T23:59:00Z`);
      const diffMs = due.getTime() - now.getTime();

      // task_due — fire once due time has passed (within the cron window)
      if (!t.completed && diffMs <= 0 && diffMs >= -6 * 60_000) {
        inserts.push({
          user_id: userId,
          type: "task_due",
          category: "task",
          priority: t.priority === "high" ? "high" : "medium",
          title: "Task due now",
          body: t.title,
          related_id: t.id,
          related_kind: "task",
          trigger_at: due.toISOString(),
          dedup_key: dedupKey(["task_due", t.id]),
        });
      }

      // task_missed — T+2h after due, still not completed
      if (!t.completed && diffMs <= -2 * 60 * 60_000 && diffMs >= -2 * 60 * 60_000 - 6 * 60_000) {
        inserts.push({
          user_id: userId,
          type: "task_missed",
          category: "task",
          priority: "high",
          title: "Task overdue",
          body: `You missed: ${t.title}`,
          related_id: t.id,
          related_kind: "task",
          trigger_at: new Date(due.getTime() + 2 * 60 * 60_000).toISOString(),
          dedup_key: dedupKey(["task_missed", t.id]),
        });
      }

      // task_followup — T+1d after due, high priority, still incomplete
      if (
        !t.completed &&
        t.priority === "high" &&
        diffMs <= -24 * 60 * 60_000 &&
        diffMs >= -24 * 60 * 60_000 - 6 * 60_000
      ) {
        inserts.push({
          user_id: userId,
          type: "task_followup",
          category: "task",
          priority: "high",
          title: "Still pending",
          body: `Don't lose momentum on: ${t.title}`,
          related_id: t.id,
          related_kind: "task",
          trigger_at: new Date(due.getTime() + 24 * 60 * 60_000).toISOString(),
          dedup_key: dedupKey(["task_followup", t.id]),
        });
      }
    }
  }

  // ---------- HABITS ----------
  if (pref.habits_enabled) {
    const today = todayInTZ(pref.timezone);
    const nowMin = nowMinutesInTZ(pref.timezone);
    const [hh, mm] = pref.habit_reminder_time.split(":").map(Number);
    const reminderMin = hh * 60 + mm;

    const { data: habits } = await admin
      .from("habits")
      .select("id,name")
      .eq("user_id", userId);

    if ((habits?.length ?? 0) > 0) {
      const { data: comps } = await admin
        .from("habit_completions")
        .select("habit_id")
        .eq("user_id", userId)
        .eq("completed_on", today);
      const done = new Set((comps ?? []).map((c: any) => c.habit_id));
      const pending = (habits ?? []).filter((h: any) => !done.has(h.id));

      // habit_reminder — at user's reminder time (within 6 min cron window)
      if (pending.length > 0 && nowMin >= reminderMin && nowMin <= reminderMin + 6) {
        inserts.push({
          user_id: userId,
          type: "habit_reminder",
          category: "habit",
          priority: "medium",
          title: pending.length === 1 ? "Time for your habit" : `${pending.length} habits today`,
          body: pending.map((p: any) => p.name).slice(0, 3).join(", "),
          trigger_at: now.toISOString(),
          dedup_key: dedupKey(["habit_reminder", "all", today]),
        });
      }

      // habit_eod — at 21:00 if anything pending
      const eodMin = 21 * 60;
      if (pending.length > 0 && nowMin >= eodMin && nowMin <= eodMin + 6) {
        inserts.push({
          user_id: userId,
          type: "habit_eod",
          category: "habit",
          priority: "high",
          title: "Don't break your streak",
          body: `${pending.length} habit${pending.length === 1 ? "" : "s"} not done yet today`,
          trigger_at: now.toISOString(),
          dedup_key: dedupKey(["habit_eod", today]),
        });
      }
    }
  }

  // ---------- INTERVIEWS ----------
  if (pref.interviews_enabled) {
    const { data: events } = await admin
      .from("interview_events")
      .select("id,title,scheduled_at,location,outcome")
      .eq("user_id", userId)
      .gte("scheduled_at", new Date(now.getTime() - 60_000).toISOString())
      .lte("scheduled_at", new Date(now.getTime() + 25 * 60 * 60_000).toISOString());

    for (const ev of (events ?? []) as any[]) {
      if (ev.outcome && ev.outcome !== "pending") continue;
      const at = new Date(ev.scheduled_at);
      const diffMs = at.getTime() - now.getTime();

      // T-24h (within 6 min window)
      if (diffMs <= 24 * 60 * 60_000 && diffMs >= 24 * 60 * 60_000 - 6 * 60_000) {
        inserts.push({
          user_id: userId,
          type: "interview_pre_day",
          category: "interview",
          priority: "high",
          title: "Interview tomorrow",
          body: ev.title + (ev.location ? ` · ${ev.location}` : ""),
          related_id: ev.id,
          related_kind: "interview_event",
          trigger_at: new Date(at.getTime() - 24 * 60 * 60_000).toISOString(),
          dedup_key: dedupKey(["interview_pre_day", ev.id]),
        });
      }

      // T-1h (within 6 min window)
      if (diffMs <= 60 * 60_000 && diffMs >= 60 * 60_000 - 6 * 60_000) {
        inserts.push({
          user_id: userId,
          type: "interview_pre_hour",
          category: "interview",
          priority: "high",
          title: "Interview in 1 hour",
          body: ev.title,
          related_id: ev.id,
          related_kind: "interview_event",
          trigger_at: new Date(at.getTime() - 60 * 60_000).toISOString(),
          dedup_key: dedupKey(["interview_pre_hour", ev.id]),
        });
      }
    }
  }

  // ---------- CAREER FOLLOW-UP ----------
  if (pref.career_enabled) {
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60_000)
      .toISOString()
      .slice(0, 10);
    const eightDaysAgo = new Date(now.getTime() - 8 * 24 * 60 * 60_000)
      .toISOString()
      .slice(0, 10);

    const { data: apps } = await admin
      .from("applications")
      .select("id,company,role,applied_on,status")
      .eq("user_id", userId)
      .eq("status", "applied")
      .gte("applied_on", eightDaysAgo)
      .lte("applied_on", sevenDaysAgo);

    for (const a of (apps ?? []) as any[]) {
      inserts.push({
        user_id: userId,
        type: "application_followup",
        category: "career",
        priority: "medium",
        title: "Time to follow up",
        body: `${a.company} · ${a.role} — applied 7 days ago`,
        related_id: a.id,
        related_kind: "application",
        trigger_at: now.toISOString(),
        dedup_key: dedupKey(["application_followup", a.id, a.applied_on]),
      });
    }
  }

  if (inserts.length > 0) {
    const { error } = await admin
      .from("notifications")
      .upsert(inserts, { onConflict: "user_id,dedup_key", ignoreDuplicates: true });
    if (!error) inserted = inserts.length;
  }

  return inserted;
}

export const Route = createFileRoute("/api/public/hooks/process-notifications")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = request.headers.get("authorization");
        const token = auth?.replace("Bearer ", "");
        const expected = process.env.SUPABASE_PUBLISHABLE_KEY;
        if (!token || !expected || token !== expected) {
          return new Response(JSON.stringify({ error: "unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }

        const SUPABASE_URL = process.env.SUPABASE_URL!;
        const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY!;
        const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
          auth: { autoRefreshToken: false, persistSession: false },
        });

        const now = new Date();

        const { data: prefs, error: prefErr } = await admin
          .from("notification_prefs")
          .select(
            "user_id,enabled,tasks_enabled,habits_enabled,interviews_enabled,career_enabled,habit_reminder_time,timezone",
          )
          .eq("enabled", true);

        if (prefErr) {
          return new Response(JSON.stringify({ error: prefErr.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }

        let totalInserted = 0;
        let processed = 0;
        for (const p of (prefs ?? []) as unknown as Pref[]) {
          try {
            totalInserted += await processUser(admin, p, now);
            processed++;
          } catch (e) {
            console.error("user process failed", p.user_id, e);
          }
        }

        // cleanup: delete notifications older than 30 days
        const cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60_000).toISOString();
        await admin.from("notifications").delete().lt("created_at", cutoff);

        return new Response(
          JSON.stringify({
            ok: true,
            users_processed: processed,
            notifications_inserted: totalInserted,
            ts: now.toISOString(),
          }),
          { headers: { "Content-Type": "application/json" } },
        );
      },
    },
  },
});
