/** The five levels and the power-up tuning, all in one place. */

import { Power, type PowerId } from "../constants";

export type TimeOfDay = "day" | "dusk" | "night";

export interface LevelDef {
  index: number;
  name: string;
  timeOfDay: TimeOfDay;
  /** Cumulative total score required to clear this level. */
  targetScore: number;
  spawnEveryMs: number;
  maxAlive: number;
  speed: [min: number, max: number];
  /** How many shots you get on each duck before it can escape. */
  magazine: number;
  /** Power-ups newly available from this level onward. */
  unlocks: PowerId[];
}

export const LEVELS: LevelDef[] = [
  {
    index: 1,
    name: "Amanecer",
    timeOfDay: "day",
    targetScore: 900,
    spawnEveryMs: 1500,
    maxAlive: 2,
    speed: [90, 130],
    magazine: 3,
    unlocks: [],
  },
  {
    index: 2,
    name: "Pleno Sol",
    timeOfDay: "day",
    targetScore: 2300,
    spawnEveryMs: 1300,
    maxAlive: 2,
    speed: [110, 155],
    magazine: 3,
    unlocks: [Power.Double],
  },
  {
    index: 3,
    name: "Atardecer",
    timeOfDay: "dusk",
    targetScore: 4300,
    spawnEveryMs: 1150,
    maxAlive: 3,
    speed: [130, 185],
    magazine: 4,
    unlocks: [Power.Freeze],
  },
  {
    index: 4,
    name: "Ocaso",
    timeOfDay: "dusk",
    targetScore: 7000,
    spawnEveryMs: 1000,
    maxAlive: 3,
    speed: [150, 210],
    magazine: 4,
    unlocks: [Power.Clear],
  },
  {
    index: 5,
    name: "Luna llena",
    timeOfDay: "night",
    targetScore: 10500,
    spawnEveryMs: 850,
    maxAlive: 4,
    speed: [175, 245],
    magazine: 5,
    unlocks: [Power.Double, Power.Freeze, Power.Clear],
  },
];

export const LAST_LEVEL = LEVELS.length;

export function levelAt(index: number): LevelDef {
  return LEVELS[Math.min(Math.max(index, 1), LAST_LEVEL) - 1];
}

/** Power-up behaviour. Durations in ms; cooldown starts when the effect ends. */
export const PowerConfig: Record<
  PowerId,
  { label: string; icon: string; durationMs: number; cooldownMs: number; key: string }
> = {
  [Power.Double]: { label: "Doble", icon: "pow-double", durationMs: 9000, cooldownMs: 16000, key: "1" },
  [Power.Freeze]: { label: "Freeze", icon: "pow-freeze", durationMs: 7000, cooldownMs: 18000, key: "2" },
  [Power.Clear]: { label: "Bomba", icon: "pow-clear", durationMs: 0, cooldownMs: 22000, key: "3" },
};

/** Which power-ups exist by the time you reach `level`. */
export function unlockedPowers(level: number): PowerId[] {
  const set = new Set<PowerId>();
  for (const l of LEVELS) {
    if (l.index <= level) l.unlocks.forEach((p) => set.add(p));
  }
  return [...set];
}
