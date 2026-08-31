/** Player settings (difficulty, screen shake, audio) persisted to localStorage. */

import { StoreKeys } from "../constants";
import { load, save } from "./store";

export type Difficulty = "relax" | "normal" | "dura";

export interface Settings {
  difficulty: Difficulty;
  shake: boolean;
  music: boolean;
  sfx: boolean;
}

const DEFAULTS: Settings = { difficulty: "normal", shake: true, music: true, sfx: true };

export function getSettings(): Settings {
  return { ...DEFAULTS, ...load<Partial<Settings>>(StoreKeys.settings, {}) };
}

export function patchSettings(patch: Partial<Settings>): Settings {
  const next = { ...getSettings(), ...patch };
  save(StoreKeys.settings, next);
  return next;
}

export interface DifficultyMods {
  label: string;
  blurb: string;
  livesBonus: number;
  maxAliveBonus: number;
  speedMul: number;
  spawnMul: number; // >1 = ducks spawn less often
  comboWindowMul: number;
  scoreMul: number;
  escapeCostsLife: boolean;
}

export const DIFFICULTY: Record<Difficulty, DifficultyMods> = {
  relax: {
    label: "RELAX",
    blurb: "Más vidas, patos lentos, los escapes no quitan vida.",
    livesBonus: 2,
    maxAliveBonus: 0,
    speedMul: 0.8,
    spawnMul: 1.3,
    comboWindowMul: 1.7,
    scoreMul: 0.85,
    escapeCostsLife: false,
  },
  normal: {
    label: "NORMAL",
    blurb: "La experiencia equilibrada.",
    livesBonus: 0,
    maxAliveBonus: 0,
    speedMul: 1,
    spawnMul: 1,
    comboWindowMul: 1,
    scoreMul: 1,
    escapeCostsLife: true,
  },
  dura: {
    label: "DURA",
    blurb: "Menos vidas, patos veloces, más puntos.",
    livesBonus: -1,
    maxAliveBonus: 1,
    speedMul: 1.28,
    spawnMul: 0.72,
    comboWindowMul: 0.72,
    scoreMul: 1.35,
    escapeCostsLife: true,
  },
};

export const mods = (): DifficultyMods => DIFFICULTY[getSettings().difficulty];
