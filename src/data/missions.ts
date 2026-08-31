/**
 * Missions: three at a time. Progress accumulates across runs; completing one
 * pays bank coins and rolls a fresh mission into that slot.
 */

import { StoreKeys } from "../constants";
import { load, save } from "./store";
import { bankDeposit } from "./bank";
import type { RunSummary } from "./stats";

type Accrual = "sum" | "best";

interface Spec {
  text: string;
  target: number;
  reward: number;
  accrual: Accrual;
  arg: number; // the randomised parameter, used by valueFor
}

const rnd = (a: number, b: number) => a + Math.floor(Math.random() * (b - a + 1));

const TEMPLATES: Record<string, () => Spec> = {
  golden: () => {
    const t = rnd(3, 6);
    return { text: `Caza ${t} patos dorados`, target: t, reward: 35, accrual: "sum", arg: t };
  },
  pinata: () => {
    const t = rnd(4, 8);
    return { text: `Revienta ${t} piñatas`, target: t, reward: 25, accrual: "sum", arg: t };
  },
  combo: () => {
    const t = rnd(12, 24);
    return { text: `Alcanza un combo de ${t}`, target: t, reward: 40, accrual: "best", arg: t };
  },
  accuracy: () => {
    const t = rnd(70, 85);
    return { text: `Termina una partida con ${t}% de puntería`, target: 1, reward: 35, accrual: "sum", arg: t };
  },
  "no-decoy": () => {
    const t = rnd(3, 5);
    return { text: `Completa ${t} partidas sin dispararle a un señuelo`, target: t, reward: 30, accrual: "sum", arg: t };
  },
  rampage: () => {
    const t = rnd(2, 4);
    return { text: `Suelta al cocodrilo ${t} veces`, target: t, reward: 30, accrual: "sum", arg: t };
  },
  frenzy: () => {
    const t = rnd(3, 6);
    return { text: `Activa ${t} frenesíes`, target: t, reward: 25, accrual: "sum", arg: t };
  },
  score: () => {
    const t = rnd(6, 18) * 1000;
    return { text: `Haz ${t.toLocaleString("es")} puntos en una partida`, target: t, reward: 50, accrual: "best", arg: t };
  },
  boss: () => {
    const t = rnd(2, 4);
    return { text: `Llega al jefe final ${t} veces`, target: t, reward: 40, accrual: "sum", arg: t };
  },
};

const KEYS = Object.keys(TEMPLATES);

export interface Mission {
  key: string;
  text: string;
  target: number;
  reward: number;
  accrual: Accrual;
  arg: number;
  progress: number;
  done: boolean;
}

interface MissionStore {
  active: Mission[];
}

function roll(exclude: string[]): Mission {
  const pool = KEYS.filter((k) => !exclude.includes(k));
  const key = (pool.length ? pool : KEYS)[Math.floor(Math.random() * (pool.length || KEYS.length))];
  const s = TEMPLATES[key]();
  return { key, ...s, progress: 0, done: false };
}

function fresh(): MissionStore {
  const active: Mission[] = [];
  while (active.length < 3) active.push(roll(active.map((a) => a.key)));
  return { active };
}

const read = (): MissionStore => {
  const s = load<MissionStore>(StoreKeys.missions, fresh());
  if (!Array.isArray(s.active) || s.active.length < 3) return fresh();
  return s;
};
const write = (s: MissionStore): void => save(StoreKeys.missions, s);

export function activeMissions(): Mission[] {
  return read().active;
}

function valueFor(m: Mission, r: RunSummary): number {
  switch (m.key) {
    case "golden": return r.ducksByKind.golden ?? 0;
    case "pinata": return r.pinatas;
    case "combo": return r.maxCombo;
    case "accuracy": return r.shots >= 15 && (r.hits / r.shots) * 100 >= m.arg ? 1 : 0;
    case "no-decoy": return r.decoysHit === 0 && r.shots >= 15 ? 1 : 0;
    case "rampage": return r.rampages;
    case "frenzy": return r.frenzies;
    case "score": return r.score;
    case "boss": return r.level >= 5 ? 1 : 0;
    default: return 0;
  }
}

/** Apply a finished run; pay + reroll completed missions. Returns the completed texts. */
export function applyRunToMissions(r: RunSummary): string[] {
  const s = read();
  const completed: string[] = [];
  for (const m of s.active) {
    if (m.done) continue;
    const v = valueFor(m, r);
    m.progress = m.accrual === "best" ? Math.max(m.progress, v) : m.progress + v;
    if (m.progress >= m.target) {
      m.done = true;
      bankDeposit(m.reward);
      completed.push(m.text);
    }
  }
  s.active = s.active.map((m) => (m.done ? roll(s.active.map((a) => a.key)) : m));
  write(s);
  return completed;
}
