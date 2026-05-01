import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as React from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export type NotificationCategory = "task" | "habit" | "interview" | "career";
export type NotificationPriority = "low" | "medium" | "high";

export type NotificationType =
  | "task_pre"
  | "task_due"
  | "task_missed"
  | "task_followup"
  | "habit_reminder"
  | "habit_eod"
  | "interview_pre_day"
  | "interview_pre_hour"
  | "interview_pre_10"
  | "application_followup";

export type Notification = {
  id: string;
  user_id: string;
  type: NotificationType;
  category: NotificationCategory;
  priority: NotificationPriority;
  title: string;
  body: string | null;
  related_id: string | null;
  related_kind: string | null;
  trigger_at: string;
  delivered_at: string | null;
  read_at: string | null;
  dismissed_at: string | null;
  channels_sent: string[];
  dedup_key: string;
  meta: Record<string, any>;
  created_at: string;
};

// ---------- helpers ----------
export function dedupKeyFor(type: NotificationType, relatedId: string, suffix?: string): string {
  return suffix ? `${type}:${relatedId}:${suffix}` : `${type}:${relatedId}`;
}

export function categoryFor(type: NotificationType): NotificationCategory {
  if (type.startsWith("task_")) return "task";
  if (type.startsWith("habit_")) return "habit";
  if (type.startsWith("interview_")) return "interview";
  return "career";
}

export function priorityFor(type: NotificationType): NotificationPriority {
  switch (type) {
    case "task_missed":
    case "task_followup":
    case "interview_pre_hour":
    case "interview_pre_10":
      return "high";
    case "task_due":
    case "habit_reminder":
    case "interview_pre_day":
    case "application_followup":
      return "medium";
    default:
      return "low";
  }
}

export function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  return new Date(iso).toLocaleDateString();
}

export function routeFor(n: Notification): string {
  switch (n.category) {
    case "task":
      return "/tasks";
    case "habit":
      return "/habits";
    case "interview":
      return "/career";
    case "career":
      return "/career";
    default:
      return "/dashboard";
  }
}

// ---------- queries ----------
export function useNotifications() {
  const { user } = useAuth();
  const qc = useQueryClient();

  // realtime subscription
  React.useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel("notifications:" + user.id)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        () => qc.invalidateQueries({ queryKey: ["notifications", user.id] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [user?.id, qc]);

  return useQuery({
    queryKey: ["notifications", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .is("dismissed_at", null)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as Notification[];
    },
  });
}

export function useUnreadCount() {
  const { data = [] } = useNotifications();
  return data.filter((n) => !n.read_at).length;
}

export function useMarkRead() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications", user?.id] }),
  });
}

export function useMarkAllRead() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!user) return;
      const { error } = await supabase
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("user_id", user.id)
        .is("read_at", null);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications", user?.id] }),
  });
}

export function useDismiss() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("notifications")
        .update({ dismissed_at: new Date().toISOString(), read_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications", user?.id] }),
  });
}

// upsert (idempotent via dedup_key) — used by client scheduler
export async function upsertNotification(input: {
  userId: string;
  type: NotificationType;
  title: string;
  body?: string;
  relatedId?: string | null;
  relatedKind?: string | null;
  triggerAt?: string;
  meta?: Record<string, any>;
  dedupKey: string;
}): Promise<void> {
  const cat = categoryFor(input.type);
  const pri = priorityFor(input.type);
  const { error } = await supabase
    .from("notifications")
    .upsert(
      {
        user_id: input.userId,
        type: input.type,
        category: cat,
        priority: pri,
        title: input.title,
        body: input.body ?? null,
        related_id: input.relatedId ?? null,
        related_kind: input.relatedKind ?? null,
        trigger_at: input.triggerAt ?? new Date().toISOString(),
        delivered_at: new Date().toISOString(),
        channels_sent: ["inapp"],
        dedup_key: input.dedupKey,
        meta: input.meta ?? {},
      },
      { onConflict: "user_id,dedup_key", ignoreDuplicates: true },
    );
  if (error && error.code !== "23505") throw error;
}
