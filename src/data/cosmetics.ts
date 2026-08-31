/**
 * Cosmetics bought with bank coins in the meta-shop. Purely visual:
 *   crosshair — the reticle sprite used in the game
 *   hat       — worn by the crocodile when it surfaces
 *   theme     — the HUD accent colour
 */

import { StoreKeys } from "../constants";
import { load, save } from "./store";
import { bankSpend } from "./bank";

export type CosmeticSlot = "crosshair" | "hat" | "theme";

export interface CosmeticDef {
  id: string;
  name: string;
  price: number;
  accent?: number; // theme only
}

export const COSMETICS: Record<CosmeticSlot, CosmeticDef[]> = {
  crosshair: [
    { id: "classic", name: "Clásica", price: 0 },
    { id: "dot", name: "Punto verde", price: 30 },
    { id: "ring", name: "Retícula dorada", price: 60 },
    { id: "skull", name: "Calavera", price: 90 },
  ],
  hat: [
    { id: "none", name: "Sin sombrero", price: 0 },
    { id: "top", name: "Chistera", price: 40 },
    { id: "party", name: "Gorro de fiesta", price: 40 },
    { id: "crown", name: "Corona", price: 120 },
  ],
  theme: [
    { id: "gold", name: "Oro (clásico)", price: 0, accent: 0xffd447 },
    { id: "cyan", name: "Cian", price: 25, accent: 0x5ec8f2 },
    { id: "crimson", name: "Carmesí", price: 25, accent: 0xe0563a },
    { id: "mint", name: "Menta", price: 25, accent: 0x74d3a0 },
  ],
};

interface CosmeticStore {
  owned: string[];
  equipped: Record<CosmeticSlot, string>;
}

const DEFAULTS: CosmeticStore = {
  owned: ["classic", "none", "gold"],
  equipped: { crosshair: "classic", hat: "none", theme: "gold" },
};

const read = (): CosmeticStore => {
  const s = load<CosmeticStore>(StoreKeys.cosmetics, DEFAULTS);
  // make sure the free defaults are always considered owned
  for (const id of DEFAULTS.owned) if (!s.owned.includes(id)) s.owned.push(id);
  return s;
};
const write = (s: CosmeticStore): void => save(StoreKeys.cosmetics, s);

export function cosmeticOwned(id: string): boolean {
  return read().owned.includes(id);
}

export function equippedCosmetic(slot: CosmeticSlot): string {
  return read().equipped[slot] ?? DEFAULTS.equipped[slot];
}

export function equipCosmetic(slot: CosmeticSlot, id: string): void {
  const s = read();
  if (!s.owned.includes(id)) return;
  s.equipped[slot] = id;
  write(s);
}

/** Buy + auto-equip. Returns true on success. */
export function buyCosmetic(slot: CosmeticSlot, id: string): boolean {
  const s = read();
  if (s.owned.includes(id)) {
    s.equipped[slot] = id;
    write(s);
    return true;
  }
  const def = COSMETICS[slot].find((c) => c.id === id);
  if (!def || !bankSpend(def.price)) return false;
  s.owned.push(id);
  s.equipped[slot] = id;
  write(s);
  return true;
}

export function themeAccent(): number {
  const id = equippedCosmetic("theme");
  return COSMETICS.theme.find((t) => t.id === id)?.accent ?? 0xffd447;
}

export function ownedCount(): number {
  return read().owned.length;
}
