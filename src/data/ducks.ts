/**
 * Duck varieties. Each spawn rolls a kind from a level-weighted table.
 *
 *   normal   the baseline mallard
 *   fast     small, quick, jittery — worth more
 *   armored  steel-plated, takes two hits
 *   golden   rare jackpot — huge points + a burst of slow-motion
 *   bomb     shoot it to blow up nearby ducks; letting it escape hurts twice as much
 *   pinata   pop it for a shower of coins (and sometimes a power-up refresh)
 *   decoy    a rubber duck — do NOT shoot it, that costs points and the combo
 *   pigeon   quick flying bird, worth a bit more than a duck
 *   fox      runs along the ground, fast and slippery, high points
 *   bear     lumbers along the ground, takes 3 hits, big score
 */

import { Palette as C } from "../art/palette";

export type DuckKindId =
  | "normal" | "fast" | "armored" | "golden" | "bomb" | "pinata" | "decoy"
  | "pigeon" | "fox" | "bear";

export interface DuckKind {
  id: DuckKindId;
  tint: number;
  /** tint shown after the first (non-lethal) hit — armored only */
  hurtTint?: number;
  scale: number;
  /** multiplies the level's rolled speed */
  speedMul: number;
  /** hits required to bag it */
  hp: number;
  /** score multiplier applied on top of combo + power-ups */
  pointsMul: number;
  /** lives lost if it escapes */
  escapePenalty: number;
  sparkle?: boolean;
  pulse?: boolean;
  slowmoOnBag?: boolean;
  explodeOnBag?: boolean;
  dropsLoot?: boolean;
  /** not a real target: shooting it is punished */
  isDecoy?: boolean;
  /** runs along the grass instead of flying (fox, bear) */
  isGround?: boolean;
  /** distinct spritesheet key + run/flap anim; defaults to the mallard */
  sheet?: string;
  label?: string;
}

export const DUCK_KINDS: Record<DuckKindId, DuckKind> = {
  normal: { id: "normal", tint: 0xffffff, scale: 1, speedMul: 1, hp: 1, pointsMul: 1, escapePenalty: 1 },
  fast: { id: "fast", tint: 0x9fd8ff, scale: 0.78, speedMul: 1.7, hp: 1, pointsMul: 2, escapePenalty: 1, label: "RÁPIDO" },
  armored: {
    id: "armored",
    tint: 0x9aa0ad,
    hurtTint: 0xd9dce2,
    scale: 1.14,
    speedMul: 0.82,
    hp: 2,
    pointsMul: 3,
    escapePenalty: 1,
    label: "BLINDADO",
  },
  golden: {
    id: "golden",
    tint: C.gold,
    scale: 1.05,
    speedMul: 1.25,
    hp: 1,
    pointsMul: 10,
    escapePenalty: 1,
    sparkle: true,
    slowmoOnBag: true,
    label: "¡DORADO!",
  },
  bomb: {
    id: "bomb",
    tint: 0xff6b5a,
    scale: 1.08,
    speedMul: 0.95,
    hp: 1,
    pointsMul: 1,
    escapePenalty: 2,
    pulse: true,
    explodeOnBag: true,
    label: "BOMBA",
  },
  pinata: {
    id: "pinata",
    tint: 0xff5fb0,
    scale: 1.05,
    speedMul: 1.1,
    hp: 1,
    pointsMul: 1,
    escapePenalty: 1,
    dropsLoot: true,
    label: "¡PIÑATA!",
  },
  decoy: {
    id: "decoy",
    tint: 0xffffff,
    scale: 0.9,
    speedMul: 0.5,
    hp: 1,
    pointsMul: 0,
    escapePenalty: 0,
    isDecoy: true,
    label: "SEÑUELO",
  },
  pigeon: {
    id: "pigeon",
    tint: 0xffffff,
    scale: 0.95,
    speedMul: 1.45,
    hp: 1,
    pointsMul: 2,
    escapePenalty: 1,
    sheet: "pigeon",
    label: "PALOMA",
  },
  fox: {
    id: "fox",
    tint: 0xffffff,
    scale: 1,
    speedMul: 1.6,
    hp: 1,
    pointsMul: 3,
    escapePenalty: 1,
    isGround: true,
    sheet: "fox",
    label: "ZORRO",
  },
  bear: {
    id: "bear",
    tint: 0xffffff,
    scale: 1.35,
    speedMul: 0.5,
    hp: 3,
    pointsMul: 6,
    escapePenalty: 0,
    isGround: true,
    sheet: "bear",
    label: "OSO",
  },
};

/** Spawn weights per level. Missing kinds simply never appear that level. */
const TABLE: Record<number, Partial<Record<DuckKindId, number>>> = {
  1: { normal: 82, pinata: 8, pigeon: 10 },
  2: { normal: 56, fast: 14, pinata: 8, decoy: 6, pigeon: 12, fox: 6, golden: 2 },
  3: { normal: 42, fast: 16, armored: 10, pinata: 7, decoy: 6, pigeon: 12, fox: 8, bear: 4, golden: 3 },
  4: { normal: 32, fast: 17, armored: 13, bomb: 8, pinata: 6, decoy: 5, pigeon: 12, fox: 9, bear: 5, golden: 3 },
  5: { normal: 24, fast: 17, armored: 15, bomb: 12, pinata: 5, decoy: 5, pigeon: 12, fox: 10, bear: 6, golden: 6 },
};

export function pickDuckKind(level: number): DuckKind {
  const weights = TABLE[Math.min(Math.max(level, 1), 5)] ?? TABLE[5];
  const entries = Object.entries(weights) as Array<[DuckKindId, number]>;
  const total = entries.reduce((s, [, w]) => s + w, 0);
  let roll = Math.random() * total;
  for (const [id, w] of entries) {
    roll -= w;
    if (roll <= 0) return DUCK_KINDS[id];
  }
  return DUCK_KINDS.normal;
}
