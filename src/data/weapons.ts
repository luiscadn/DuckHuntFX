/**
 * Weapons. The pistol is always available; the rest unlock once you have bagged
 * enough ducks across all your games (lifetime counter in data/achievements.ts),
 * and can also be bought early in the between-level shop.
 */

import { StoreKeys } from "../constants";
import { load, save } from "./store";

export type WeaponId = "pistol" | "shotgun" | "rifle" | "smg";

export interface Weapon {
  id: WeaponId;
  label: string;
  desc: string;
  magazine: number;
  reloadMs: number;
  /** shots per trigger pull */
  pellets: number;
  /** cone half-angle in degrees for multi-pellet weapons */
  spreadDeg: number;
  /** random aim error in px (0 = pinpoint) */
  wobble: number;
  /** ms between shots */
  fireCooldownMs: number;
  /** one-shots armored ducks and adds a point bonus */
  heavy: boolean;
  shake: number;
  /** lifetime ducks needed to unlock (0 = from the start) */
  unlockAt: number;
  shopCost: number;
}

export const WEAPONS: Record<WeaponId, Weapon> = {
  pistol: {
    id: "pistol", label: "Pistola", desc: "Fiable. Cargador 3.",
    magazine: 3, reloadMs: 650, pellets: 1, spreadDeg: 0, wobble: 0,
    fireCooldownMs: 130, heavy: false, shake: 0.004, unlockAt: 0, shopCost: 0,
  },
  shotgun: {
    id: "shotgun", label: "Escopeta", desc: "5 perdigones en abanico.",
    magazine: 2, reloadMs: 950, pellets: 5, spreadDeg: 12, wobble: 0,
    fireCooldownMs: 260, heavy: false, shake: 0.010, unlockAt: 60, shopCost: 8,
  },
  rifle: {
    id: "rifle", label: "Rifle", desc: "Pegada fuerte, atraviesa blindados.",
    magazine: 4, reloadMs: 800, pellets: 1, spreadDeg: 0, wobble: 0,
    fireCooldownMs: 320, heavy: true, shake: 0.008, unlockAt: 150, shopCost: 10,
  },
  smg: {
    id: "smg", label: "Metralleta", desc: "Cargador 12, dispara rapidísimo.",
    magazine: 12, reloadMs: 1000, pellets: 1, spreadDeg: 0, wobble: 10,
    fireCooldownMs: 80, heavy: false, shake: 0.003, unlockAt: 300, shopCost: 12,
  },
};

export const WEAPON_ORDER: WeaponId[] = ["pistol", "shotgun", "rifle", "smg"];

interface WeaponStore {
  equipped: WeaponId;
  bought: WeaponId[]; // unlocked via the shop before hitting the lifetime threshold
}

const read = (): WeaponStore => load<WeaponStore>(StoreKeys.weapons, { equipped: "pistol", bought: [] });
const write = (s: WeaponStore): void => save(StoreKeys.weapons, s);

export function isWeaponUnlocked(id: WeaponId, lifetimeDucks: number): boolean {
  if (WEAPONS[id].unlockAt === 0) return true;
  if (lifetimeDucks >= WEAPONS[id].unlockAt) return true;
  return read().bought.includes(id);
}

export function unlockWeapon(id: WeaponId): void {
  const s = read();
  if (!s.bought.includes(id)) s.bought.push(id);
  write(s);
}

export function equippedWeapon(): Weapon {
  return WEAPONS[read().equipped] ?? WEAPONS.pistol;
}

export function equipWeapon(id: WeaponId): void {
  write({ ...read(), equipped: id });
}
