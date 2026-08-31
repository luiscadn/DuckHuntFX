/** High-score board — recent runs plus a best-per-player leaderboard. */

import { StoreKeys } from "../constants";
import { load, save } from "./store";
import { listAccounts } from "./accounts";

export interface RunEntry {
  name: string;
  score: number;
  level: number;
  date: number;
}

const MAX_RUNS = 60;

export function recordRun(entry: RunEntry): void {
  const runs = load<RunEntry[]>(StoreKeys.scores, []);
  runs.push(entry);
  runs.sort((a, b) => b.date - a.date);
  save(StoreKeys.scores, runs.slice(0, MAX_RUNS));
}

export function recentRuns(n = 8): RunEntry[] {
  return load<RunEntry[]>(StoreKeys.scores, [])
    .slice()
    .sort((a, b) => b.date - a.date)
    .slice(0, n);
}

export interface LeaderRow {
  name: string;
  score: number;
  level: number;
}

/** Best score per player, taken from account profiles, high to low. */
export function leaderboard(n = 10): LeaderRow[] {
  return listAccounts()
    .filter((a) => a.games > 0)
    .map((a) => ({ name: a.name, score: a.bestScore, level: a.bestLevel }))
    .sort((a, b) => b.score - a.score)
    .slice(0, n);
}
