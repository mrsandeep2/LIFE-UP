import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export type InterviewQuestion = {
  id: string;
  user_id: string;
  title: string;
  answer: string;
  category: string | null;
  image_url: string | null;
  created_at: string;
  updated_at: string;
};

export const QUESTION_CATEGORY_SUGGESTIONS = [
  "DSA",
  "System Design",
  "Behavioral",
  "Frontend",
  "Backend",
  "DBMS",
  "OS",
  "Networking",
  "HR",
];

export function useInterviewQuestions() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["interview_questions", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("interview_questions")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as InterviewQuestion[];
    },
  });
}

export function useAddInterviewQuestion() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      title: string;
      answer: string;
      category?: string | null;
      image_url?: string | null;
    }) => {
      if (!user) throw new Error("not signed in");
      const { data, error } = await supabase
        .from("interview_questions")
        .insert({
          user_id: user.id,
          title: input.title,
          answer: input.answer,
          category: input.category?.trim() || null,
          image_url: input.image_url || null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["interview_questions"] }),
  });
}

export function useUpdateInterviewQuestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<InterviewQuestion> }) => {
      const { error } = await supabase.from("interview_questions").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["interview_questions"] }),
  });
}

export function useDeleteInterviewQuestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("interview_questions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["interview_questions"] }),
  });
}

/**
 * Upload an image to the shared `uploads` bucket.
 * Path layout: {folder}/{user_id}/{uuid}.{ext}
 * (folder is "interview" or "applications")
 */
export async function uploadImage(opts: {
  file: File;
  userId: string;
  folder: "interview" | "applications";
}): Promise<string> {
  const { file, userId, folder } = opts;
  const ext = (file.name.split(".").pop() || "png").toLowerCase();
  const filename = `${crypto.randomUUID()}.${ext}`;
  const path = `${folder}/${userId}/${filename}`;
  const { error } = await supabase.storage.from("uploads").upload(path, file, {
    upsert: false,
    contentType: file.type || "image/png",
  });
  if (error) throw error;
  const { data } = supabase.storage.from("uploads").getPublicUrl(path);
  return data.publicUrl;
}

export const INTERNSHIP_TYPES = ["Remote", "On-site", "Paid", "Stipend", "Free", "Other"] as const;
export type InternshipType = (typeof INTERNSHIP_TYPES)[number];
