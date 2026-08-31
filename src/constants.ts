/**
 * Global tuning + identity constants.
 * The whole game is designed around a 960x540 (16:9) internal resolution that is
 * then scaled to fit the window while keeping pixels crisp.
 */

export const GAME_WIDTH = 960;
export const GAME_HEIGHT = 540;

/** Ground line: everything below this is grass / foreground. */
export const GROUND_Y = 452;

export const FONT_FAMILY = '"Press Start 2P", ui-monospace, monospace';

/** Scene keys — kept in one place so transitions never rely on magic strings. */
export const Scenes = {
  Boot: "Boot",
  Auth: "Auth",
  Menu: "Menu",
  Scores: "Scores",
  Achievements: "Achievements",
  Settings: "Settings",
  Stats: "Stats",
  Missions: "Missions",
  Cosmetics: "Cosmetics",
  Shop: "Shop",
  Game: "Game",
  Hud: "Hud",
  GameOver: "GameOver",
} as const;

/** Persistent storage keys. */
export const StoreKeys = {
  accounts: "dh:accounts",
  session: "dh:session",
  scores: "dh:scores",
  settings: "dh:settings",
  achievements: "dh:achievements",
  stats: "dh:stats",
  weapons: "dh:weapons",
  bank: "dh:bank",
  missions: "dh:missions",
  cosmetics: "dh:cosmetics",
} as const;

/** Core gameplay rules (arcade light-gun shooter, tuned for feel). */
export const Rules = {
  startingLives: 3,
  baseMagazine: 3, // bullets per duck before it can escape
  reloadMs: 650,
  maxComboMultiplier: 4,
  comboStep: 1, // hits needed to raise the multiplier by one
  duckBasePoints: 100,
  escapePenaltyLife: 1,
  hitstopMs: 55,
  // combo decay: the meter empties over this window; it shrinks as the
  // multiplier climbs so high combos take more discipline to hold.
  comboWindowMs: 2800,
  comboWindowMinMs: 1500,
  // a frenzy fires every N consecutive bags (10, 20, 30, ...)
  frenzyEvery: 10,
  frenzyMs: 3000,
  // crocodile "ultimate": meter 0..100, fills as you bag ducks
  crocMeterPerBag: 7,
  decoyPenalty: 250,
} as const;

/** Power-up identifiers, shared by data + HUD + game logic. */
export const Power = {
  Double: "double", // score x2 while active
  Freeze: "freeze", // ducks crawl
  Clear: "clear", // bag every duck on screen
} as const;
export type PowerId = (typeof Power)[keyof typeof Power];
