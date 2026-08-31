/**
 * Permanent upgrades bought once with bank coins in the shop and applied to
 * every run. Deliberately expensive with steep scaling so clearing the game is
 * a grind, not a quick unlock.
 */

import { StoreKeys } from "../constants";
import { load, save } from "./store";
import { bankSpend } from "./bank";

export type UpgradeId = "life" | "mag" | "reload" | "aim";

interface Def {
  id: UpgradeId;
  name: string;
  desc: string;
  max: number;
  base: number;
  growth: number; // cost multiplier per level owned
}

export const UPGRADE_DEFS: Def[] = [
  { id: "life", name: "Vida máxima", desc: "+1 al máximo de vidas", max: 4, base: 600, growth: 2.4 },
  { id: "mag", name: "Cargador", desc: "+1 bala por cargador", max: 4, base: 450, growth: 2.3 },
  { id: "reload", name: "Recarga rápida", desc: "-25% tiempo de recarga", max: 3, base: 900, growth: 2.6 },
  { id: "aim", name: "Mira ancha", desc: "Hitbox de disparo más grande", max: 3, base: 750, growth: 2.6 },
];

type Owned = Record<UpgradeId, number>;
const EMPTY: Owned = { life: 0, mag: 0, reload: 0, aim: 0 };

const read = (): Owned => ({ ...EMPTY, ...load<Partial<Owned>>(StoreKeys.upgrades, {}) });
const write = (o: Owned): void => save(StoreKeys.upgrades, o);

export function upgradeLevel(id: UpgradeId): number {
  return read()[id];
}

/** null = maxed out. */
export function upgradeCost(id: UpgradeId): number | null {
  const def = UPGRADE_DEFS.find((d) => d.id === id)!;
  const n = read()[id];
  if (n >= def.max) return null;
  return Math.round(def.base * Math.pow(def.growth, n));
}

export function buyUpgrade(id: UpgradeId): boolean {
  const cost = upgradeCost(id);
  if (cost === null || !bankSpend(cost)) return false;
  const o = read();
  o[id] += 1;
  write(o);
  return true;
}

/** What GameScene applies at the start of a run. */
export function upgradeEffects(): { extraLives: number; magBonus: number; reloadMul: number; aimPad: number } {
  const o = read();
  return {
    extraLives: o.life,
    magBonus: o.mag,
    reloadMul: Math.pow(0.75, o.reload),
    aimPad: o.aim * 9,
  };
}
