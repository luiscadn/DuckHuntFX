/**
 * One cohesive pixel-art palette for the entire game.
 * Every sprite, particle and piece of scenery pulls colours from here, which is
 * what makes hand-authored sprites and procedurally drawn scenery look like a set.
 *
 * Values are 0xRRGGBB numbers for Phaser; `css()` converts them for the HTML/DOM
 * UI so the login screen matches the game exactly.
 */

export const Palette = {
  // ── neutrals / UI ────────────────────────────────────────────────
  ink: 0x161327,
  inkSoft: 0x2b2942,
  paper: 0xf5edd8,
  paperShade: 0xd8c9a2,
  gold: 0xffd447,
  goldDeep: 0xe0952a,
  rust: 0xb5451b,
  blood: 0xc8322b,
  // ── sky (three times of day, one per act) ────────────────────────
  sky1Day: 0x5ec8f2,
  sky2Day: 0xbdeefc,
  sky1Dusk: 0x3a5aa8,
  sky2Dusk: 0xf2a65e,
  sky1Night: 0x141a3a,
  sky2Night: 0x2b2f66,
  cloud: 0xffffff,
  cloudShade: 0xcfe6f5,
  // ── scenery ──────────────────────────────────────────────────────
  hillFar: 0x6a7fb8,
  hillMid: 0x4f7a4c,
  hillNear: 0x3c5f38,
  foliage: 0x5aa457,
  foliageDark: 0x3a7d3c,
  foliageLight: 0x8fd06a,
  trunk: 0x6b4423,
  trunkDark: 0x4a2f18,
  grass: 0x74b74a,
  grassDark: 0x4f8a35,
  reed: 0x3f6d2c,
  water: 0x4fb4d8,
  // ── duck ─────────────────────────────────────────────────────────
  duckBody: 0xf2f0e4,
  duckBodyShade: 0xc9c6b4,
  duckWing: 0x2e2b3d,
  duckHead: 0x1f7a3f,
  duckHeadShade: 0x145c2c,
  duckBeak: 0xf2a416,
  duckBeakShade: 0xc47c0c,
  duckDead: 0xe4b9b0,
  duckEye: 0x161327,
  // ── crocodile (the marsh retriever) ──────────────────────────────
  crocBody: 0x4f7d3f,
  crocShade: 0x365a2b,
  crocBelly: 0xd7cfa2,
  crocTeeth: 0xf6f2df,
  crocMouth: 0x8a3b46,
  crocEye: 0xf2c94c,
  // ── fx ───────────────────────────────────────────────────────────
  muzzle: 0xfff2b0,
  muzzleCore: 0xffffff,
  shadow: 0x101020,
} as const;

export type PaletteKey = keyof typeof Palette;

/** 0xRRGGBB -> "#rrggbb" */
export const css = (hex: number): string => "#" + (hex & 0xffffff).toString(16).padStart(6, "0");

/** Pre-computed CSS strings for the DOM login/menu chrome. */
export const CSSVars = {
  ink: css(Palette.ink),
  inkSoft: css(Palette.inkSoft),
  paper: css(Palette.paper),
  gold: css(Palette.gold),
  rust: css(Palette.rust),
  blood: css(Palette.blood),
  sky: css(Palette.sky1Dusk),
} as const;
