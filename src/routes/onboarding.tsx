import * as React from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sparkles, Sunrise, Dumbbell, BookOpen, Brain, Droplets, Moon, Loader2, ArrowRight, Check } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/onboarding")({
  component: Onboarding,
});

const STARTER_HABITS = [
  { name: "Wake Up Early", icon: "sunrise", emoji: Sunrise },
  { name: "Workout", icon: "dumbbell", emoji: Dumbbell },
  { name: "Read 30 mins", icon: "book", emoji: BookOpen },
  { name: "Deep Focus 1h", icon: "brain", emoji: Brain },
  { name: "Drink Water", icon: "droplets", emoji: Droplets },
  { name: "Sleep by 11", icon: "moon", emoji: Moon },
];

function Onboarding() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = React.useState(0);
  const [name, setName] = React.useState("");
  const [picks, setPicks] = React.useState<string[]>(["Wake Up Early", "Workout", "Read 30 mins"]);
  const [task, setTask] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
    if (user) setName((user.user_metadata?.display_name as string) || "");
  }, [user, loading, navigate]);

  const togglePick = (n: string) =>
    setPicks((p) => (p.includes(n) ? p.filter((x) => x !== n) : [...p, n].slice(0, 5)));

  const finish = async () => {
    if (!user) return;
    setBusy(true);
    try {
      await supabase.from("profiles").update({ display_name: name, onboarded: true }).eq("id", user.id);
      if (picks.length) {
        const habits = picks.map((p) => {
          const h = STARTER_HABITS.find((x) => x.name === p);
          return { user_id: user.id, name: p, icon: h?.icon ?? "sparkles", color: "violet" };
        });
        await supabase.from("habits").insert(habits);
      }
      if (task.trim()) {
        await supabase.from("tasks").insert({
          user_id: user.id,
          title: task.trim(),
          priority: "medium",
          due_date: new Date().toISOString().slice(0, 10),
        });
      }
      toast.success("You're all set! 🎉");
      navigate({ to: "/dashboard" });
    } catch (e) {
      toast.error("Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  };

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-lg">
        {/* Progress */}
        <div className="flex items-center gap-2 mb-8">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={cn(
                "h-1.5 flex-1 rounded-full transition-all",
                i <= step ? "gradient-primary" : "bg-muted",
              )}
            />
          ))}
        </div>

        <div className="rounded-3xl border border-border bg-card p-8 shadow-card">
          {step === 0 && (
            <div className="space-y-6">
              <div className="grid place-items-center h-14 w-14 rounded-2xl gradient-primary shadow-glow">
                <Sparkles className="h-7 w-7 text-white" />
              </div>
              <div>
                <h1 className="font-display text-3xl font-bold">What should we call you?</h1>
                <p className="text-muted-foreground mt-2">This is how FocusEdge will greet you each day.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Your name</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ankit" className="h-12 text-base" />
              </div>
              <Button onClick={() => setStep(1)} disabled={!name.trim()} className="w-full h-12 gradient-primary text-white shadow-glow">
                Continue <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h1 className="font-display text-3xl font-bold">Pick your starter habits</h1>
                <p className="text-muted-foreground mt-2">Choose 3–5. You can edit these anytime.</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {STARTER_HABITS.map((h) => {
                  const active = picks.includes(h.name);
                  const Icon = h.emoji;
                  return (
                    <button
                      key={h.name}
                      onClick={() => togglePick(h.name)}
                      className={cn(
                        "relative flex items-center gap-3 rounded-2xl border-2 p-4 text-left transition-all",
                        active
                          ? "border-primary bg-accent/40 shadow-glow"
                          : "border-border hover:border-primary/40",
                      )}
                    >
                      <Icon className={cn("h-5 w-5 shrink-0", active ? "text-primary" : "text-muted-foreground")} />
                      <span className="text-sm font-medium">{h.name}</span>
                      {active && (
                        <div className="absolute top-2 right-2 grid h-5 w-5 place-items-center rounded-full gradient-primary">
                          <Check className="h-3 w-3 text-white" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(0)} className="flex-1 h-12">Back</Button>
                <Button onClick={() => setStep(2)} disabled={picks.length < 1} className="flex-[2] h-12 gradient-primary text-white shadow-glow">
                  Continue <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h1 className="font-display text-3xl font-bold">Your first task</h1>
                <p className="text-muted-foreground mt-2">What's one thing you want to do today? (Optional)</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="task">Task</Label>
                <Input id="task" value={task} onChange={(e) => setTask(e.target.value)} placeholder="Apply to internship" className="h-12 text-base" />
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1 h-12">Back</Button>
                <Button onClick={finish} disabled={busy} className="flex-[2] h-12 gradient-primary text-white shadow-glow">
                  {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                  Enter dashboard
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
