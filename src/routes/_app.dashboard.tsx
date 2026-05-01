import * as React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { useProfile, profileDisplayName } from "@/lib/profile";
import { useHabits, useCompletions, useTasks, useToggleCompletion, useToggleTask } from "@/lib/data";
import { useApplications, useSubjects, APP_STATUS_LABELS } from "@/lib/data-phase2";
import { useFocusSessions, useHabitFreezes } from "@/lib/data-phase3";
import { topThreeTasks, detectInsights, focusStatsToday, type Insight } from "@/lib/intelligence";
import {
  overallDailyStreak,
  weekProgress,
  weekDays,
  streakForHabit,
  today,
} from "@/lib/streaks";
import { Flame, TrendingUp, Sparkles, Trophy, ArrowRight, Plus, Check, Briefcase, Calendar, Target, Lightbulb, X, Timer, CalendarCheck } from "lucide-react";
import { format, parseISO, differenceInDays } from "date-fns";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { QuickAddTask } from "@/components/quick-add-task";
import { DailyQuoteStrip } from "@/components/daily-quote-strip";
import { motion, AnimatePresence } from "framer-motion";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export const Route = createFileRoute("/_app/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const { data: habits = [] } = useHabits();
  const { data: completions = [] } = useCompletions();
  const { data: tasks = [] } = useTasks();
  const { data: apps = [] } = useApplications();
  const { data: subjects = [] } = useSubjects();
  const { data: focusSessions = [] } = useFocusSessions();
  const { data: freezes = [] } = useHabitFreezes();
  const [openAdd, setOpenAdd] = React.useState(false);
  const [dismissedInsight, setDismissedInsight] = React.useState<string | null>(null);

  const name = profileDisplayName(profile, user);
  const dailyStreak = overallDailyStreak(habits, completions);
  const weekPct = weekProgress(habits, completions);

  const top3 = topThreeTasks(tasks);
  const insights = detectInsights(tasks, habits, completions, focusSessions);
  const visibleInsight = insights.find((i) => i.id !== dismissedInsight);
  const focusToday = focusStatsToday(focusSessions);
  const isSunday = new Date().getDay() === 0;

  return (
    <div className="px-4 lg:px-8 py-6 lg:py-8 space-y-6 max-w-7xl mx-auto">
      {/* Daily Hindi date + quote */}
      <DailyQuoteStrip />

      {/* Greeting */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl lg:text-4xl font-bold">
            {greetingText()}, {name} 👋
          </h1>
          <p className="text-muted-foreground mt-2 text-sm lg:text-base max-w-xl">
            {dailyStreak > 0
              ? `${dailyStreak}-day streak. Keep it alive — finish your top 3 today.`
              : "A fresh page. Pick one thing and finish it."}
          </p>
        </div>
        <Button onClick={() => setOpenAdd(true)} className="gradient-primary text-white shadow-glow shrink-0 hidden sm:inline-flex">
          <Plus className="h-4 w-4" /> Quick Add
        </Button>
      </div>

      {/* Sunday weekly review banner */}
      {isSunday && (
        <Link
          to="/review"
          className="block rounded-2xl border border-primary/30 gradient-card p-4 lg:p-5 hover:shadow-glow transition-shadow"
        >
          <div className="flex items-center gap-3">
            <div className="grid place-items-center h-10 w-10 rounded-xl gradient-primary shrink-0">
              <CalendarCheck className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm">Your week in 60 seconds</div>
              <div className="text-xs text-muted-foreground">Reflect on what worked, plan what's next.</div>
            </div>
            <ArrowRight className="h-4 w-4 text-primary shrink-0" />
          </div>
        </Link>
      )}

      {/* Hero stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <StatCard icon={<Flame className="h-5 w-5" />} label="Daily Streak" value={dailyStreak} unit="days" accent="flame" />
        <StatCard icon={<TrendingUp className="h-5 w-5" />} label="Weekly Progress" value={weekPct} unit="%" progress={weekPct} accent="primary" />
        <StatCard icon={<Timer className="h-5 w-5" />} label="Focus Today" value={focusToday.minutes} unit="min" accent="primary" />
        <StatCard icon={<Trophy className="h-5 w-5" />} label="Sessions" value={focusToday.count} unit="today" accent="clover" />
      </div>

      {/* Top 3 Focus */}
      <TopThreeFocus tasks={top3} totalIncomplete={tasks.filter((t) => !t.completed).length} onAdd={() => setOpenAdd(true)} />

      {/* Insight of the day */}
      <AnimatePresence>
        {visibleInsight && (
          <InsightCard insight={visibleInsight} onDismiss={() => setDismissedInsight(visibleInsight.id)} />
        )}
      </AnimatePresence>

      {/* Habit Streaks */}
      <div className="rounded-3xl border border-border bg-card p-5 lg:p-6 shadow-card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-display text-xl font-bold">Today's habits</h2>
            <p className="text-xs text-muted-foreground mt-1">Tap a day to log it</p>
          </div>
          <Link to="/habits" className="text-xs text-primary font-semibold inline-flex items-center gap-1 hover:underline">
            View all <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        {habits.length === 0 ? (
          <EmptyMini title="No habits yet" hint="Start with one. Just one." cta="Add habit" href="/habits" />
        ) : (
          <ul className="space-y-3">
            {habits.slice(0, 5).map((h) => (
              <HabitMini key={h.id} habit={h} completions={completions} />
            ))}
          </ul>
        )}
      </div>

      {/* Upcoming exams */}
      <UpcomingExamsStrip subjects={subjects} />

      {/* Active applications */}
      <ActiveApplicationsStrip apps={apps} />

      {/* Mobile + Tablet FABs: Focus + Add */}
      <Link
        to="/focus"
        className="lg:hidden fixed bottom-20 right-4 z-30 grid place-items-center h-14 w-14 rounded-full gradient-primary shadow-glow text-white"
        aria-label="Start focus session"
      >
        <Target className="h-6 w-6" />
      </Link>
      <button
        onClick={() => setOpenAdd(true)}
        className="lg:hidden fixed bottom-20 left-4 z-30 grid place-items-center h-12 w-12 rounded-full bg-card border border-border shadow-card text-foreground"
        aria-label="Quick add"
      >
        <Plus className="h-5 w-5" />
      </button>

      {/* Desktop floating Focus button */}
      <Link
        to="/focus"
        className="hidden lg:flex fixed bottom-6 right-6 z-30 items-center gap-2 rounded-full gradient-primary shadow-glow text-white px-5 py-3 hover:scale-105 transition-transform"
        aria-label="Start focus session"
      >
        <Target className="h-4 w-4" /> Focus
      </Link>

      <QuickAddTask open={openAdd} onOpenChange={setOpenAdd} />
    </div>
  );
}

function TopThreeFocus({
  tasks,
  totalIncomplete,
  onAdd,
}: {
  tasks: ReturnType<typeof topThreeTasks>;
  totalIncomplete: number;
  onAdd: () => void;
}) {
  const toggle = useToggleTask();

  if (totalIncomplete === 0) {
    return (
      <div className="rounded-3xl border-2 border-dashed border-border bg-card/40 p-6 lg:p-8 text-center">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl gradient-primary shadow-glow mb-3">
          <Check className="h-5 w-5 text-white" />
        </div>
        <h2 className="font-display text-xl font-bold">Inbox zero.</h2>
        <p className="text-sm text-muted-foreground mt-2">Plan tomorrow or rest. Both count.</p>
        <Button onClick={onAdd} variant="outline" size="sm" className="mt-4">
          <Plus className="h-3 w-3" /> Plan tomorrow
        </Button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-display text-xl font-bold flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" /> Today's Top {tasks.length}
        </h2>
        <Link to="/tasks" className="text-xs text-primary font-semibold inline-flex items-center gap-1 hover:underline">
          All tasks <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
      <p className="text-xs text-muted-foreground mb-4">
        Auto-picked from {totalIncomplete} open tasks. Finish these first.
      </p>
      <TooltipProvider>
        <div className="grid gap-3 sm:grid-cols-3">
          {tasks.map((t, i) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="relative rounded-3xl border border-border bg-card p-5 shadow-card overflow-hidden"
            >
              <div className="absolute top-0 right-0 font-display text-7xl font-black text-primary/5 leading-none p-2 pointer-events-none select-none">
                {i + 1}
              </div>
              <div className="relative flex items-start gap-3">
                <button
                  onClick={() => toggle.mutate({ id: t.id, completed: false })}
                  className="grid h-6 w-6 shrink-0 place-items-center rounded-md border-2 border-muted-foreground/40 hover:border-primary transition-all mt-0.5"
                  aria-label="Complete"
                >
                  <Check className="h-3 w-3 opacity-0 hover:opacity-100" />
                </button>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm leading-snug">{t.title}</div>
                  <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                    <span
                      className={cn(
                        "text-[10px] font-semibold uppercase rounded-full px-2 py-0.5",
                        t.priority === "high"
                          ? "bg-destructive/15 text-destructive"
                          : t.priority === "medium"
                            ? "bg-warning/15 text-warning"
                            : "bg-muted text-muted-foreground",
                      )}
                    >
                      {t.priority}
                    </span>
                    {t.due_date && (
                      <span className="text-[10px] text-muted-foreground">
                        {format(parseISO(t.due_date), "MMM d")}
                      </span>
                    )}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button className="text-[10px] text-primary hover:underline ml-auto">Why?</button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="max-w-xs">
                        <p className="text-xs">
                          <span className="font-semibold">Score {t.score}</span> · {t.reason}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </TooltipProvider>
      {tasks.length < 3 && (
        <button
          onClick={onAdd}
          className="mt-3 w-full rounded-2xl border-2 border-dashed border-border bg-background/40 p-4 text-sm text-muted-foreground hover:border-primary/40 transition-colors inline-flex items-center justify-center gap-2"
        >
          <Plus className="h-4 w-4" /> Add another task
        </button>
      )}
    </div>
  );
}

function InsightCard({ insight, onDismiss }: { insight: Insight; onDismiss: () => void }) {
  const accent =
    insight.kind === "ghost"
      ? "from-primary/20 to-primary/5"
      : insight.kind === "momentum"
        ? "from-clover/20 to-clover/5"
        : "from-warning/20 to-warning/5";
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className={cn("relative rounded-3xl border border-border bg-gradient-to-br p-5 shadow-card", accent)}
    >
      <button
        onClick={onDismiss}
        className="absolute top-3 right-3 grid h-7 w-7 place-items-center rounded-full hover:bg-background/40 text-muted-foreground"
        aria-label="Dismiss"
      >
        <X className="h-3.5 w-3.5" />
      </button>
      <div className="flex items-start gap-3 pr-8">
        <div className="grid place-items-center h-10 w-10 rounded-xl bg-background/60 shrink-0">
          <Lightbulb className="h-5 w-5 text-primary" />
        </div>
        <div>
          <div className="font-display text-base font-bold">{insight.title}</div>
          <p className="text-sm text-muted-foreground mt-1">{insight.body}</p>
          {insight.fix && (
            <p className="text-xs text-foreground/70 mt-2 italic">→ {insight.fix}</p>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function StatCard({
  icon, label, value, unit, progress, accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  unit: string;
  progress?: number;
  accent: "flame" | "primary" | "clover";
}) {
  const accentClass = accent === "flame" ? "text-flame" : accent === "clover" ? "text-clover" : "text-primary";
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-3xl border border-border bg-card p-4 lg:p-5 shadow-card"
    >
      <div className={cn("flex items-center gap-2 text-xs font-semibold", accentClass)}>
        {icon}
        <span className="text-muted-foreground uppercase tracking-wider text-[10px]">{label}</span>
      </div>
      <div className="mt-3 flex items-baseline gap-1.5">
        <span className="font-display text-3xl lg:text-4xl font-bold tracking-tight">{value}</span>
        <span className="text-xs text-muted-foreground">{unit}</span>
      </div>
      {progress !== undefined && (
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div className="h-full gradient-primary transition-all" style={{ width: `${Math.min(progress, 100)}%` }} />
        </div>
      )}
    </motion.div>
  );
}

function HabitMini({ habit, completions }: { habit: any; completions: any[] }) {
  const days = weekDays();
  const toggle = useToggleCompletion();
  const { current } = streakForHabit(habit.id, completions);
  return (
    <li className="flex items-center justify-between gap-3">
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold truncate">{habit.name}</div>
        <div className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
          <Flame className="h-3 w-3 text-flame" /> {current} day{current === 1 ? "" : "s"}
        </div>
      </div>
      <div className="flex gap-1">
        {days.map((d) => {
          const done = completions.some((c) => c.habit_id === habit.id && c.completed_on === d.date);
          return (
            <button
              key={d.date}
              onClick={() => toggle.mutate({ habitId: habit.id, date: d.date, completed: done })}
              className={cn(
                "h-7 w-7 rounded-lg text-[10px] font-bold grid place-items-center transition-all",
                done
                  ? "gradient-primary text-white shadow-glow"
                  : d.isToday
                    ? "border-2 border-primary/40 text-muted-foreground"
                    : "bg-muted text-muted-foreground/60 hover:bg-muted/80",
              )}
              aria-label={`${habit.name} ${d.label}`}
            >
              {d.label}
            </button>
          );
        })}
      </div>
    </li>
  );
}

function EmptyMini({ title, hint, cta, href, onClick }: { title: string; hint: string; cta: string; href?: string; onClick?: () => void }) {
  const inner = (
    <Button size="sm" variant="outline" onClick={onClick}>
      <Plus className="h-3 w-3" /> {cta}
    </Button>
  );
  return (
    <div className="rounded-2xl border-2 border-dashed border-border bg-background/40 p-6 text-center space-y-3">
      <div className="font-semibold text-sm">{title}</div>
      <div className="text-xs text-muted-foreground">{hint}</div>
      {href ? <Link to={href}>{inner}</Link> : inner}
    </div>
  );
}

function greetingText() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function UpcomingExamsStrip({ subjects }: { subjects: any[] }) {
  const upcoming = subjects
    .filter((s) => s.exam_date && differenceInDays(parseISO(s.exam_date), new Date()) >= 0)
    .sort((a, b) => a.exam_date.localeCompare(b.exam_date))
    .slice(0, 4);
  if (upcoming.length === 0) return null;
  return (
    <div className="rounded-3xl border border-border bg-card p-5 lg:p-6 shadow-card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-lg font-bold flex items-center gap-2">
          <Calendar className="h-5 w-5 text-warning" /> Upcoming exams
        </h2>
        <Link to="/study" className="text-xs text-primary font-semibold inline-flex items-center gap-1 hover:underline">
          Study planner <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {upcoming.map((s) => {
          const days = differenceInDays(parseISO(s.exam_date), new Date());
          return (
            <div key={s.id} className="rounded-2xl border border-border bg-background/60 p-3">
              <div className="text-sm font-semibold truncate">{s.name}</div>
              <div className="text-xs text-muted-foreground mt-1">{format(parseISO(s.exam_date), "MMM d")}</div>
              <div className={cn("text-xs font-bold mt-2", days <= 7 ? "text-flame" : "text-muted-foreground")}>
                {days === 0 ? "Today" : `${days} day${days === 1 ? "" : "s"} left`}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ActiveApplicationsStrip({ apps }: { apps: any[] }) {
  const active = apps.filter((a) => a.status !== "rejected" && a.status !== "offer").slice(0, 5);
  if (active.length === 0) return null;
  return (
    <div className="rounded-3xl border border-border bg-card p-5 lg:p-6 shadow-card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-lg font-bold flex items-center gap-2">
          <Briefcase className="h-5 w-5 text-primary" /> Active applications
        </h2>
        <Link to="/career" className="text-xs text-primary font-semibold inline-flex items-center gap-1 hover:underline">
          Pipeline <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
      <ul className="space-y-2">
        {active.map((a) => (
          <li key={a.id} className="flex items-center gap-3 rounded-xl border border-border/60 bg-background/40 px-3 py-2.5">
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold truncate">{a.company}</div>
              <div className="text-xs text-muted-foreground truncate">{a.role}</div>
            </div>
            <span className="text-[10px] font-semibold uppercase rounded-full px-2 py-0.5 bg-muted text-muted-foreground">
              {APP_STATUS_LABELS[a.status as keyof typeof APP_STATUS_LABELS]}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
