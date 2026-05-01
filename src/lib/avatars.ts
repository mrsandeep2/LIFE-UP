import boy1 from "@/assets/avatars/boy-1.png";
import boy2 from "@/assets/avatars/boy-2.png";
import boy3 from "@/assets/avatars/boy-3.png";
import boy4 from "@/assets/avatars/boy-4.png";
import boy5 from "@/assets/avatars/boy-5.png";
import girl1 from "@/assets/avatars/girl-1.png";
import girl2 from "@/assets/avatars/girl-2.png";
import girl3 from "@/assets/avatars/girl-3.png";
import girl4 from "@/assets/avatars/girl-4.png";
import girl5 from "@/assets/avatars/girl-5.png";

export type Gender = "male" | "female" | "other";

export type AvatarPreset = {
  key: string;
  src: string;
  label: string;
  gender: "male" | "female";
};

export const AVATAR_PRESETS: AvatarPreset[] = [
  { key: "boy-1", src: boy1, label: "Student", gender: "male" },
  { key: "boy-2", src: boy2, label: "Athlete", gender: "male" },
  { key: "boy-3", src: boy3, label: "Creative", gender: "male" },
  { key: "boy-4", src: boy4, label: "Coder", gender: "male" },
  { key: "boy-5", src: boy5, label: "Pro", gender: "male" },
  { key: "girl-1", src: girl1, label: "Student", gender: "female" },
  { key: "girl-2", src: girl2, label: "Athlete", gender: "female" },
  { key: "girl-3", src: girl3, label: "Creative", gender: "female" },
  { key: "girl-4", src: girl4, label: "Coder", gender: "female" },
  { key: "girl-5", src: girl5, label: "Pro", gender: "female" },
];

export function getAvatarSrc(key?: string | null): string | null {
  if (!key) return null;
  return AVATAR_PRESETS.find((a) => a.key === key)?.src ?? null;
}

export function defaultAvatarKeyForGender(gender: Gender | null | undefined): string | null {
  if (gender === "male") return "boy-1";
  if (gender === "female") return "girl-1";
  return null;
}
