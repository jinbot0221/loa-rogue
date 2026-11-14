import type { HeroId } from "@loa/shared";
/** Add converted local WebP/PNG paths only after the user supplies the reference artwork. */
export interface HeroArtwork {
  src: string;
  source: string;
  credit?: string;
  usageNote: string;
}
export const HERO_ARTWORK: Partial<Record<HeroId, HeroArtwork>> = {};
