import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useHabits, useCompletions, useTasks } from "@/lib/data";
import { useApplications, useStudySessions, useSubjects } from "@/lib/data-phase2";
import { BarChart3, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { format, subDays, startOfWeek, addDays, differenceInDays, parseISO, eachDayOfInterval, isSameDay } from "date-fns";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/analytics")({
  component: AnalyticsPage,
});

function AnalyticsPage() {
  const { data: habits = [] } = useHabits();
  const { data: completions = [] } = useCompletions();
  const { data: tasks = [] } = useTasks();
  const { data: apps = [] } = useApplications();
  const { data: sessions = [] } = useStudySessions();
  const { data: subjects = [] } = useSubjects();

  // First-day-of-data check
  const allDates = [
    ...completions.map((c) => c.completed_on),
    ...tasks.filter((t) => t.completed_at).map((t) => t.completed_at!.slice(0, 10)),
    ...sessions.map((s) => s.studied_on),
  ];
  const earliest = allDates.sort()[0];
  const daysOfData = earliest ? differenceInDays(new Date(), parseISO(earliest)) + 1 : 0;

  if (daysOfData < 7) {
    return (
      <div className="px-4 lg:px-8 py-6 lg:py-8 max-w-3xl mx-auto">
        <h1 className="font-display text-3xl lg:text-4xl font-bold flex items-center gap-2">
          <BarChart3 className="h-7 w-7 text-primary" /> Analytics
        </h1>
        <div className="mt-8 rounded-3xl border-2 border-dashed border-border bg-card/40 p-12 text-center space-y-3">
          <div className="inline-grid place-items-center h-14 w-14 rounded-2xl gradient-primary mx-auto">
            <BarChart3 className="h-7 w-7 text-white" />
          </div>
          <h3 className="font-display text-xl font-bold">Analytics unlocks after a week of tracking</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            You're {7 - daysOfData} day{7 - daysOfData === 1 ? "" : "s"} away. Charts without data are noise — keep going.
          </p>
          <div className="text-xs text-muted-foreground">
            {daysOfData} / 7 days logged
          </div>
        </div>
      </div>
    );
  }

  // ── Weekly productivity score ──
  const thisWeekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const lastWeekStart = subDays(thisWeekStart, 7);

  const scoreFor = (start: Date) => {
    const end = addDays(start, 6);
    const weekDates = eachDayOfInterval({ start, end }).map((d) => format(d, "yyyy-MM-dd"));
    // Habits: % of (habits × 7)
    const habitPossible = habits.length * 7;
    const habitDone = completions.filter((c) => weekDates.includes(c.completed_on)).length;
    const habitPct = habitPossible > 0 ? (habitDone / habitPossible) * 100 : 0;
    // Tasks: completed / created in week
    const created = tasks.filter((t) => {
      const d = t.created_at.slice(0, 10);
      return weekDates.includes(d);
    }).length;
    const done = tasks.filter((t) => t.completed_at && weekDates.includes(t.completed_at.slice(0, 10))).length;
    const taskPct = created > 0 ? Math.min((done / created) * 100, 100) : (done > 0 ? 100 : 0);
    // Study: hours vs 10h baseline target
    const studyMin = sessions.filter((s) => weekDates.includes(s.studied_on)).reduce((sum, s) => sum + s.minutes, 0);
    const studyPct = Math.min((studyMin / 60 / 10) * 100, 100);
    return Math.round(habitPct * 0.4 + taskPct * 0.4 + studyPct * 0.2);
  };

  const thisScore = scoreFor(thisWeekStart);
  const lastScore = scoreFor(lastWeekStart);
  const delta = thisScore - lastScore;

  // ── Habit consistency last 4 weeks per habit ──
  const habitWeeks = Array.from({ length: 4 }).map((_, i) => {
    const start = subDays(thisWeekStart, (3 - i) * 7);
    const end = addDays(start, 6);
    const dates = eachDayOfInterval({ start, end }).map((d) => format(d, "yyyy-MM-dd"));
    return { label: format(start, "MMM d"), dates };
  });

  // ── Task completion last 8 weeks ──
  const taskWeeks = Array.from({ length: 8 }).map((_, i) => {
    const start = subDays(thisWeekStart, (7 - i) * 7);
    const end = addDays(start, 6);
    const dates = eachDayOfInterval({ start, end }).map((d) => format(d, "yyyy-MM-dd"));
    const created = tasks.filter((t) => dates.includes(t.created_at.slice(0, 10))).length;
    const done = tasks.filter((t) => t.completed_at && dates.includes(t.completed_at.slice(0, 10))).length;
    const pct = created > 0 ? Math.round((done / created) * 100) : (done > 0 ? 100 : 0);
    return { label: format(start, "MMM d"), pct };
  });

  // ── Productivity by day-of-week (last 8 weeks) ──
  const dowBuckets = [0, 1, 2, 3, 4, 5, 6].map((dow) => {
    let total = 0;
    let count = 0;
    for (let i = 0; i < 56; i++) {
      const d = subDays(new Date(), i);
      if (d.getDay() !== dow) continue;
      const ds = format(d, "yyyy-MM-dd");
      const habitsDone = completions.filter((c) => c.completed_on === ds).length;
      const tasksDone = tasks.filter((t) => t.completed_at?.slice(0, 10) === ds).length;
      const studyMin = sessions.filter((s) => s.studied_on === ds).reduce((sum, s) => sum + s.minutes, 0);
      total += habitsDone + tasksDone + studyMin / 30;
      count++;
    }
    return { dow, label: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][dow], avg: count > 0 ? total / count : 0 };
  });
  const maxDow = Math.max(...dowBuckets.map((b) => b.avg), 0.01);

  // ── Study hours per subject last 4 weeks ──
  const studyBySubject = subjects.map((s) => {
    const total = sessions.filter((ss) => {
      if (ss.subject_id !== s.id) return false;
      const d = parseISO(ss.studied_on);
      return differenceInDays(new Date(), d) <= 28;
    }).reduce((sum, ss) => sum + ss.minutes, 0);
    return { name: s.name, hours: total / 60 };
  });

  // ── Application funnel ──
  const total = apps.length;
  const submitted = apps.filter((a) => a.status !== "wishlist").length;
  const interview = apps.filter((a) => ["interview", "offer"].includes(a.status)).length;
  const offer = apps.filter((a) => a.status === "offer").length;

  return (
    <div className="px-4 lg:px-8 py-6 lg:py-8 space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="font-display text-3xl lg:text-4xl font-bold flex items-center gap-2">
          <BarChart3 className="h-7 w-7 text-primary" /> Analytics
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">Decisions, not data dumps. Each chart answers a question.</p>
      </div>

      {/* Weekly score hero */}
      <div className="rounded-3xl border border-border gradient-card p-6 lg:p-8 shadow-card flex items-center gap-6">
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">How was this week?</div>
          <div className="flex items-baseline gap-3 mt-2">
            <div className="font-display text-6xl lg:text-7xl font-bold tabular-nums">{thisScore}</div>
            <div className="text-2xl text-muted-foreground">/ 100</div>
          </div>
          <div className={cn(
            "mt-2 inline-flex items-center gap-1 text-sm font-semibold",
            delta > 0 ? "text-clover" : delta < 0 ? "text-destructive" : "text-muted-foreground",
          )}>
            {delta > 0 ? <TrendingUp className="h-4 w-4" /> : delta < 0 ? <TrendingDown className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
            {delta > 0 ? "+" : ""}{delta} vs last week
          </div>
        </div>
        <div className="hidden md:block ml-auto text-right max-w-xs text-sm text-muted-foreground">
          Weighted blend: 40% habit consistency · 40% task completion · 20% study hours vs 10h target.
        </div>
      </div>

      {/* Habit consistency */}
      <Section title="Which habit is slipping?">
        {habits.length === 0 ? (
          <Empty msg="No habits to track yet." />
        ) : (
          <div className="space-y-3">
            {habits.map((h) => (
              <div key={h.id} className="flex items-center gap-3">
                <div className="w-32 text-sm font-medium truncate shrink-0">{h.name}</div>
                <div className="flex-1 grid grid-cols-4 gap-1">
                  {habitWeeks.map((w) => {
                    const done = completions.filter((c) => c.habit_id === h.id && w.dates.includes(c.completed_on)).length;
                    const pct = (done / 7) * 100;
                    return (
                      <div key={w.label} className="space-y-1">
                        <div className="h-6 rounded bg-muted overflow-hidden">
                          <div className="h-full gradient-primary transition-all" style={{ width: `${pct}%` }} />
                        </div>
                        <div className="text-[9px] text-center text-muted-foreground">{w.label}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Task completion trend */}
      <Section title="Are you finishing what you start?">
        <div className="flex items-end gap-2 h-32">
          {taskWeeks.map((w) => (
            <div key={w.label} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full bg-muted rounded-t-lg flex flex-col-reverse" style={{ height: "100%" }}>
                <div className="gradient-primary rounded-t-lg transition-all" style={{ height: `${w.pct}%` }} />
              </div>
              <div className="text-[10px] text-muted-foreground">{w.label}</div>
              <div className="text-[10px] font-bold tabular-nums">{w.pct}%</div>
            </div>
          ))}
        </div>
      </Section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Day-of-week heatmap */}
        <Section title="Which day are you strongest?">
          <div className="space-y-2">
            {dowBuckets.map((b) => (
              <div key={b.dow} className="flex items-center gap-3">
                <div className="w-10 text-xs font-semibold text-muted-foreground">{b.label}</div>
                <div className="flex-1 h-4 rounded-full bg-muted overflow-hidden">
                  <div className="h-full gradient-primary transition-all" style={{ width: `${(b.avg / maxDow) * 100}%` }} />
                </div>
                <div className="w-10 text-right text-xs font-bold tabular-nums">{b.avg.toFixed(1)}</div>
              </div>
            ))}
          </div>
        </Section>

        {/* Study by subject */}
        <Section title="Where did your hours go?">
          {studyBySubject.length === 0 ? (
            <Empty msg="No study sessions logged yet." />
          ) : (
            <div className="space-y-3">
              {studyBySubject.map((s) => {
                const max = Math.max(...studyBySubject.map((x) => x.hours), 0.01);
                return (
                  <div key={s.name} className="flex items-center gap-3">
                    <div className="w-28 text-sm font-medium truncate">{s.name}</div>
                    <div className="flex-1 h-5 rounded-full bg-muted overflow-hidden">
                      <div className="h-full gradient-primary" style={{ width: `${(s.hours / max) * 100}%` }} />
                    </div>
                    <div className="w-14 text-right text-xs font-bold tabular-nums">{s.hours.toFixed(1)}h</div>
                  </div>
                );
              })}
            </div>
          )}
        </Section>
      </div>

      {/* Application funnel */}
      <Section title="How's your job search converting?">
        {total === 0 ? (
          <Empty msg="No applications tracked yet." />
        ) : (
          <div className="grid grid-cols-4 gap-2">
            <FunnelStep label="Tracked" count={total} pct={100} />
            <FunnelStep label="Applied" count={submitted} pct={total > 0 ? Math.round((submitted / total) * 100) : 0} />
            <FunnelStep label="Interview" count={interview} pct={submitted > 0 ? Math.round((interview / submitted) * 100) : 0} />
            <FunnelStep label="Offer" count={offer} pct={interview > 0 ? Math.round((offer / interview) * 100) : 0} />
          </div>
        )}
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-border bg-card p-5 lg:p-6 shadow-card">
      <h2 className="font-display text-lg font-bold mb-4">{title}</h2>
      {children}
    </div>
  );
}

function Empty({ msg }: { msg: string }) {
  return <p className="text-sm text-muted-foreground italic py-4 text-center">{msg}</p>;
}

function FunnelStep({ label, count, pct }: { label: string; count: number; pct: number }) {
  return (
    <div className="rounded-2xl border border-border bg-background/60 p-4 text-center">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</div>
      <div className="font-display text-2xl font-bold mt-1 tabular-nums">{count}</div>
      <div className="text-xs text-muted-foreground mt-1">{pct}% conv.</div>
    </div>
  );
}
