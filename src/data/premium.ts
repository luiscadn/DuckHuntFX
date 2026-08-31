/**
 * Premium store — items priced in real money.
 *
 * There is NO payment integration: `requestPurchase` always returns a failure
 * explaining what would be needed (a payment provider such as Stripe or Google
 * Play Billing, plus a small backend to verify the receipt). The UI is a
 * functional mockup so the storefront can be shown and designed.
 */

import { StoreKeys } from "../constants";
import { load, save } from "./store";

export interface PremiumItem {
  id: string;
  name: string;
  desc: string;
  price: string; // display string, real money
}

export const PREMIUM_ITEMS: PremiumItem[] = [
  { id: "coins_big", name: "Cofre de 3.000 monedas", desc: "Monedas para la tienda de mejoras", price: "4,99 €" },
  { id: "all_weapons", name: "Arsenal completo", desc: "Desbloquea escopeta, rifle y metralleta", price: "6,99 €" },
  { id: "croc_gold", name: "Cocodrilo de oro", desc: "Skin dorado brillante para el cocodrilo", price: "2,99 €" },
  { id: "no_ads_plus", name: "Pase Salpicón", desc: "Sin límite de vidas + todos los cosméticos", price: "9,99 €" },
];

type PremiumStore = { owned: string[] };
const read = (): PremiumStore => load<PremiumStore>(StoreKeys.premium, { owned: [] });

export function premiumOwned(id: string): boolean {
  return read().owned.includes(id);
}

export interface PurchaseResult {
  ok: boolean;
  message: string;
}

export function requestPurchase(_id: string): PurchaseResult {
  return {
    ok: false,
    message:
      "Los pagos con dinero real no están habilitados en esta versión.\n" +
      "Para activarlos hace falta una pasarela de pago (Stripe / Google Play\n" +
      "Billing) y un backend que verifique el recibo.",
  };
}

/** Manual grant, e.g. after a real purchase is verified server-side. */
export function grantPremium(id: string): void {
  const s = read();
  if (!s.owned.includes(id)) s.owned.push(id);
  save(StoreKeys.premium, s);
}
