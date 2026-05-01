import * as React from "react";
import { format, parseISO } from "date-fns";
import { CalendarIcon, Upload, User2, Sparkles, Check, Loader2, ImagePlus, LogOut, Pencil, X } from "lucide-react";
import { toast } from "sonner";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

import { useProfile, profileDisplayName } from "@/lib/profile";
import { useAuth } from "@/lib/auth";
import { AVATAR_PRESETS, defaultAvatarKeyForGender, type Gender } from "@/lib/avatars";
import { UserAvatar } from "@/components/user-avatar";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ProfileSheet({ open, onOpenChange }: Props) {
  const { user, signOut } = useAuth();
  const { profile, save } = useProfile();

  const [name, setName] = React.useState("");
  const [gender, setGender] = React.useState<Gender | null>(null);
  const [avatarKey, setAvatarKey] = React.useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = React.useState<string | null>(null);
  const [dob, setDob] = React.useState<Date | undefined>(undefined);
  const [saving, setSaving] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const [uploadError, setUploadError] = React.useState<string | null>(null);
  const [editing, setEditing] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);

  // Hydrate when opening
  React.useEffect(() => {
    if (!open) return;
    setName(profile?.display_name ?? profileDisplayName(profile, user));
    setGender((profile?.gender as Gender) ?? null);
    setAvatarKey(profile?.avatar_key ?? null);
    setAvatarUrl(profile?.avatar_url ?? null);
    setDob(profile?.dob ? parseISO(profile.dob) : undefined);
    setUploadError(null);
    // Start in view mode unless user has never set a name (first-time)
    setEditing(!profile?.display_name);
  }, [open, profile, user]);

  // Live-preview profile object
  const previewProfile = React.useMemo(
    () => ({
      ...(profile ?? { id: "", onboarded: false }),
      display_name: name,
      gender,
      avatar_key: avatarKey,
      avatar_url: avatarUrl,
      dob: dob ? format(dob, "yyyy-MM-dd") : null,
    }),
    [profile, name, gender, avatarKey, avatarUrl, dob],
  );

  const handleGender = (g: Gender) => {
    setGender(g);
    // Pre-select default avatar for that gender ONLY if user hasn't picked one yet
    if (!avatarKey && !avatarUrl) {
      setAvatarKey(defaultAvatarKeyForGender(g));
    }
  };

  const handlePickPreset = (key: string) => {
    setAvatarKey(key);
    setAvatarUrl(null); // preset takes over visual; clear custom
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !user) return;
    setUploadError(null);

    if (!file.type.startsWith("image/")) {
      setUploadError("Please pick an image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadError("Image must be under 5MB.");
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "png";
      const path = `avatars/${user.id}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage
        .from("uploads")
        .upload(path, file, { cacheControl: "3600", upsert: false });
      if (error) throw error;
      const { data } = supabase.storage.from("uploads").getPublicUrl(path);
      setAvatarUrl(data.publicUrl);
    } catch (err: any) {
      setUploadError(err?.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    const { error } = await save({
      display_name: name.trim() || null,
      gender,
      avatar_key: avatarKey,
      avatar_url: avatarUrl,
      dob: dob ? format(dob, "yyyy-MM-dd") : null,
    });
    setSaving(false);
    if (error) {
      toast.error("Couldn't save profile", { description: error });
      return;
    }
    toast.success("Profile updated", { description: "Looking sharp ✨" });
    setEditing(false);
    onOpenChange(false);
  };

  const handleCancelEdit = () => {
    // Revert local state to current profile
    setName(profile?.display_name ?? profileDisplayName(profile, user));
    setGender((profile?.gender as Gender) ?? null);
    setAvatarKey(profile?.avatar_key ?? null);
    setAvatarUrl(profile?.avatar_url ?? null);
    setDob(profile?.dob ? parseISO(profile.dob) : undefined);
    setUploadError(null);
    setEditing(false);
  };

  const malePresets = AVATAR_PRESETS.filter((a) => a.gender === "male");
  const femalePresets = AVATAR_PRESETS.filter((a) => a.gender === "female");

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md p-0 flex flex-col gap-0 overflow-hidden"
      >
        {/* Custom close — override Radix one which can be flaky on some mobile browsers */}
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          aria-label="Close"
          className="absolute right-3 top-3 z-50 grid h-9 w-9 place-items-center rounded-full bg-background/70 backdrop-blur border border-border text-muted-foreground hover:text-foreground hover:bg-background transition-colors press"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Hero preview */}
        <div className="relative px-6 pt-7 pb-6 bg-gradient-to-br from-primary/15 via-accent/10 to-transparent">
          <SheetHeader className="text-left mb-5">
            <SheetTitle className="font-display text-xl flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              {editing ? "Edit your profile" : "Your profile"}
            </SheetTitle>
            <SheetDescription className="text-xs">
              {editing ? "How you appear across FocusEdge." : "Tap edit to update your details."}
            </SheetDescription>
          </SheetHeader>

          <div className="flex items-center gap-4">
            <UserAvatar profile={previewProfile as any} size={76} ring />
            <div className="min-w-0">
              <div className="font-display text-lg font-bold truncate">
                {name?.trim() || "Your name"}
              </div>
              <div className="text-xs text-muted-foreground flex items-center gap-2 mt-1">
                {gender ? (
                  <span className="rounded-full bg-background/70 backdrop-blur px-2 py-0.5 capitalize border border-border">
                    {gender}
                  </span>
                ) : (
                  <span className="text-muted-foreground/60">Add details below</span>
                )}
                {dob && (
                  <span className="rounded-full bg-background/70 backdrop-blur px-2 py-0.5 border border-border">
                    {format(dob, "d MMM")}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Form (scrollable) */}
        <fieldset
          disabled={!editing}
          className={cn(
            "flex-1 overflow-y-auto px-6 py-5 space-y-6 border-0 m-0 min-w-0 transition-opacity",
            !editing && "opacity-95",
          )}
        >
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="profile-name" className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
              Display name
            </Label>
            <Input
              id="profile-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Aanya"
              maxLength={40}
              className="h-11 text-base"
            />
          </div>

          {/* Gender */}
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
              Gender
            </Label>
            <div className="grid grid-cols-3 gap-2">
              {(["male", "female", "other"] as Gender[]).map((g) => {
                const active = gender === g;
                return (
                  <button
                    key={g}
                    type="button"
                    onClick={() => handleGender(g)}
                    className={cn(
                      "press relative flex flex-col items-center justify-center gap-1.5 rounded-2xl border py-3 text-xs font-semibold capitalize transition-all",
                      active
                        ? "border-primary bg-primary/10 text-primary shadow-glow"
                        : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:bg-accent/30",
                    )}
                  >
                    <User2 className={cn("h-4 w-4", active && "text-primary")} />
                    {g}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Avatar picker */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                Choose avatar
              </Label>
              {(avatarKey || avatarUrl) && (
                <button
                  type="button"
                  onClick={() => {
                    setAvatarKey(null);
                    setAvatarUrl(null);
                  }}
                  className="text-[11px] text-muted-foreground hover:text-foreground"
                >
                  Clear
                </button>
              )}
            </div>

            <AvatarRow
              label="Boys"
              presets={malePresets}
              selectedKey={!avatarUrl ? avatarKey : null}
              onPick={handlePickPreset}
            />
            <AvatarRow
              label="Girls"
              presets={femalePresets}
              selectedKey={!avatarUrl ? avatarKey : null}
              onPick={handlePickPreset}
            />

            {/* Custom upload */}
            <div className="pt-1">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleUpload}
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className={cn(
                  "press hover-lift w-full rounded-2xl border-2 border-dashed border-border bg-card/50 px-4 py-3.5 text-sm font-semibold text-muted-foreground hover:border-primary/40 hover:text-foreground inline-flex items-center justify-center gap-2 transition-all",
                  avatarUrl && "border-primary/60 text-primary",
                )}
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Uploading…
                  </>
                ) : avatarUrl ? (
                  <>
                    <Check className="h-4 w-4" /> Custom photo set — tap to change
                  </>
                ) : (
                  <>
                    <ImagePlus className="h-4 w-4" /> Upload from gallery
                  </>
                )}
              </button>
              {uploadError && (
                <p className="mt-2 text-xs text-destructive">{uploadError}</p>
              )}
            </div>
          </div>

          {/* DOB */}
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
              Date of birth
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "press h-11 w-full justify-start text-left font-normal",
                    !dob && "text-muted-foreground",
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dob ? format(dob, "d MMMM yyyy") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dob}
                  onSelect={setDob}
                  disabled={(d) => d > new Date() || d < new Date("1900-01-01")}
                  defaultMonth={dob ?? new Date(2000, 0, 1)}
                  captionLayout="dropdown"
                  startMonth={new Date(1900, 0)}
                  endMonth={new Date(new Date().getFullYear(), 11)}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>
        </fieldset>

        {/* Sticky footer */}
        <div className="border-t border-border bg-background/95 backdrop-blur px-6 py-4 space-y-3">
          {editing ? (
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                className="flex-1 press"
                onClick={handleCancelEdit}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 gradient-primary text-white shadow-glow hover-glow press"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Save changes
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                className="flex-1 press"
                onClick={() => onOpenChange(false)}
              >
                Close
              </Button>
              <Button
                className="flex-1 gradient-primary text-white shadow-glow hover-glow press"
                onClick={() => setEditing(true)}
              >
                <Pencil className="h-4 w-4" /> Edit profile
              </Button>
            </div>
          )}
          <Button
            variant="ghost"
            className="w-full press text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={() => { onOpenChange(false); signOut(); }}
          >
            <LogOut className="h-4 w-4" /> Sign out
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function AvatarRow({
  label,
  presets,
  selectedKey,
  onPick,
}: {
  label: string;
  presets: { key: string; src: string; label: string }[];
  selectedKey: string | null;
  onPick: (key: string) => void;
}) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-semibold mb-2">
        {label}
      </div>
      <div className="grid grid-cols-5 gap-2">
        {presets.map((p) => {
          const active = selectedKey === p.key;
          return (
            <button
              key={p.key}
              type="button"
              onClick={() => onPick(p.key)}
              className={cn(
                "press group relative aspect-square rounded-2xl border-2 overflow-hidden transition-all",
                "bg-gradient-to-br from-muted/40 to-accent/20",
                active
                  ? "border-primary shadow-glow scale-[1.04]"
                  : "border-transparent hover:border-primary/40 hover:-translate-y-0.5 hover:shadow-card",
              )}
              aria-label={p.label}
              aria-pressed={active}
            >
              <img
                src={p.src}
                alt={p.label}
                width={128}
                height={128}
                loading="lazy"
                className="h-full w-full object-cover"
              />
              {active && (
                <div className="absolute top-1 right-1 grid h-5 w-5 place-items-center rounded-full gradient-primary shadow-glow">
                  <Check className="h-3 w-3 text-white" strokeWidth={3} />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
