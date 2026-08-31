/**
 * Logros. Definitions + persistence + a per-run tracker that decides when each
 * one is earned. Unlock state lives in localStorage and is shared across runs.
 */

import { StoreKeys } from "../constants";
import { load, save } from "./store";
import type { DuckKindId } from "./ducks";

export interface AchievementDef {
  id: string;
  title: string;
  desc: string;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: "first_blood", title: "Primer pato", desc: "Baga tu primer pato" },
  { id: "speed_demon", title: "Reflejos", desc: "Baga un pato rápido" },
  { id: "armor_piercer", title: "Perforante", desc: "Baga un pato blindado" },
  { id: "demolition", title: "Demolición", desc: "Revienta un pato bomba" },
  { id: "golden_goose", title: "Toque de Midas", desc: "Caza un pato dorado" },
  { id: "combo_10", title: "En racha", desc: "10 aciertos seguidos" },
  { id: "combo_20", title: "Imparable", desc: "20 aciertos seguidos" },
  { id: "sharpshooter", title: "Ojo de halcón", desc: "Supera un nivel sin fallar un tiro" },
  { id: "iron_nerves", title: "Sin recargar", desc: "Supera un nivel sin quedarte sin balas" },
  { id: "untouchable", title: "Intocable", desc: "Supera un nivel sin perder vidas" },
  { id: "score_5k", title: "5.000", desc: "Haz 5.000 puntos en una partida" },
  { id: "score_15k", title: "15.000", desc: "Haz 15.000 puntos en una partida" },
  { id: "veteran", title: "Veterano", desc: "Llega al nivel 5" },
  { id: "champion", title: "Leyenda", desc: "Completa los 5 niveles" },
  { id: "centurion", title: "Centenar", desc: "Caza 100 patos en total" },
];

type UnlockMap = Record<string, { at: number }>;
interface LifetimeStats {
  ducks: number;
}

const readUnlocks = (): UnlockMap => load<UnlockMap>(StoreKeys.achievements, {});
const readStats = (): LifetimeStats => load<LifetimeStats>(StoreKeys.stats, { ducks: 0 });

export function isUnlocked(id: string): boolean {
  return !!readUnlocks()[id];
}

export function unlockedCount(): number {
  return Object.keys(readUnlocks()).length;
}

export function achievementList(): Array<AchievementDef & { unlocked: boolean; at: number }> {
  const u = readUnlocks();
  return ACHIEVEMENTS.map((a) => ({ ...a, unlocked: !!u[a.id], at: u[a.id]?.at ?? 0 }));
}

/** Returns true only the first time an id is unlocked. */
function unlock(id: string): boolean {
  const u = readUnlocks();
  if (u[id]) return false;
  u[id] = { at: Date.now() };
  save(StoreKeys.achievements, u);
  return true;
}

export function lifetimeDucks(): number {
  return readStats().ducks;
}

function addLifetimeDucks(n: number): number {
  const s = readStats();
  s.ducks += n;
  save(StoreKeys.stats, s);
  return s.ducks;
}

/**
 * One instance per run. GameScene calls the hooks; `onUnlock` fires once per
 * newly earned achievement (used to show the toast + play the jingle).
 */
export class RunTracker {
  private levelClean = true; // no missed shots this level
  private levelNoEmpty = true; // magazine never hit 0 this level
  private levelNoDamage = true; // no lives lost this level

  /** Achievements earned during this run (for the game-over summary). */
  readonly earned: AchievementDef[] = [];

  constructor(private readonly onUnlock: (def: AchievementDef) => void) {}

  private fire(id: string): void {
    if (unlock(id)) {
      const def = ACHIEVEMENTS.find((a) => a.id === id);
      if (def) {
        this.earned.push(def);
        this.onUnlock(def);
      }
    }
  }

  bag(kind: DuckKindId, runCombo: number, runScore: number): void {
    const total = addLifetimeDucks(1);
    this.fire("first_blood");
    if (total >= 100) this.fire("centurion");

    if (kind === "fast") this.fire("speed_demon");
    if (kind === "armored") this.fire("armor_piercer");
    if (kind === "bomb") this.fire("demolition");
    if (kind === "golden") this.fire("golden_goose");

    if (runCombo >= 10) this.fire("combo_10");
    if (runCombo >= 20) this.fire("combo_20");

    if (runScore >= 5000) this.fire("score_5k");
    if (runScore >= 15000) this.fire("score_15k");
  }

  missedShot(): void {
    this.levelClean = false;
  }
  ranDry(): void {
    this.levelNoEmpty = false;
  }
  lostLife(): void {
    this.levelNoDamage = false;
  }

  levelCleared(): void {
    if (this.levelClean) this.fire("sharpshooter");
    if (this.levelNoEmpty) this.fire("iron_nerves");
    if (this.levelNoDamage) this.fire("untouchable");
    this.resetLevel();
  }

  resetLevel(): void {
    this.levelClean = true;
    this.levelNoEmpty = true;
    this.levelNoDamage = true;
  }

  gameEnded(win: boolean, level: number): void {
    if (level >= 5) this.fire("veteran");
    if (win) this.fire("champion");
  }
}
