import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export type ApplicationStatus = "wishlist" | "applied" | "interview" | "offer" | "rejected";
export const APP_STATUSES: ApplicationStatus[] = ["wishlist", "applied", "interview", "offer", "rejected"];
export const APP_STATUS_LABELS: Record<ApplicationStatus, string> = {
  wishlist: "Wishlist",
  applied: "Applied",
  interview: "Interview",
  offer: "Offer",
  rejected: "Rejected",
};

export type Application = {
  id: string;
  user_id: string;
  company: string;
  role: string;
  location: string | null;
  link: string | null;
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string | null;
  applied_on: string | null;
  status: ApplicationStatus;
  notes: string | null;
  internship_type: string | null;
  image_url: string | null;
  created_at: string;
  updated_at: string;
};

export type ApplicationEvent = {
  id: string;
  application_id: string;
  event_type: string;
  from_status: string | null;
  to_status: string | null;
  note: string | null;
  occurred_at: string;
};

export type Subject = {
  id: string;
  user_id: string;
  name: string;
  color: string;
  exam_date: string | null;
  target_hours: number | null;
  created_at: string;
};

export type TopicStatus = "not_started" | "in_progress" | "done";
export type Topic = {
  id: string;
  user_id: string;
  subject_id: string;
  title: string;
  status: TopicStatus;
  confidence: number;
  position: number;
  created_at: string;
};

export type StudySession = {
  id: string;
  user_id: string;
  subject_id: string;
  topic_id: string | null;
  minutes: number;
  studied_on: string;
  notes: string | null;
  created_at: string;
};

// ───────── Applications ─────────
export function useApplications() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["applications", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("applications")
        .select("*")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Application[];
    },
  });
}

export function useApplicationEvents(appId: string | null) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["application_events", user?.id, appId],
    enabled: !!user && !!appId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("application_events")
        .select("*")
        .eq("application_id", appId!)
        .order("occurred_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ApplicationEvent[];
    },
  });
}

export function useAddApplication() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      company: string;
      role: string;
      location?: string | null;
      link?: string | null;
      status?: ApplicationStatus;
      applied_on?: string | null;
      internship_type?: string | null;
      image_url?: string | null;
      notes?: string | null;
    }) => {
      if (!user) throw new Error("not signed in");
      const status = input.status ?? "wishlist";
      const { data, error } = await supabase
        .from("applications")
        .insert({
          user_id: user.id,
          company: input.company,
          role: input.role,
          location: input.location ?? null,
          link: input.link ?? null,
          status,
          applied_on: input.applied_on ?? null,
          internship_type: input.internship_type ?? null,
          image_url: input.image_url ?? null,
          notes: input.notes ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      await supabase.from("application_events").insert({
        user_id: user.id,
        application_id: data.id,
        event_type: "created",
        to_status: status,
      });
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["applications"] }),
  });
}

export function useUpdateApplicationStatus() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, from, to }: { id: string; from: ApplicationStatus; to: ApplicationStatus }) => {
      if (!user) throw new Error("not signed in");
      const { error } = await supabase.from("applications").update({ status: to }).eq("id", id);
      if (error) throw error;
      await supabase.from("application_events").insert({
        user_id: user.id,
        application_id: id,
        event_type: "status_change",
        from_status: from,
        to_status: to,
      });
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["applications"] });
      qc.invalidateQueries({ queryKey: ["application_events", user?.id, vars.id] });
    },
  });
}

export function useUpdateApplication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Application> }) => {
      const { error } = await supabase.from("applications").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["applications"] }),
  });
}

export function useDeleteApplication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("applications").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["applications"] }),
  });
}

export function useAddApplicationNote() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, note }: { id: string; note: string }) => {
      if (!user) throw new Error("not signed in");
      const { error } = await supabase.from("application_events").insert({
        user_id: user.id,
        application_id: id,
        event_type: "note",
        note,
      });
      if (error) throw error;
    },
    onSuccess: (_d, vars) => qc.invalidateQueries({ queryKey: ["application_events", user?.id, vars.id] }),
  });
}

// ───────── Subjects / Topics / Sessions ─────────
export function useSubjects() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["subjects", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subjects")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Subject[];
    },
  });
}

export function useTopics(subjectId?: string | null) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["topics", user?.id, subjectId ?? "all"],
    enabled: !!user,
    queryFn: async () => {
      let q = supabase.from("topics").select("*").order("position", { ascending: true });
      if (subjectId) q = q.eq("subject_id", subjectId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Topic[];
    },
  });
}

export function useStudySessions() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["study_sessions", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("study_sessions")
        .select("*")
        .order("studied_on", { ascending: false });
      if (error) throw error;
      return (data ?? []) as StudySession[];
    },
  });
}

export function useAddSubject() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; color?: string; exam_date?: string | null; target_hours?: number | null }) => {
      if (!user) throw new Error("not signed in");
      const { error } = await supabase.from("subjects").insert({
        user_id: user.id,
        name: input.name,
        color: input.color ?? "violet",
        exam_date: input.exam_date ?? null,
        target_hours: input.target_hours ?? 0,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["subjects"] }),
  });
}

export function useDeleteSubject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("subjects").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["subjects"] });
      qc.invalidateQueries({ queryKey: ["topics"] });
      qc.invalidateQueries({ queryKey: ["study_sessions"] });
    },
  });
}

export function useAddTopic() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { subject_id: string; title: string; position?: number }) => {
      if (!user) throw new Error("not signed in");
      const { error } = await supabase.from("topics").insert({
        user_id: user.id,
        subject_id: input.subject_id,
        title: input.title,
        position: input.position ?? 0,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["topics"] }),
  });
}

export function useUpdateTopic() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Topic> }) => {
      const { error } = await supabase.from("topics").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["topics"] }),
  });
}

export function useDeleteTopic() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("topics").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["topics"] }),
  });
}

export function useLogStudySession() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { subject_id: string; topic_id?: string | null; minutes: number; notes?: string | null; studied_on?: string }) => {
      if (!user) throw new Error("not signed in");
      const { error } = await supabase.from("study_sessions").insert({
        user_id: user.id,
        subject_id: input.subject_id,
        topic_id: input.topic_id ?? null,
        minutes: input.minutes,
        notes: input.notes ?? null,
        studied_on: input.studied_on ?? new Date().toISOString().slice(0, 10),
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["study_sessions"] }),
  });
}
