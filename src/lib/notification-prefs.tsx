import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export type NotificationPrefs = {
  user_id: string;
  enabled: boolean;
  tasks_enabled: boolean;
  habits_enabled: boolean;
  interviews_enabled: boolean;
  career_enabled: boolean;
  habit_reminder_time: string; // "HH:MM:SS"
  push_enabled: boolean;
  push_subscription: any | null;
  email_enabled: boolean;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
  timezone: string;
  created_at: string;
  updated_at: string;
};

const DEFAULT_PREFS: Omit<NotificationPrefs, "user_id" | "created_at" | "updated_at"> = {
  enabled: true,
  tasks_enabled: true,
  habits_enabled: true,
  interviews_enabled: true,
  career_enabled: true,
  habit_reminder_time: "09:00:00",
  push_enabled: false,
  push_subscription: null,
  email_enabled: false,
  quiet_hours_start: null,
  quiet_hours_end: null,
  timezone: "UTC",
};

type Ctx = {
  prefs: NotificationPrefs | null;
  loading: boolean;
  update: (patch: Partial<NotificationPrefs>) => Promise<void>;
};

const PrefsContext = React.createContext<Ctx | undefined>(undefined);

export function NotificationPrefsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["notification_prefs", user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (!user) return null;
      // try to fetch
      const { data: rows, error } = await supabase
        .from("notification_prefs")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      if (rows) return rows as NotificationPrefs;
      // upsert defaults with browser TZ
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
      const { data: created, error: insErr } = await supabase
        .from("notification_prefs")
        .insert({ user_id: user.id, ...DEFAULT_PREFS, timezone: tz })
        .select("*")
        .single();
      if (insErr) throw insErr;
      return created as NotificationPrefs;
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (patch: Partial<NotificationPrefs>) => {
      if (!user) throw new Error("not signed in");
      const { error } = await supabase
        .from("notification_prefs")
        .update(patch)
        .eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notification_prefs", user?.id] }),
  });

  const value: Ctx = {
    prefs: (data ?? null) as NotificationPrefs | null,
    loading: isLoading,
    update: async (patch) => {
      await updateMutation.mutateAsync(patch);
    },
  };

  return <PrefsContext.Provider value={value}>{children}</PrefsContext.Provider>;
}

export function useNotificationPrefs() {
  const ctx = React.useContext(PrefsContext);
  if (!ctx) throw new Error("useNotificationPrefs must be inside NotificationPrefsProvider");
  return ctx;
}
