import { format, subDays, parseISO, differenceInDays, startOfWeek, addDays, isToday } from "date-fns";

export type Habit = { id: string; name: string; icon: string; color: string; created_at: string };
export type Completion = { habit_id: string; completed_on: string };
export type Task = {
  id: string;
  title: string;
  priority: "low" | "medium" | "high";
  due_date: string | null;
  est_minutes: number | null;
  completed: boolean;
  completed_at: string | null;
  created_at: string;
};

export const today = () => format(new Date(), "yyyy-MM-dd");

export function streakForHabit(habitId: string, completions: Completion[]): { current: number; best: number } {
  const days = new Set(completions.filter((c) => c.habit_id === habitId).map((c) => c.completed_on));
  let current = 0;
  let cursor = new Date();
  // If today not done, start from yesterday for current streak (forgiving)
  if (!days.has(format(cursor, "yyyy-MM-dd"))) {
    cursor = subDays(cursor, 1);
  }
  while (days.has(format(cursor, "yyyy-MM-dd"))) {
    current++;
    cursor = subDays(cursor, 1);
  }
  // best
  const sorted = Array.from(days).sort();
  let best = 0;
  let run = 0;
  let prev: Date | null = null;
  for (const d of sorted) {
    const cur = parseISO(d);
    if (prev && differenceInDays(cur, prev) === 1) run++;
    else run = 1;
    best = Math.max(best, run);
    prev = cur;
  }
  return { current, best: Math.max(best, current) };
}

export function overallDailyStreak(habits: Habit[], completions: Completion[]): number {
  if (habits.length === 0) return 0;
  let cursor = new Date();
  let streak = 0;
  // Day counts as part of streak if at least one habit completed
  for (let i = 0; i < 365; i++) {
    const d = format(cursor, "yyyy-MM-dd");
    const any = completions.some((c) => c.completed_on === d);
    if (any) {
      streak++;
      cursor = subDays(cursor, 1);
    } else {
      // forgive today if no completions yet but yesterday has one
      if (i === 0) {
        cursor = subDays(cursor, 1);
        continue;
      }
      break;
    }
  }
  return streak;
}

export function weekDays(): { date: string; label: string; isToday: boolean }[] {
  const start = startOfWeek(new Date(), { weekStartsOn: 1 });
  return Array.from({ length: 7 }).map((_, i) => {
    const d = addDays(start, i);
    return { date: format(d, "yyyy-MM-dd"), label: format(d, "EEEEE"), isToday: isToday(d) };
  });
}

export function weekProgress(habits: Habit[], completions: Completion[]): number {
  if (habits.length === 0) return 0;
  const days = weekDays();
  const possible = habits.length * days.length;
  const done = completions.filter((c) => days.some((d) => d.date === c.completed_on)).length;
  return Math.round((done / possible) * 100);
}

export function monthHeatmap(): { date: string; day: number }[] {
  const today = new Date();
  const days = 35;
  return Array.from({ length: days }).map((_, i) => {
    const d = subDays(today, days - 1 - i);
    return { date: format(d, "yyyy-MM-dd"), day: d.getDay() };
  });
}
