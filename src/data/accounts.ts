/**
 * Local account system (login / registro) backed by localStorage.
 * A player is identified by their name; registration asks only for name + password.
 *
 * NOTE: this is a browser game, not a bank. Passwords are salted + hashed with a
 * fast non-cryptographic hash purely so they are not stored in plain text on the
 * device. Do not reuse this pattern for anything that needs real security.
 */

import { StoreKeys } from "../constants";
import { load, save, remove } from "./store";

export interface Account {
  name: string;
  salt: string;
  hash: string;
  createdAt: number;
  bestScore: number;
  bestLevel: number;
  games: number;
}

type AccountMap = Record<string, Account>;

export interface AuthResult {
  ok: boolean;
  error?: string;
  account?: Account;
}

/** Lookup key: names are matched case-insensitively, display keeps what was typed. */
const keyOf = (name: string): string => name.trim().toLowerCase();

function fnv1a(str: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  let h2 = h ^ 0xdeadbeef;
  for (let i = str.length - 1; i >= 0; i--) {
    h2 ^= str.charCodeAt(i);
    h2 = Math.imul(h2, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0") + (h2 >>> 0).toString(16).padStart(8, "0");
}

const randomSalt = (): string => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
const digest = (password: string, salt: string): string => fnv1a(`${salt}::${password}::${salt}`);

function readAll(): AccountMap {
  return load<AccountMap>(StoreKeys.accounts, {});
}
function writeAll(map: AccountMap): void {
  save(StoreKeys.accounts, map);
}

export function listAccounts(): Account[] {
  return Object.values(readAll()).sort((a, b) => b.bestScore - a.bestScore);
}

export function register(input: { name: string; password: string }): AuthResult {
  const name = input.name.trim();

  if (name.length < 3) return { ok: false, error: "El nombre debe tener al menos 3 caracteres." };
  if (input.password.length < 4) return { ok: false, error: "La contraseña debe tener al menos 4 caracteres." };

  const all = readAll();
  if (all[keyOf(name)]) return { ok: false, error: "Ese nombre ya está registrado." };

  const salt = randomSalt();
  const account: Account = {
    name,
    salt,
    hash: digest(input.password, salt),
    createdAt: Date.now(),
    bestScore: 0,
    bestLevel: 1,
    games: 0,
  };
  all[keyOf(name)] = account;
  writeAll(all);
  save(StoreKeys.session, keyOf(name));
  return { ok: true, account };
}

export function login(name: string, password: string): AuthResult {
  const all = readAll();
  const account = all[keyOf(name)];
  if (!account) return { ok: false, error: "No existe una cuenta con ese nombre." };
  if (digest(password, account.salt) !== account.hash) {
    return { ok: false, error: "Contraseña incorrecta." };
  }
  save(StoreKeys.session, keyOf(account.name));
  return { ok: true, account };
}

export function currentUser(): Account | null {
  const key = load<string | null>(StoreKeys.session, null);
  if (!key) return null;
  return readAll()[key] ?? null;
}

export function isLoggedIn(): boolean {
  return currentUser() !== null;
}

export function logout(): void {
  remove(StoreKeys.session);
}

/** Called after a run finishes to fold the result into the player's profile. */
export function recordResult(name: string, score: number, level: number): Account | null {
  const all = readAll();
  const account = all[keyOf(name)];
  if (!account) return null;
  account.games += 1;
  account.bestScore = Math.max(account.bestScore, score);
  account.bestLevel = Math.max(account.bestLevel, level);
  writeAll(all);
  return account;
}
