import * as React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useTasks } from "@/lib/data";
import { useHabits, useCompletions } from "@/lib/data";
import { useStudySessions } from "@/lib/data-phase2";
import { useApplications } from "@/lib/data-phase2";
import { useWeeklyReview, useSaveWeeklyReview, useWeeklyReviewHistory, useHabitFreezes, weekOf } from "@/lib/data-phase3";
import { streakWithFreezes } from "@/lib/intelligence";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { format, parseISO, startOfWeek, endOfWeek, subWeeks, isWithinInterval } from "date-fns";
import { CalendarCheck, TrendingUp, TrendingDown, Minus, BookOpen, Briefcase, History } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/review")({
  component: ReviewPage,
});

function ReviewPage() {
  const wk = weekOf();
  const { data: tasks = [] } = useTasks();
  const { data: habits = [] } = useHabits();
  const { data: completions = [] } = useCompletions();
  const { data: sessions = [] } = useStudySessions();
  const { data: apps = [] } = useApplications();
  const { data: freezes = [] } = useHabitFreezes();
  const { data: review } = useWeeklyReview(wk);
  const { data: history = [] } = useWeeklyReviewHistory();
  const save = useSaveWeeklyReview();

  const [wentWell, setWentWell] = React.useState("");
  const [blockers, setBlockers] = React.useState("");
  const [change, setChange] = React.useState("");

  React.useEffect(() => {
    if (review) {
      setWentWell(review.went_well || "");
      setBlockers(review.blockers || "");
      setChange(review.change || "");
    }
  }, [review]);

  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const lastWeekStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
  const lastWeekEnd = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });

  const inThisWeek = (d: string) => isWithinInterval(parseISO(d), { start: weekStart, end: weekEnd });
  const inLastWeek = (d: string) => isWithinInterval(parseISO(d), { start: lastWeekStart, end: lastWeekEnd });

  // Tasks
  const tasksCreatedThis = tasks.filter((t) => inThisWeek(t.created_at)).length;
  const tasksDoneThis = tasks.filter((t) => t.completed_at && inThisWeek(t.completed_at)).length;
  const tasksDoneLast = tasks.filter((t) => t.completed_at && inLastWeek(t.completed_at)).length;
  const completionPct = tasksCreatedThis > 0 ? Math.round((tasksDoneThis / tasksCreatedThis) * 100) : 0;
  const taskDelta = tasksDoneThis - tasksDoneLast;

  // Habits
  const habitStats = habits.map((h) => {
    const thisWeekCount = completions.filter((c) => c.habit_id === h.id && inThisWeek(c.completed_on)).length;
    const { current } = streakWithFreezes(h.id, completions, freezes);
    const freezesThisWeek = freezes.filter((f) => f.habit_id === h.id && f.week_of === wk).length;
    return { name: h.name, doneDays: thisWeekCount, current, freezesUsed: freezesThisWeek };
  });

  // Study
  const studyMinutes = sessions
    .filter((s) => inThisWeek(s.studied_on))
    .reduce((sum, s) => sum + s.minutes, 0);
  const studyHours = (studyMinutes / 60).toFixed(1);

  // Career
  const appsThisWeek = apps.filter((a) => inThisWeek(a.created_at)).length;
  const interviewsThisWeek = apps.filter((a) => a.status === "interview" && inThisWeek(a.updated_at)).length;

  const handleSave = async () => {
    try {
      await save.mutateAsync({
        week_of: wk,
        went_well: wentWell,
        blockers,
        change,
      });
      toast.success("Reflection saved");
    } catch {
      toast.error("Couldn't save");
    }
  };

  return (
    <div className="px-4 lg:px-8 py-6 lg:py-8 max-w-3xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2">
            <CalendarCheck className="h-3 w-3" /> Weekly Review
          </div>
          <h1 className="font-display text-3xl lg:text-4xl font-bold">
            {format(weekStart, "MMM d")} – {format(weekEnd, "MMM d")}
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Your week in 60 seconds. Reflect, then move forward.
          </p>
        </div>
        {history.length > 1 && (
          <Link
            to="/review"
            className="text-xs text-primary font-semibold inline-flex items-center gap-1 hover:underline shrink-0"
          >
            <History className="h-3 w-3" /> Past reviews
          </Link>
        )}
      </div>

      {/* Tasks card */}
      <SummaryCard title="Tasks">
        <div className="grid grid-cols-3 gap-4">
          <Stat label="Completed" value={tasksDoneThis} />
          <Stat label="Created" value={tasksCreatedThis} />
          <Stat label="Done rate" value={`${completionPct}%`} />
        </div>
        <div className="mt-3 flex items-center gap-2 text-xs">
          <DeltaIcon delta={taskDelta} />
          <span className="text-muted-foreground">
            {taskDelta === 0
              ? "Same as last week"
              : `${Math.abs(taskDelta)} ${taskDelta > 0 ? "more" : "fewer"} than last week`}
          </span>
        </div>
      </SummaryCard>

      {/* Habits card */}
      <SummaryCard title="Habits">
        {habitStats.length === 0 ? (
          <p className="text-sm text-muted-foreground">No habits tracked yet.</p>
        ) : (
          <ul className="space-y-2">
            {habitStats.map((h) => (
              <li key={h.name} className="flex items-center justify-between gap-3 text-sm">
                <span className="font-medium truncate">{h.name}</span>
                <div className="flex items-center gap-3 text-xs text-muted-foreground shrink-0">
                  <span>{h.doneDays}/7 days</span>
                  <span>·</span>
                  <span className="text-flame font-semibold">{h.current}d streak</span>
                  {h.freezesUsed > 0 && <span>· 🛡 ×{h.freezesUsed}</span>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </SummaryCard>

      {/* Study + Career */}
      <div className="grid sm:grid-cols-2 gap-4">
        <SummaryCard title="Study" icon={<BookOpen className="h-4 w-4 text-primary" />}>
          <Stat label="Hours logged" value={studyHours} />
        </SummaryCard>
        <SummaryCard title="Career" icon={<Briefcase className="h-4 w-4 text-primary" />}>
          <div className="grid grid-cols-2 gap-3">
            <Stat label="Applied" value={appsThisWeek} />
            <Stat label="Interviews" value={interviewsThisWeek} />
          </div>
        </SummaryCard>
      </div>

      {/* Reflection */}
      <div className="rounded-3xl border border-border bg-card p-5 lg:p-6 shadow-card space-y-4">
        <h2 className="font-display text-xl font-bold">Reflect</h2>
        <ReflectionField
          label="What went well?"
          value={wentWell}
          onChange={setWentWell}
          placeholder="The wins, big or small."
        />
        <ReflectionField
          label="What got in the way?"
          value={blockers}
          onChange={setBlockers}
          placeholder="Be honest. Name the friction."
        />
        <ReflectionField
          label="One change for next week?"
          value={change}
          onChange={setChange}
          placeholder="One small thing. Specific."
        />
        <Button
          onClick={handleSave}
          disabled={save.isPending}
          className="w-full gradient-primary text-white shadow-glow"
        >
          {save.isPending ? "Saving..." : review ? "Update reflection" : "Save reflection"}
        </Button>
      </div>

      {/* History */}
      {history.length > 0 && (
        <div className="rounded-3xl border border-border bg-card p-5 lg:p-6 shadow-card">
          <h2 className="font-display text-lg font-bold mb-3">Past reviews</h2>
          <ul className="space-y-2">
            {history.slice(0, 8).map((r) => (
              <li key={r.id} className="text-sm border-b border-border/50 last:border-0 pb-2 last:pb-0">
                <div className="font-semibold">{format(parseISO(r.week_of), "MMM d, yyyy")}</div>
                {r.change && (
                  <div className="text-xs text-muted-foreground mt-1 line-clamp-1">
                    Plan: {r.change}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-border bg-card p-5 shadow-card">
      <h3 className="font-display text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
        {icon} {title}
      </h3>
      {children}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <div className="font-display text-2xl font-bold">{value}</div>
      <div className="text-[11px] text-muted-foreground uppercase tracking-wider">{label}</div>
    </div>
  );
}

function DeltaIcon({ delta }: { delta: number }) {
  if (delta > 0) return <TrendingUp className="h-3 w-3 text-clover" />;
  if (delta < 0) return <TrendingDown className="h-3 w-3 text-flame" />;
  return <Minus className="h-3 w-3 text-muted-foreground" />;
}

function ReflectionField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-semibold">{label}</Label>
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={3}
        className="resize-none"
      />
    </div>
  );
}
