import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export type InterviewEventKind = "phone_screen" | "technical" | "onsite" | "final" | "other";
export type InterviewEventOutcome = "pending" | "passed" | "failed" | "cancelled" | "no_show";

export type InterviewEvent = {
  id: string;
  user_id: string;
  application_id: string;
  kind: InterviewEventKind;
  title: string;
  scheduled_at: string;
  duration_minutes: number;
  location: string | null;
  notes: string | null;
  outcome: InterviewEventOutcome | null;
  created_at: string;
  updated_at: string;
};

export const INTERVIEW_KIND_LABELS: Record<InterviewEventKind, string> = {
  phone_screen: "Phone screen",
  technical: "Technical",
  onsite: "Onsite",
  final: "Final round",
  other: "Other",
};

export const INTERVIEW_OUTCOME_LABELS: Record<InterviewEventOutcome, string> = {
  pending: "Pending",
  passed: "Passed",
  failed: "Failed",
  cancelled: "Cancelled",
  no_show: "No-show",
};

export function useInterviewEvents(applicationId?: string | null) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["interview_events", user?.id, applicationId ?? "all"],
    enabled: !!user,
    queryFn: async () => {
      let q = supabase
        .from("interview_events")
        .select("*")
        .order("scheduled_at", { ascending: true });
      if (applicationId) q = q.eq("application_id", applicationId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as InterviewEvent[];
    },
  });
}

export function useUpcomingInterviews() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["interview_events_upcoming", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("interview_events")
        .select("*")
        .gte("scheduled_at", new Date().toISOString())
        .or("outcome.is.null,outcome.eq.pending")
        .order("scheduled_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as InterviewEvent[];
    },
  });
}

export function useAddInterviewEvent() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Omit<InterviewEvent, "id" | "user_id" | "created_at" | "updated_at" | "outcome"> & { outcome?: InterviewEventOutcome }) => {
      if (!user) throw new Error("not signed in");
      const { data, error } = await supabase
        .from("interview_events")
        .insert({ ...input, user_id: user.id, outcome: input.outcome ?? "pending" })
        .select("*")
        .single();
      if (error) throw error;
      return data as InterviewEvent;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["interview_events"] });
      qc.invalidateQueries({ queryKey: ["interview_events_upcoming"] });
    },
  });
}

export function useUpdateInterviewEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<InterviewEvent> }) => {
      const { error } = await supabase.from("interview_events").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["interview_events"] });
      qc.invalidateQueries({ queryKey: ["interview_events_upcoming"] });
    },
  });
}

export function useDeleteInterviewEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("interview_events").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["interview_events"] });
      qc.invalidateQueries({ queryKey: ["interview_events_upcoming"] });
    },
  });
}
