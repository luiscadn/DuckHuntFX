/**
 * Duck varieties. Each spawn rolls a kind from a level-weighted table.
 *
 *   normal   the baseline mallard
 *   fast     small, quick, jittery — worth more
 *   armored  steel-plated, takes two hits
 *   golden   rare jackpot — huge points + a burst of slow-motion
 *   bomb     shoot it to blow up nearby ducks; letting it escape hurts twice as much
 */

import { Palette as C } from "../art/palette";

export type DuckKindId = "normal" | "fast" | "armored" | "golden" | "bomb";

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
};

/** Spawn weights per level. Missing kinds simply never appear that level. */
const TABLE: Record<number, Partial<Record<DuckKindId, number>>> = {
  1: { normal: 100 },
  2: { normal: 80, fast: 17, golden: 3 },
  3: { normal: 64, fast: 20, armored: 13, golden: 3 },
  4: { normal: 50, fast: 22, armored: 16, bomb: 9, golden: 3 },
  5: { normal: 40, fast: 22, armored: 18, bomb: 14, golden: 6 },
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
