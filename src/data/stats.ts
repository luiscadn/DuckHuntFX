/**
 * Lifetime statistics, shown on the Stats screen. Shares the `dh:stats` key with
 * achievements.ts (which only touches `.ducks`), so extra fields are preserved.
 */

import { StoreKeys } from "../constants";
import { load, save } from "./store";
import type { DuckKindId } from "./ducks";
import type { WeaponId } from "./weapons";

export interface LifetimeStats {
  ducks: number;
  runs: number;
  wins: number;
  shots: number;
  hits: number;
  playtimeMs: number;
  bestScore: number;
  bestCombo: number;
  decoysHit: number;
  pinatas: number;
  frenzies: number;
  rampages: number;
  byKind: Partial<Record<DuckKindId, number>>;
  byWeapon: Partial<Record<WeaponId, number>>;
}

const EMPTY: LifetimeStats = {
  ducks: 0, runs: 0, wins: 0, shots: 0, hits: 0, playtimeMs: 0,
  bestScore: 0, bestCombo: 0, decoysHit: 0, pinatas: 0, frenzies: 0, rampages: 0,
  byKind: {}, byWeapon: {},
};

export function getStats(): LifetimeStats {
  return { ...EMPTY, ...load<Partial<LifetimeStats>>(StoreKeys.stats, {}) };
}

export interface RunSummary {
  score: number;
  win: boolean;
  level: number;
  maxCombo: number;
  shots: number;
  hits: number;
  playtimeMs: number;
  decoysHit: number;
  pinatas: number;
  frenzies: number;
  rampages: number;
  ducksByKind: Partial<Record<DuckKindId, number>>;
  weapon: WeaponId;
}

/** Fold a finished run into the lifetime totals. */
export function recordRunStats(r: RunSummary): void {
  const s = getStats();
  s.runs += 1;
  if (r.win) s.wins += 1;
  s.shots += r.shots;
  s.hits += r.hits;
  s.playtimeMs += r.playtimeMs;
  s.bestScore = Math.max(s.bestScore, r.score);
  s.bestCombo = Math.max(s.bestCombo, r.maxCombo);
  s.decoysHit += r.decoysHit;
  s.pinatas += r.pinatas;
  s.frenzies += r.frenzies;
  s.rampages += r.rampages;
  for (const [k, n] of Object.entries(r.ducksByKind)) {
    s.byKind[k as DuckKindId] = (s.byKind[k as DuckKindId] ?? 0) + (n ?? 0);
  }
  s.byWeapon[r.weapon] = (s.byWeapon[r.weapon] ?? 0) + r.hits;
  save(StoreKeys.stats, s);
}

export function favouriteWeapon(): WeaponId | null {
  const by = getStats().byWeapon;
  let best: WeaponId | null = null;
  let n = -1;
  for (const [w, c] of Object.entries(by)) {
    if ((c ?? 0) > n) {
      n = c ?? 0;
      best = w as WeaponId;
    }
  }
  return n > 0 ? best : null;
}

export function accuracyPct(): number {
  const s = getStats();
  return s.shots ? Math.round((s.hits / s.shots) * 100) : 0;
}
