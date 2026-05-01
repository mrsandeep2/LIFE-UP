import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useHabits, useCompletions, useToggleCompletion, useAddHabit, useDeleteHabit } from "@/lib/data";
import { useHabitFreezes, useUseFreezeToken } from "@/lib/data-phase3";
import { freezeTokensRemaining, streakWithFreezes } from "@/lib/intelligence";
import { monthHeatmap, today } from "@/lib/streaks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription,
} from "@/components/ui/dialog";
import { Plus, Flame, Trash2, Trophy, Sparkles, Sunrise, Dumbbell, BookOpen, Brain, Droplets, Moon, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/habits")({
  component: HabitsPage,
});

const ICONS: Record<string, any> = {
  sparkles: Sparkles, sunrise: Sunrise, dumbbell: Dumbbell, book: BookOpen,
  brain: Brain, droplets: Droplets, moon: Moon, flame: Flame,
};
const ICON_LIST = Object.keys(ICONS);

function HabitsPage() {
  const { data: habits = [], isLoading } = useHabits();
  const { data: completions = [] } = useCompletions();
  const { data: freezes = [] } = useHabitFreezes();
  const toggle = useToggleCompletion();
  const useFreeze = useUseFreezeToken();
  const add = useAddHabit();
  const del = useDeleteHabit();
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [icon, setIcon] = React.useState("sparkles");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      await add.mutateAsync({ name: name.trim(), icon });
      toast.success("Habit added");
      setName(""); setIcon("sparkles"); setOpen(false);
    } catch {
      toast.error("Couldn't add habit");
    }
  };

  return (
    <div className="px-4 lg:px-8 py-6 lg:py-8 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl lg:text-4xl font-bold">Habits</h1>
          <p className="text-muted-foreground mt-2 text-sm">Don't break the chain. Be kind when you do.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gradient-primary text-white shadow-glow">
              <Plus className="h-4 w-4" /> New habit
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create a habit</DialogTitle>
              <DialogDescription>Keep it small. Daily wins compound.</DialogDescription>
            </DialogHeader>
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="hname">Name</Label>
                <Input id="hname" value={name} onChange={(e) => setName(e.target.value)} placeholder="Read 30 minutes" />
              </div>
              <div className="space-y-2">
                <Label>Icon</Label>
                <div className="grid grid-cols-8 gap-2">
                  {ICON_LIST.map((k) => {
                    const I = ICONS[k];
                    return (
                      <button
                        key={k}
                        type="button"
                        onClick={() => setIcon(k)}
                        className={cn(
                          "grid place-items-center h-10 rounded-xl border-2 transition-all",
                          icon === k ? "border-primary bg-accent shadow-glow" : "border-border hover:border-primary/40",
                        )}
                      >
                        <I className="h-4 w-4" />
                      </button>
                    );
                  })}
                </div>
              </div>
              <Button type="submit" className="w-full gradient-primary text-white shadow-glow">Add habit</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => <div key={i} className="h-32 rounded-3xl bg-muted animate-pulse" />)}
        </div>
      ) : habits.length === 0 ? (
        <div className="rounded-3xl border-2 border-dashed border-border bg-card/40 p-12 text-center">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl gradient-primary shadow-glow mb-4">
            <Flame className="h-7 w-7 text-white" />
          </div>
          <h3 className="font-display text-xl font-bold">Your first habit awaits</h3>
          <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto">
            Pick one tiny daily action. Tomorrow-you will thank today-you.
          </p>
          <Button onClick={() => setOpen(true)} className="mt-6 gradient-primary text-white shadow-glow">
            <Plus className="h-4 w-4" /> Add habit
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {habits.map((h) => (
            <HabitCard
              key={h.id}
              habit={h}
              completions={completions}
              freezes={freezes}
              onToggleDay={(date: string, done: boolean) => toggle.mutate({ habitId: h.id, date, completed: done })}
              onUseFreeze={async (date: string) => {
                try {
                  await useFreeze.mutateAsync({ habitId: h.id, date });
                  toast.success("Streak protected with a freeze 🛡");
                } catch {
                  toast.error("Couldn't use freeze");
                }
              }}
              onDelete={() => {
                if (confirm(`Delete "${h.name}"? Your streak data for this habit will be removed.`)) {
                  del.mutate(h.id);
                }
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function HabitCard({ habit, completions, freezes, onToggleDay, onUseFreeze, onDelete }: any) {
  const Icon = ICONS[habit.icon] || Sparkles;
  const { current, freezesUsed } = streakWithFreezes(habit.id, completions, freezes);
  const tokens = freezeTokensRemaining(habit.id, freezes);
  const heatmap = monthHeatmap();
  const todayDate = today();
  const doneToday = completions.some((c: any) => c.habit_id === habit.id && c.completed_on === todayDate);
  const frozenToday = freezes.some((f: any) => f.habit_id === habit.id && f.used_on === todayDate);

  return (
    <div className="rounded-3xl border border-border bg-card p-5 lg:p-6 shadow-card">
      <div className="flex items-start justify-between gap-4 mb-5">
        <div className="flex items-center gap-3 min-w-0">
          <div className={cn(
            "grid place-items-center h-12 w-12 rounded-2xl shrink-0 transition-all",
            doneToday ? "gradient-primary shadow-glow" : "bg-muted",
          )}>
            <Icon className={cn("h-5 w-5", doneToday ? "text-white" : "text-muted-foreground")} />
          </div>
          <div className="min-w-0">
            <h3 className="font-display text-lg font-bold truncate">{habit.name}</h3>
            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
              <span className="inline-flex items-center gap-1"><Flame className="h-3 w-3 text-flame" /> {current} day{current === 1 ? "" : "s"}</span>
              {freezesUsed > 0 && (
                <span className="inline-flex items-center gap-1 text-primary"><Shield className="h-3 w-3" /> {freezesUsed} saved</span>
              )}
              <span className="inline-flex items-center gap-1">
                <Shield className="h-3 w-3 text-primary/60" /> {tokens} freeze{tokens === 1 ? "" : "s"} left
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!doneToday && !frozenToday && tokens > 0 && current > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onUseFreeze(todayDate)}
              className="border-primary/40 text-primary hover:bg-primary/10"
              title="Protect your streak today"
            >
              <Shield className="h-4 w-4" /> Freeze
            </Button>
          )}
          <Button
            size="sm"
            variant={doneToday ? "outline" : "default"}
            onClick={() => onToggleDay(todayDate, doneToday)}
            className={cn(!doneToday && "gradient-primary text-white shadow-glow")}
          >
            {doneToday ? "Done today ✓" : frozenToday ? "🛡 Protected" : "Mark today"}
          </Button>
          <Button size="icon" variant="ghost" onClick={onDelete} className="text-muted-foreground hover:text-destructive">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
      {/* heatmap */}
      <div>
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2 flex items-center justify-between">
          <span>Last 35 days</span>
          <span className="inline-flex items-center gap-1 normal-case tracking-normal">
            <span className="h-2 w-2 rounded-sm gradient-primary" /> done
            <span className="h-2 w-2 rounded-sm bg-primary/30 ml-2" /> frozen
          </span>
        </div>
        <div className="grid grid-cols-[repeat(35,minmax(0,1fr))] gap-1">
          {heatmap.map((d) => {
            const done = completions.some((c: any) => c.habit_id === habit.id && c.completed_on === d.date);
            const frozen = freezes.some((f: any) => f.habit_id === habit.id && f.used_on === d.date);
            const isTodayDot = d.date === todayDate;
            return (
              <button
                key={d.date}
                onClick={() => onToggleDay(d.date, done)}
                title={`${format(parseISO(d.date), "MMM d")} ${done ? "✓" : frozen ? "🛡" : ""}`}
                className={cn(
                  "aspect-square rounded-[3px] transition-all",
                  done
                    ? "gradient-primary shadow-glow"
                    : frozen
                      ? "bg-primary/30"
                      : "bg-muted hover:bg-muted/60",
                  isTodayDot && !done && !frozen && "ring-1 ring-primary/40",
                )}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
