// Phase 3 — Behavior intelligence: Top 3 prioritization, freeze tokens, pattern detection
import { differenceInDays, parseISO, format, subDays, startOfWeek } from "date-fns";
import type { Task, Habit, Completion } from "@/lib/streaks";
import type { HabitFreeze, FocusSession } from "@/lib/data-phase3";

// ===== Top 3 Focus =====
export type ScoredTask = Task & { score: number; reason: string };

export function scoreTask(task: Task, now: Date = new Date()): { score: number; reason: string } {
  const priority = task.priority === "high" ? 100 : task.priority === "medium" ? 60 : 30;

  let urgency = 0;
  let urgencyLabel = "no due date";
  if (task.due_date) {
    const due = parseISO(task.due_date);
    const days = differenceInDays(due, now);
    if (days < 0) {
      urgency = 120;
      urgencyLabel = `overdue by ${Math.abs(days)}d`;
    } else if (days === 0) {
      urgency = 80;
      urgencyLabel = "due today";
    } else if (days === 1) {
      urgency = 40;
      urgencyLabel = "due tomorrow";
    } else if (days <= 7) {
      urgency = 20;
      urgencyLabel = `due in ${days}d`;
    }
  }

  const ageDays = differenceInDays(now, parseISO(task.created_at));
  const age = Math.min(ageDays * 2, 30);

  const score = priority + urgency + age;
  const reason = `${task.priority} priority · ${urgencyLabel}${ageDays > 3 ? ` · ${ageDays}d old` : ""}`;
  return { score, reason };
}

export function topThreeTasks(tasks: Task[]): ScoredTask[] {
  const incomplete = tasks.filter((t) => !t.completed);
  const scored = incomplete.map((t) => ({ ...t, ...scoreTask(t) }));
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.created_at.localeCompare(b.created_at);
  });
  return scored.slice(0, 3);
}

// ===== Streak protection (freeze tokens) =====
export const FREEZE_TOKENS_PER_WEEK = 2;

export function freezeTokensRemaining(habitId: string, freezes: HabitFreeze[], now: Date = new Date()): number {
  const wk = format(startOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd");
  const usedThisWeek = freezes.filter((f) => f.habit_id === habitId && f.week_of === wk).length;
  return Math.max(0, FREEZE_TOKENS_PER_WEEK - usedThisWeek);
}

export function streakWithFreezes(
  habitId: string,
  completions: Completion[],
  freezes: HabitFreeze[],
): { current: number; freezesUsed: number } {
  const doneDays = new Set(completions.filter((c) => c.habit_id === habitId).map((c) => c.completed_on));
  const freezeDays = new Set(freezes.filter((f) => f.habit_id === habitId).map((f) => f.used_on));

  let cursor = new Date();
  // Forgive today if not yet done
  const todayStr = format(cursor, "yyyy-MM-dd");
  if (!doneDays.has(todayStr) && !freezeDays.has(todayStr)) {
    cursor = subDays(cursor, 1);
  }

  let current = 0;
  let freezesUsed = 0;
  for (let i = 0; i < 365; i++) {
    const d = format(cursor, "yyyy-MM-dd");
    if (doneDays.has(d)) {
      current++;
    } else if (freezeDays.has(d)) {
      current++;
      freezesUsed++;
    } else {
      break;
    }
    cursor = subDays(cursor, 1);
  }
  return { current, freezesUsed };
}

// ===== Pattern detection (insights) =====
export type Insight = {
  id: string;
  kind: "ghost" | "overload" | "weak_dow" | "fragile_streak" | "momentum";
  title: string;
  body: string;
  fix?: string;
};

export function detectInsights(
  tasks: Task[],
  habits: Habit[],
  completions: Completion[],
  focusSessions: FocusSession[],
): Insight[] {
  const insights: Insight[] = [];
  const now = new Date();

  // Ghost mode: no activity 3+ days
  const recentDates = new Set<string>();
  completions.forEach((c) => recentDates.add(c.completed_on));
  tasks.filter((t) => t.completed_at).forEach((t) => recentDates.add(t.completed_at!.slice(0, 10)));
  focusSessions.forEach((f) => recentDates.add(f.started_at.slice(0, 10)));

  let lastActive: Date | null = null;
  for (let i = 0; i < 30; i++) {
    const d = format(subDays(now, i), "yyyy-MM-dd");
    if (recentDates.has(d)) {
      lastActive = subDays(now, i);
      break;
    }
  }
  const daysSinceActive = lastActive ? differenceInDays(now, lastActive) : 99;
  if (daysSinceActive >= 3 && (habits.length > 0 || tasks.length > 0)) {
    insights.push({
      id: "ghost",
      kind: "ghost",
      title: "Welcome back 👋",
      body: `It's been ${daysSinceActive} days. No guilt — just pick one small thing today.`,
      fix: "Open Tasks and complete just one. Momentum > perfection.",
    });
    return insights; // priority insight
  }

  // Task overload: >15 incomplete
  const incomplete = tasks.filter((t) => !t.completed).length;
  if (incomplete >= 15) {
    insights.push({
      id: "overload",
      kind: "overload",
      title: "Your task list is overloaded",
      body: `${incomplete} open tasks. You're adding faster than you finish.`,
      fix: "Archive or delete stale tasks. Aim for under 10 active.",
    });
  }

  // Day-of-week weakness (need 4+ weeks of data)
  if (completions.length >= 28) {
    const dowCount: Record<number, { done: number; total: number }> = {};
    for (let i = 0; i < 28; i++) {
      const d = subDays(now, i);
      const dow = d.getDay();
      const dStr = format(d, "yyyy-MM-dd");
      dowCount[dow] ??= { done: 0, total: 0 };
      dowCount[dow].total += habits.length;
      dowCount[dow].done += completions.filter((c) => c.completed_on === dStr).length;
    }
    const rates = Object.entries(dowCount).map(([dow, v]) => ({
      dow: parseInt(dow),
      rate: v.total > 0 ? v.done / v.total : 0,
    }));
    const avg = rates.reduce((s, r) => s + r.rate, 0) / Math.max(1, rates.length);
    const weak = rates.find((r) => r.rate < avg * 0.5 && avg > 0.2);
    if (weak) {
      const names = ["Sundays", "Mondays", "Tuesdays", "Wednesdays", "Thursdays", "Fridays", "Saturdays"];
      insights.push({
        id: `weak_${weak.dow}`,
        kind: "weak_dow",
        title: `${names[weak.dow]} are tough for you`,
        body: `Your habit completion drops ${Math.round((1 - weak.rate / avg) * 100)}% on ${names[weak.dow]}.`,
        fix: "Plan a smaller version of your habit for this day.",
      });
    }
  }

  // Momentum (positive insight)
  if (insights.length === 0) {
    const last7 = Array.from({ length: 7 }).map((_, i) => format(subDays(now, i), "yyyy-MM-dd"));
    const completedLast7 = completions.filter((c) => last7.includes(c.completed_on)).length;
    if (habits.length > 0 && completedLast7 >= habits.length * 5) {
      insights.push({
        id: "momentum",
        kind: "momentum",
        title: "You're in a flow state",
        body: `${completedLast7} habit check-ins this week. Identity-level consistency.`,
      });
    }
  }

  return insights;
}

// ===== Focus stats =====
export function focusStatsToday(sessions: FocusSession[]): { minutes: number; count: number } {
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const todays = sessions.filter((s) => s.started_at.slice(0, 10) === todayStr);
  return {
    minutes: todays.reduce((s, x) => s + (x.actual_minutes || 0), 0),
    count: todays.length,
  };
}
