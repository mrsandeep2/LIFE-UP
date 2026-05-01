import * as React from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import type { Gender } from "@/lib/avatars";

export type Profile = {
  id: string;
  display_name: string | null;
  gender: Gender | null;
  avatar_key: string | null;
  avatar_url: string | null;
  dob: string | null;
  onboarded: boolean;
};

type ProfileCtx = {
  profile: Profile | null;
  loading: boolean;
  refresh: () => Promise<void>;
  save: (patch: Partial<Profile>) => Promise<{ error: string | null }>;
};

const Ctx = React.createContext<ProfileCtx>({
  profile: null,
  loading: true,
  refresh: async () => {},
  save: async () => ({ error: null }),
});

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [profile, setProfile] = React.useState<Profile | null>(null);
  const [loading, setLoading] = React.useState(true);

  const load = React.useCallback(async () => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("id, display_name, gender, avatar_key, avatar_url, dob, onboarded")
      .eq("id", user.id)
      .maybeSingle();
    if (error) {
      console.error("profile load", error);
    }
    if (!data) {
      // Upsert a default row for new users
      const fallbackName =
        (user.user_metadata?.display_name as string) ||
        user.email?.split("@")[0] ||
        "Friend";
      const { data: created } = await supabase
        .from("profiles")
        .upsert({ id: user.id, display_name: fallbackName }, { onConflict: "id" })
        .select("id, display_name, gender, avatar_key, avatar_url, dob, onboarded")
        .maybeSingle();
      setProfile((created as Profile) ?? null);
    } else {
      setProfile(data as Profile);
    }
    setLoading(false);
  }, [user]);

  React.useEffect(() => {
    load();
  }, [load]);

  const save = async (patch: Partial<Profile>) => {
    if (!user) return { error: "Not signed in" };
    const { data, error } = await supabase
      .from("profiles")
      .update(patch)
      .eq("id", user.id)
      .select("id, display_name, gender, avatar_key, avatar_url, dob, onboarded")
      .maybeSingle();
    if (error) return { error: error.message };
    if (data) setProfile(data as Profile);
    return { error: null };
  };

  return (
    <Ctx.Provider value={{ profile, loading, refresh: load, save }}>
      {children}
    </Ctx.Provider>
  );
}

export function useProfile() {
  return React.useContext(Ctx);
}

export function profileDisplayName(
  profile: Profile | null,
  fallbackUser: { user_metadata?: any; email?: string | null } | null,
): string {
  return (
    profile?.display_name?.trim() ||
    (fallbackUser?.user_metadata?.display_name as string) ||
    fallbackUser?.email?.split("@")[0] ||
    "Friend"
  );
}
