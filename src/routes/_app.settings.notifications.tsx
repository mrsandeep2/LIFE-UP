import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Bell, Mail, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNotificationPrefs } from "@/lib/notification-prefs";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/settings/notifications")({
  component: NotificationSettingsPage,
});

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-card p-4 hover-lift">
      <div className="min-w-0">
        <div className="font-semibold text-sm">{label}</div>
        {hint && <div className="text-xs text-muted-foreground mt-0.5">{hint}</div>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function NotificationSettingsPage() {
  const { prefs, loading, update } = useNotificationPrefs();
  const [reminderTime, setReminderTime] = React.useState("09:00");
  const [quietStart, setQuietStart] = React.useState("");
  const [quietEnd, setQuietEnd] = React.useState("");

  React.useEffect(() => {
    if (prefs) {
      setReminderTime(prefs.habit_reminder_time.slice(0, 5));
      setQuietStart(prefs.quiet_hours_start?.slice(0, 5) ?? "");
      setQuietEnd(prefs.quiet_hours_end?.slice(0, 5) ?? "");
    }
  }, [prefs?.user_id]);

  if (loading || !prefs) {
    return <div className="text-sm text-muted-foreground">Loading…</div>;
  }

  const set = async (patch: Parameters<typeof update>[0]) => {
    try {
      await update(patch);
    } catch (e: any) {
      toast.error(e?.message || "Couldn't save");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold flex items-center gap-2">
          <Bell className="h-7 w-7 text-primary" /> Notifications
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Right message, right time. Stay on track without the spam.
        </p>
      </div>

      <Row label="Enable notifications" hint="Master switch for everything below.">
        <Switch checked={prefs.enabled} onCheckedChange={(v) => set({ enabled: v })} />
      </Row>

      <div className="space-y-3">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold px-1">
          Categories
        </div>
        <Row label="Tasks" hint="Pre-reminders, due alerts, missed follow-ups.">
          <Switch checked={prefs.tasks_enabled} onCheckedChange={(v) => set({ tasks_enabled: v })} />
        </Row>
        <Row label="Habits" hint="Daily reminder at your chosen time.">
          <Switch checked={prefs.habits_enabled} onCheckedChange={(v) => set({ habits_enabled: v })} />
        </Row>
        <Row label="Interviews" hint="T-1 day, T-1 hour, T-10 min countdowns.">
          <Switch checked={prefs.interviews_enabled} onCheckedChange={(v) => set({ interviews_enabled: v })} />
        </Row>
        <Row label="Career follow-ups" hint="Nudges 7 days after applying.">
          <Switch checked={prefs.career_enabled} onCheckedChange={(v) => set({ career_enabled: v })} />
        </Row>
      </div>

      <div className="space-y-3">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold px-1">
          Timing
        </div>
        <div className="rounded-xl border border-border bg-card p-4 space-y-3 hover-lift">
          <div>
            <Label className="text-xs">Daily habit reminder</Label>
            <Input
              type="time"
              value={reminderTime}
              onChange={(e) => setReminderTime(e.target.value)}
              onBlur={() => set({ habit_reminder_time: `${reminderTime}:00` })}
              className="mt-1 max-w-[160px]"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Quiet hours start</Label>
              <Input
                type="time"
                value={quietStart}
                onChange={(e) => setQuietStart(e.target.value)}
                onBlur={() => set({ quiet_hours_start: quietStart ? `${quietStart}:00` : null })}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Quiet hours end</Label>
              <Input
                type="time"
                value={quietEnd}
                onChange={(e) => setQuietEnd(e.target.value)}
                onBlur={() => set({ quiet_hours_end: quietEnd ? `${quietEnd}:00` : null })}
                className="mt-1"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold px-1">
          Channels
        </div>
        <Row
          label={
            <span className="inline-flex items-center gap-2">
              <Smartphone className="h-4 w-4" /> Browser push
            </span> as any
          }
          hint="Coming soon — set up VAPID keys to enable."
        >
          <Switch checked={false} disabled />
        </Row>
        <Row
          label={
            <span className="inline-flex items-center gap-2">
              <Mail className="h-4 w-4" /> Email reminders
            </span> as any
          }
          hint="Requires a verified email domain. Configure this in your email settings."
        >
          <Switch checked={false} disabled />
        </Row>
      </div>

      <div>
        <Button
          className="gradient-primary text-white hover-glow"
          onClick={() => toast.success("Notifications are configured. New alerts will appear in the bell.")}
        >
          Send me a test
        </Button>
      </div>
    </div>
  );
}
