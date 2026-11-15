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
  kadan: {
    src: "/art/heroes/kadan.webp",
    source: "사용자가 2026-11-15 다시 첨부한 5장 중 1번: 카단",
    usageNote,
    portraitPosition: "50% 22%",
  },
  galatur: {
    src: "/art/heroes/galatur.webp",
    source: "사용자가 2026-11-15 다시 첨부한 5장 중 2번: 갈라투르",
    usageNote,
    portraitPosition: "50% 30%",
  },
  delain_arman: {
    src: "/art/heroes/delain_arman.webp",
    source: "사용자가 2026-11-15 다시 첨부한 5장 중 3번: 데런 아만",
    usageNote,
    portraitPosition: "50% 25%",
  },
  luterra: {
    src: "/art/heroes/luterra.webp",
    source: "사용자가 2026-11-15 다시 첨부한 5장 중 4번: 루테란",
    usageNote,
    portraitPosition: "50% 22%",
  },
  valtan: {
    src: "/art/heroes/valtan.webp",
    source: "사용자가 2026-11-15 다시 첨부한 5장 중 5번: 발탄",
    usageNote,
    portraitPosition: "50% 29%",
  },
  echidna: {
    src: "/art/heroes/echidna.webp",
    source: "사용자 제공 15장 중 11번: 에키드나 (2026-11-15)",
    usageNote,
    portraitPosition: "50% 26%",
  },
  akkan: {
    src: "/art/heroes/akkan.webp",
    source: "사용자 제공 15장 중 12번: 일리아칸 (2026-11-15)",
    usageNote,
    portraitPosition: "50% 22%",
  },
  kharmine: {
    src: "/art/heroes/kharmine.webp",
    source: "사용자 제공 15장 중 13번: 카마인 (2026-11-15)",
    usageNote,
    portraitPosition: "50% 21%",
  },
  kamen: {
    src: "/art/heroes/kamen.webp",
    source: "사용자 제공 15장 중 14번: 카멘 (2026-11-15)",
    usageNote,
    portraitPosition: "50% 30%",
  },
  kakul_saydon: {
    src: "/art/heroes/kakul_saydon.webp",
    source: "사용자 제공 15장 중 15번: 쿠크세이튼 (2026-11-15)",
    usageNote,
    portraitPosition: "50% 29%",
  },
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
