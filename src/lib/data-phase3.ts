import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { format, startOfWeek } from "date-fns";

// ===== Types =====
export type HabitFreeze = {
  id: string;
  habit_id: string;
  used_on: string;
  week_of: string;
};

export type WeeklyReview = {
  id: string;
  week_of: string;
  went_well: string | null;
  blockers: string | null;
  change: string | null;
  created_at: string;
  updated_at: string;
};

export type FocusSession = {
  id: string;
  task_id: string | null;
  topic: string | null;
  planned_minutes: number;
  actual_minutes: number;
  started_at: string;
  ended_at: string | null;
  completed_naturally: boolean;
};

export const weekOf = (d: Date = new Date()) =>
  format(startOfWeek(d, { weekStartsOn: 1 }), "yyyy-MM-dd");

// ===== Habit freezes =====
export function useHabitFreezes() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["habit_freezes", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("habit_freezes")
        .select("*")
        .order("used_on", { ascending: false });
      if (error) throw error;
      return (data ?? []) as HabitFreeze[];
    },
  });
}

export function useUseFreezeToken() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ habitId, date }: { habitId: string; date: string }) => {
      if (!user) throw new Error("not signed in");
      const wk = weekOf(new Date(date));
      const { error } = await supabase.from("habit_freezes").insert({
        user_id: user.id,
        habit_id: habitId,
        used_on: date,
        week_of: wk,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["habit_freezes"] }),
  });
}

// ===== Weekly reviews =====
export function useWeeklyReview(weekStart: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["weekly_review", user?.id, weekStart],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("weekly_reviews")
        .select("*")
        .eq("week_of", weekStart)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as WeeklyReview | null;
    },
  });
}

export function useWeeklyReviewHistory() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["weekly_reviews", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("weekly_reviews")
        .select("*")
        .order("week_of", { ascending: false });
      if (error) throw error;
      return (data ?? []) as WeeklyReview[];
    },
  });
}

export function useSaveWeeklyReview() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      week_of: string;
      went_well: string;
      blockers: string;
      change: string;
    }) => {
      if (!user) throw new Error("not signed in");
      const { error } = await supabase
        .from("weekly_reviews")
        .upsert(
          { ...input, user_id: user.id },
          { onConflict: "user_id,week_of" },
        );
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["weekly_review"] });
      qc.invalidateQueries({ queryKey: ["weekly_reviews"] });
    },
  });
}

// ===== Focus sessions =====
export function useFocusSessions() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["focus_sessions", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("focus_sessions")
        .select("*")
        .order("started_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as FocusSession[];
    },
  });
}

export function useLogFocusSession() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      task_id: string | null;
      topic: string | null;
      planned_minutes: number;
      actual_minutes: number;
      started_at: string;
      ended_at: string;
      completed_naturally: boolean;
    }) => {
      if (!user) throw new Error("not signed in");
      const { error } = await supabase
        .from("focus_sessions")
        .insert({ ...input, user_id: user.id });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["focus_sessions"] }),
  });
}
