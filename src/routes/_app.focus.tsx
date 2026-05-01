import * as React from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useTasks, useToggleTask } from "@/lib/data";
import { useLogFocusSession } from "@/lib/data-phase3";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Play, Pause, X, Check, Timer, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/focus")({
  component: FocusPage,
});

const DURATIONS = [25, 50, 90];

function FocusPage() {
  const navigate = useNavigate();
  const { data: tasks = [] } = useTasks();
  const log = useLogFocusSession();
  const toggleTask = useToggleTask();

  const incompleteTasks = tasks.filter((t) => !t.completed).slice(0, 10);

  const [phase, setPhase] = React.useState<"setup" | "running" | "done">("setup");
  const [taskId, setTaskId] = React.useState<string | null>(null);
  const [topic, setTopic] = React.useState("");
  const [duration, setDuration] = React.useState(25);

  const [secondsLeft, setSecondsLeft] = React.useState(0);
  const [paused, setPaused] = React.useState(false);
  const startedAtRef = React.useRef<Date | null>(null);
  const elapsedRef = React.useRef(0); // seconds elapsed when paused/ended

  const selectedTask = tasks.find((t) => t.id === taskId);
  const sessionLabel = selectedTask?.title || topic.trim() || "Deep work";

  const start = () => {
    if (!selectedTask && !topic.trim()) {
      toast.error("Pick a task or enter a topic first");
      return;
    }
    startedAtRef.current = new Date();
    elapsedRef.current = 0;
    setSecondsLeft(duration * 60);
    setPaused(false);
    setPhase("running");
  };

  // Timer tick
  React.useEffect(() => {
    if (phase !== "running" || paused) return;
    const id = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(id);
          finish(true);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [phase, paused]);

  const finish = async (natural: boolean) => {
    if (!startedAtRef.current) return;
    const ended = new Date();
    const totalElapsed = Math.round((ended.getTime() - startedAtRef.current.getTime()) / 1000);
    const actualMinutes = Math.max(1, Math.round(totalElapsed / 60));
    setPhase("done");
    try {
      await log.mutateAsync({
        task_id: taskId,
        topic: taskId ? null : topic.trim() || null,
        planned_minutes: duration,
        actual_minutes: actualMinutes,
        started_at: startedAtRef.current.toISOString(),
        ended_at: ended.toISOString(),
        completed_naturally: natural,
      });
      toast.success(natural ? `🎯 ${actualMinutes}m focused` : `Logged ${actualMinutes}m`);
    } catch {
      toast.error("Couldn't save session");
    }
  };

  const cancelSession = async () => {
    if (confirm("End session early? Your time will still be logged.")) {
      await finish(false);
    }
  };

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const progress = duration * 60 > 0 ? 1 - secondsLeft / (duration * 60) : 0;

  // Running phase: full-screen distraction-free
  if (phase === "running") {
    return (
      <div className="fixed inset-0 z-50 grid place-items-center overflow-hidden bg-background">
        {/* Ambient gradient */}
        <motion.div
          aria-hidden
          className="absolute inset-0 opacity-40"
          style={{
            background:
              "radial-gradient(ellipse at 30% 20%, oklch(0.65 0.2 280 / 0.4), transparent 60%), radial-gradient(ellipse at 70% 80%, oklch(0.7 0.18 320 / 0.35), transparent 60%)",
          }}
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />

        <div className="relative z-10 flex flex-col items-center gap-8 px-6 text-center max-w-2xl">
          <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground font-semibold">
            Deep Work · {duration} min
          </div>
          <h1 className="font-display text-2xl lg:text-3xl font-bold leading-tight">{sessionLabel}</h1>

          {/* Big timer */}
          <div className="relative">
            <svg className="h-72 w-72 lg:h-96 lg:w-96 -rotate-90" viewBox="0 0 200 200">
              <circle cx="100" cy="100" r="92" fill="none" stroke="currentColor" strokeWidth="4" className="text-muted/30" />
              <circle
                cx="100"
                cy="100"
                r="92"
                fill="none"
                stroke="url(#focusGrad)"
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 92}`}
                strokeDashoffset={`${2 * Math.PI * 92 * (1 - progress)}`}
                style={{ transition: "stroke-dashoffset 1s linear" }}
              />
              <defs>
                <linearGradient id="focusGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="oklch(0.65 0.2 280)" />
                  <stop offset="100%" stopColor="oklch(0.7 0.18 320)" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="font-display text-6xl lg:text-7xl font-bold tabular-nums">
                {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              size="lg"
              variant="outline"
              onClick={() => setPaused((p) => !p)}
              className="rounded-full px-8"
            >
              {paused ? <><Play className="h-4 w-4" /> Resume</> : <><Pause className="h-4 w-4" /> Pause</>}
            </Button>
            <Button
              size="lg"
              variant="ghost"
              onClick={cancelSession}
              className="rounded-full px-6 text-muted-foreground"
            >
              <X className="h-4 w-4" /> End
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Done phase
  if (phase === "done") {
    const elapsed = startedAtRef.current
      ? Math.round((Date.now() - startedAtRef.current.getTime()) / 60000)
      : duration;
    return (
      <div className="px-4 lg:px-8 py-12 max-w-md mx-auto text-center space-y-6">
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="mx-auto grid h-20 w-20 place-items-center rounded-full gradient-primary shadow-glow"
        >
          <Check className="h-10 w-10 text-white" />
        </motion.div>
        <h1 className="font-display text-3xl font-bold">Session complete</h1>
        <p className="text-muted-foreground">
          {elapsed} minutes of deep focus on{" "}
          <span className="text-foreground font-semibold">{sessionLabel}</span>.
        </p>
        {selectedTask && !selectedTask.completed && (
          <Button
            variant="outline"
            onClick={() => {
              toggleTask.mutate({ id: selectedTask.id, completed: false });
              toast.success("Task marked done");
            }}
          >
            <Check className="h-4 w-4" /> Mark task complete
          </Button>
        )}
        <div className="flex flex-col gap-2 pt-4">
          <Button
            className="gradient-primary text-white shadow-glow"
            onClick={() => {
              setPhase("setup");
              setTaskId(null);
              setTopic("");
            }}
          >
            <Timer className="h-4 w-4" /> Another session
          </Button>
          <Button variant="ghost" onClick={() => navigate({ to: "/dashboard" })}>
            Back to dashboard
          </Button>
        </div>
      </div>
    );
  }

  // Setup phase
  return (
    <div className="px-4 lg:px-8 py-6 lg:py-10 max-w-2xl mx-auto space-y-8">
      <div>
        <div className="inline-flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2">
          <Sparkles className="h-3 w-3" /> Deep Work Mode
        </div>
        <h1 className="font-display text-3xl lg:text-4xl font-bold">Focus on one thing.</h1>
        <p className="text-muted-foreground mt-2">Pick what matters. Set a timer. Let the world wait.</p>
      </div>

      {/* Pick task */}
      <div className="space-y-3">
        <Label className="text-sm font-semibold">What are you focusing on?</Label>
        {incompleteTasks.length > 0 && (
          <div className="space-y-2">
            {incompleteTasks.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setTaskId(t.id);
                  setTopic("");
                }}
                className={cn(
                  "w-full text-left rounded-xl border-2 px-4 py-3 transition-all",
                  taskId === t.id
                    ? "border-primary bg-accent shadow-glow"
                    : "border-border hover:border-primary/40",
                )}
              >
                <div className="text-sm font-semibold truncate">{t.title}</div>
                <div className="text-xs text-muted-foreground capitalize mt-0.5">
                  {t.priority} priority{t.due_date ? ` · due ${t.due_date}` : ""}
                </div>
              </button>
            ))}
          </div>
        )}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <div className="h-px flex-1 bg-border" />
          <span>or</span>
          <div className="h-px flex-1 bg-border" />
        </div>
        <Input
          placeholder="Type a topic (e.g. 'Linear algebra chapter 4')"
          value={topic}
          onChange={(e) => {
            setTopic(e.target.value);
            if (e.target.value) setTaskId(null);
          }}
        />
      </div>

      {/* Duration */}
      <div className="space-y-3">
        <Label className="text-sm font-semibold">How long?</Label>
        <div className="grid grid-cols-3 gap-3">
          {DURATIONS.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDuration(d)}
              className={cn(
                "rounded-2xl border-2 p-4 transition-all",
                duration === d
                  ? "border-primary bg-accent shadow-glow"
                  : "border-border hover:border-primary/40",
              )}
            >
              <div className="font-display text-2xl font-bold">{d}</div>
              <div className="text-xs text-muted-foreground mt-1">minutes</div>
            </button>
          ))}
        </div>
      </div>

      <Button
        size="lg"
        onClick={start}
        className="w-full gradient-primary text-white shadow-glow rounded-xl h-14 text-base"
      >
        <Play className="h-5 w-5" /> Start deep work
      </Button>
    </div>
  );
}
