/**
 * The bank: coins that persist between runs. Coins left over at the end of a run
 * are deposited here, and the meta-shop (cosmetics) + mission rewards draw from it.
 */

import { StoreKeys } from "../constants";
import { load, save } from "./store";

interface Bank {
  coins: number;
  earned: number; // lifetime total, for stats
}

const read = (): Bank => load<Bank>(StoreKeys.bank, { coins: 0, earned: 0 });
const write = (b: Bank): void => save(StoreKeys.bank, b);

export function bankCoins(): number {
  return read().coins;
}

export function bankLifetimeEarned(): number {
  return read().earned;
}

/** Add coins (run leftovers, mission rewards). */
export function bankDeposit(n: number): number {
  if (n <= 0) return read().coins;
  const b = read();
  b.coins += n;
  b.earned += n;
  write(b);
  return b.coins;
}

/** Returns true if the purchase went through. */
export function bankSpend(n: number): boolean {
  const b = read();
  if (b.coins < n) return false;
  b.coins -= n;
  write(b);
  return true;
}
