import * as React from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
});

function AuthPage() {
  const { user, signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = React.useState<"signin" | "signup">("signin");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [name, setName] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (user) navigate({ to: "/dashboard" });
  }, [user, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = mode === "signin"
      ? await signIn(email, password)
      : await signUp(email, password, name || email.split("@")[0]);
    setBusy(false);
    if (error) {
      toast.error(error);
    } else if (mode === "signup") {
      toast.success("Welcome to FocusEdge!");
      navigate({ to: "/onboarding" });
    }
  };

  return (
    <div className="min-h-screen w-full grid lg:grid-cols-2 bg-background">
      {/* Hero side */}
      <div className="hidden lg:flex flex-col justify-between p-12 gradient-primary text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: "radial-gradient(circle at 20% 30%, white 1px, transparent 1px), radial-gradient(circle at 70% 60%, white 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }} />
        <div className="relative">
          <div className="flex items-center gap-3">
            <div className="grid place-items-center h-12 w-12 rounded-2xl bg-white/20 backdrop-blur">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <div className="font-display text-2xl font-bold">FocusEdge</div>
              <div className="text-xs opacity-80">Your Personal Life OS</div>
            </div>
          </div>
        </div>
        <div className="relative space-y-6">
          <h1 className="font-display text-5xl font-bold leading-tight">
            One dashboard.<br />Every win.
          </h1>
          <p className="text-lg opacity-90 max-w-md">
            Track habits, capture tasks, and watch your streaks grow. Built for students and early-career builders who want to feel in control.
          </p>
          <div className="grid grid-cols-3 gap-4 max-w-md">
            {[
              { n: "30+", l: "habits to start" },
              { n: "1 min", l: "to log a day" },
              { n: "0", l: "feature bloat" },
            ].map((s) => (
              <div key={s.l} className="rounded-2xl bg-white/10 backdrop-blur p-4">
                <div className="font-display text-2xl font-bold">{s.n}</div>
                <div className="text-xs opacity-80 mt-1">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="relative text-xs opacity-70">© FocusEdge — Discipline beats motivation.</div>
      </div>

      {/* Form side */}
      <div className="flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-sm space-y-6">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="grid place-items-center h-10 w-10 rounded-xl gradient-primary shadow-glow">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="font-display text-xl font-bold">FocusEdge</div>
              <div className="text-xs text-muted-foreground">Personal Life OS</div>
            </div>
          </div>

          <div>
            <h2 className="font-display text-3xl font-bold">
              {mode === "signin" ? "Welcome back" : "Start your streak"}
            </h2>
            <p className="text-sm text-muted-foreground mt-2">
              {mode === "signin" ? "Sign in to continue your streak." : "Create an account in seconds."}
            </p>
          </div>

          <Tabs value={mode} onValueChange={(v) => setMode(v as "signin" | "signup")} className="w-full">
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="signin">Sign in</TabsTrigger>
              <TabsTrigger value="signup">Sign up</TabsTrigger>
            </TabsList>
            <TabsContent value={mode} forceMount>
              <form onSubmit={submit} className="space-y-4 mt-6">
                {mode === "signup" && (
                  <div className="space-y-2">
                    <Label htmlFor="name">Your name</Label>
                    <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ankit" />
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input id="password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" />
                </div>
                <Button type="submit" disabled={busy} className="w-full gradient-primary text-white shadow-glow h-11">
                  {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                  {mode === "signin" ? "Sign in" : "Create account"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
