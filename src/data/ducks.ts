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
 */

import { Palette as C } from "../art/palette";

export type DuckKindId = "normal" | "fast" | "armored" | "golden" | "bomb" | "pinata" | "decoy";

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
};

/** Spawn weights per level. Missing kinds simply never appear that level. */
const TABLE: Record<number, Partial<Record<DuckKindId, number>>> = {
  1: { normal: 92, pinata: 8 },
  2: { normal: 68, fast: 15, pinata: 9, decoy: 6, golden: 2 },
  3: { normal: 52, fast: 18, armored: 12, pinata: 8, decoy: 7, golden: 3 },
  4: { normal: 40, fast: 20, armored: 15, bomb: 9, pinata: 7, decoy: 6, golden: 3 },
  5: { normal: 32, fast: 20, armored: 17, bomb: 13, pinata: 6, decoy: 6, golden: 6 },
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
