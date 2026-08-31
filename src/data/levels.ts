/** 100 procedurally-tuned levels, boss schedule, and the power-up config. */

import { Power, type PowerId } from "../constants";

export type TimeOfDay = "day" | "dusk" | "night";
export type BossVariant = "garza" | "jabali" | "rey";

export interface LevelDef {
  index: number;
  name: string;
  timeOfDay: TimeOfDay;
  /** cumulative total score required to clear this level */
  targetScore: number;
  spawnEveryMs: number;
  maxAlive: number;
  speed: [min: number, max: number];
  magazine: number;
  /** if set, this level is a boss fight instead of a normal wave */
  boss?: BossVariant;
}

export const LAST_LEVEL = 100;
export const BOSS_EVERY = 15; // 15, 30, 45, 60, 75, 90 → mid-bosses; 100 → final

const NAMES = [
  "Amanecer", "Rocío", "Pleno Sol", "Espadañas", "Bochorno", "Vuelo Bajo",
  "Atardecer", "Reflejo", "Ocaso", "Brumas", "Luna Llena", "Marea Alta",
  "Cañaveral", "Tormenta", "Aguas Turbias",
];

function bossFor(i: number): BossVariant | undefined {
  if (i === LAST_LEVEL) return "rey";
  if (i % BOSS_EVERY === 0) return (i / BOSS_EVERY) % 2 === 1 ? "garza" : "jabali";
  return undefined;
}

function build(i: number): LevelDef {
  const perLevel = (k: number) => 500 + 90 * k + 2 * k * k;
  let target = 0;
  for (let k = 1; k <= i; k++) target += perLevel(k);
  return {
    index: i,
    name: NAMES[(i - 1) % NAMES.length],
    timeOfDay: (["day", "day", "day", "dusk", "dusk", "night", "night"] as TimeOfDay[])[(i - 1) % 7],
    targetScore: Math.round(target),
    spawnEveryMs: Math.max(480, 1500 - 10 * i),
    maxAlive: Math.min(8, 2 + Math.floor(i / 9)),
    speed: [Math.min(300, Math.round(85 + 2.4 * i)), Math.min(400, Math.round(125 + 3 * i))],
    magazine: Math.min(8, 3 + Math.floor(i / 18)),
    boss: bossFor(i),
  };
}

const LEVELS_CACHE: LevelDef[] = Array.from({ length: LAST_LEVEL }, (_, k) => build(k + 1));

export function levelAt(index: number): LevelDef {
  return LEVELS_CACHE[Math.min(Math.max(index, 1), LAST_LEVEL) - 1];
}

export function isBossLevel(index: number): boolean {
  return !!levelAt(index).boss;
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
  const out: PowerId[] = [];
  if (level >= 2) out.push(Power.Double);
  if (level >= 3) out.push(Power.Freeze);
  if (level >= 4) out.push(Power.Clear);
  return out;
}
