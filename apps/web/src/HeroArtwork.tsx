import { useState, type ReactNode } from "react";
import { HEROES, type HeroId } from "@loa/shared";
import { HERO_ARTWORK } from "./art/heroes";
export function HeroArtwork({
  heroId,
  fallback,
  className = "",
  onUnavailable,
  presentation = "sprite",
}: {
  heroId: HeroId;
  fallback: ReactNode;
  className?: string;
  onUnavailable?: () => void;
  presentation?: "sprite" | "portrait";
}) {
  const [failed, setFailed] = useState(false),
    art = HERO_ARTWORK[heroId];
  if (!art || failed) return <>{fallback}</>;
  return (
    <img
      className={`hero-artwork ${presentation} ${className}`}
      style={
        presentation === "portrait"
          ? { objectPosition: art.portraitPosition ?? "50% 25%" }
          : undefined
      }
      width={1254}
      height={1254}
      decoding="async"
      src={art.src}
      alt={`${HEROES.find((h) => h.id === heroId)?.name} SD 캐릭터`}
      onError={() => {
        setFailed(true);
        onUnavailable?.();
      }}
    />
  );
}
