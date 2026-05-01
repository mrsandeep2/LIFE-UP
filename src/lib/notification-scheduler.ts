import * as React from "react";
import { useAuth } from "@/lib/auth";
import { useNotificationPrefs } from "@/lib/notification-prefs";
import { useTasks, useHabits, useCompletions } from "@/lib/data";
import { useUpcomingInterviews } from "@/lib/interview-events";
import {
  upsertNotification,
  type NotificationType,
  dedupKeyFor,
} from "@/lib/notifications";

const POLL_MS = 30_000;

function isQuiet(now: Date, start: string | null, end: string | null): boolean {
  if (!start || !end) return false;
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const mins = now.getHours() * 60 + now.getMinutes();
  const sMin = sh * 60 + sm;
  const eMin = eh * 60 + em;
  // overflow midnight (e.g. 22:00 -> 07:00)
  if (sMin > eMin) return mins >= sMin || mins < eMin;
  return mins >= sMin && mins < eMin;
}

function todayLocalISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Client-side scheduler. Runs every 30s while the app is open.
 * - Fires task_pre / task_due / habit_reminder / interview_pre_hour / interview_pre_10
 * - Server cron handles missed/follow-up + push/email
 */
export function useNotificationScheduler() {
  const { user } = useAuth();
  const { prefs } = useNotificationPrefs();
  const { data: tasks = [] } = useTasks();
  const { data: habits = [] } = useHabits();
  const { data: completions = [] } = useCompletions();
  const { data: interviews = [] } = useUpcomingInterviews();

  // keep latest values in a ref so the interval doesn't restart on each change
  const ref = React.useRef({ tasks, habits, completions, interviews, prefs });
  React.useEffect(() => {
    ref.current = { tasks, habits, completions, interviews, prefs };
  }, [tasks, habits, completions, interviews, prefs]);

  React.useEffect(() => {
    if (!user) return;

    const tick = async () => {
      const { tasks, habits, completions, interviews, prefs } = ref.current;
      if (!prefs || !prefs.enabled) return;
      const now = new Date();
      const quiet = isQuiet(now, prefs.quiet_hours_start, prefs.quiet_hours_end);

      // ---------- TASKS ----------
      if (prefs.tasks_enabled) {
        for (const t of tasks) {
          if (t.completed || !t.due_date) continue;
          // due_date is "YYYY-MM-DD"; treat as 23:59 local for all-day
          const due = new Date(`${t.due_date}T23:59:00`);
          const diffMs = due.getTime() - now.getTime();
          // task_pre: 60-65 min before
          if (diffMs > 0 && diffMs <= 65 * 60_000 && diffMs >= 55 * 60_000) {
            await upsertNotification({
              userId: user.id,
              type: "task_pre",
              title: "Task due in ~1 hour",
              body: t.title,
              relatedId: t.id,
              relatedKind: "task",
              dedupKey: dedupKeyFor("task_pre" as NotificationType, t.id),
            });
          }
          // task_due: within 30s window after due time
          if (diffMs <= 0 && diffMs >= -POLL_MS) {
            await upsertNotification({
              userId: user.id,
              type: "task_due",
              title: "Task due now",
              body: t.title,
              relatedId: t.id,
              relatedKind: "task",
              dedupKey: dedupKeyFor("task_due" as NotificationType, t.id),
            });
          }
        }
      }

      // ---------- HABITS ----------
      if (prefs.habits_enabled && habits.length > 0) {
        const today = todayLocalISO();
        const [hh, mm] = prefs.habit_reminder_time.split(":").map(Number);
        const reminderMins = hh * 60 + mm;
        const nowMins = now.getHours() * 60 + now.getMinutes();
        // fire within ~30s after reminder time
        if (nowMins >= reminderMins && nowMins <= reminderMins + 1) {
          const completedToday = new Set(
            completions.filter((c) => c.completed_on === today).map((c) => c.habit_id),
          );
          const pending = habits.filter((h) => !completedToday.has(h.id));
          if (pending.length > 0) {
            await upsertNotification({
              userId: user.id,
              type: "habit_reminder",
              title: pending.length === 1 ? "Time for your habit" : `${pending.length} habits today`,
              body: pending.map((p) => p.name).slice(0, 3).join(", "),
              dedupKey: dedupKeyFor("habit_reminder" as NotificationType, "all", today),
            });
          }
        }
      }

      // ---------- INTERVIEWS ----------
      if (prefs.interviews_enabled) {
        for (const ev of interviews) {
          if (ev.outcome && ev.outcome !== "pending") continue;
          const at = new Date(ev.scheduled_at);
          const diffMs = at.getTime() - now.getTime();

          // T-1h
          if (diffMs > 0 && diffMs <= 65 * 60_000 && diffMs >= 55 * 60_000) {
            await upsertNotification({
              userId: user.id,
              type: "interview_pre_hour",
              title: "Interview in 1 hour",
              body: ev.title,
              relatedId: ev.id,
              relatedKind: "interview_event",
              dedupKey: dedupKeyFor("interview_pre_hour" as NotificationType, ev.id),
            });
          }
          // T-10m
          if (diffMs > 0 && diffMs <= 11 * 60_000 && diffMs >= 9 * 60_000) {
            await upsertNotification({
              userId: user.id,
              type: "interview_pre_10",
              title: "Interview in 10 minutes",
              body: ev.title + (ev.location ? ` · ${ev.location}` : ""),
              relatedId: ev.id,
              relatedKind: "interview_event",
              dedupKey: dedupKeyFor("interview_pre_10" as NotificationType, ev.id),
            });
          }
        }
      }

      // quiet hours doesn't suppress in-app inserts here (server controls push/email),
      // but we mark the meta so toast can be silenced. Toast suppression is handled in the bell hook.
      void quiet;
    };

    tick();
    const id = setInterval(tick, POLL_MS);
    return () => clearInterval(id);
  }, [user?.id]);
}
