import type { HeroId } from "@loa/shared";
export interface HeroArtwork {
  src: string;
  source: string;
  credit?: string;
  usageNote: string;
  portraitPosition?: string;
}
const source = "사용자가 이 채팅에 첨부한 참고 이미지 (2026-11-14)";
const usageNote =
  "제공 참고 이미지의 특징을 바탕으로 이미지 생성 도구로 다시 그린 SD 파생 아트. 구체적인 원본 사용권 조건은 별도 미기재.";
export const HERO_ARTWORK: Partial<Record<HeroId, HeroArtwork>> = {
  wei: {
    src: "/art/heroes/wei.webp",
    source,
    usageNote,
    portraitPosition: "50% 26%",
  },
  nineveh: {
    src: "/art/heroes/nineveh.webp",
    source,
    usageNote,
    portraitPosition: "50% 32%",
  },
  thirain: {
    src: "/art/heroes/thirain.webp",
    source,
    usageNote,
    portraitPosition: "50% 16%",
  },
  azena_inanna: {
    src: "/art/heroes/azena_inanna.webp",
    source,
    usageNote,
    portraitPosition: "50% 30%",
  },
  shandi: {
    src: "/art/heroes/shandi.webp",
    source,
    usageNote,
    portraitPosition: "50% 25%",
  },
  balthorr: {
    src: "/art/heroes/balthorr.webp",
    source,
    usageNote,
    portraitPosition: "50% 28%",
  },
};
