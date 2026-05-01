import * as React from "react";
import { cn } from "@/lib/utils";
import { getAvatarSrc } from "@/lib/avatars";
import type { Profile } from "@/lib/profile";

type Props = {
  profile?: Profile | null;
  name?: string | null;
  size?: number;
  className?: string;
  ring?: boolean;
};

export function UserAvatar({ profile, name, size = 36, className, ring }: Props) {
  const src = profile?.avatar_url || getAvatarSrc(profile?.avatar_key);
  const initial = (profile?.display_name || name || "F").trim()[0]?.toUpperCase() ?? "F";

  return (
    <div
      className={cn(
        "relative inline-grid place-items-center overflow-hidden rounded-full shrink-0 select-none",
        ring && "ring-2 ring-primary/40 ring-offset-2 ring-offset-background",
        className,
      )}
      style={{ height: size, width: size }}
    >
      {src ? (
        <img
          src={src}
          alt={profile?.display_name || name || "Avatar"}
          width={size}
          height={size}
          loading="lazy"
          className="h-full w-full object-cover"
        />
      ) : (
        <div
          className="h-full w-full grid place-items-center font-display font-bold text-white"
          style={{
            backgroundImage:
              "linear-gradient(135deg, oklch(0.62 0.22 295), oklch(0.7 0.2 320))",
            fontSize: Math.max(12, size * 0.42),
          }}
        >
          {initial}
        </div>
      )}
    </div>
  );
}
