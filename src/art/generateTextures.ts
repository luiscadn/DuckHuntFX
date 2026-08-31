/**
 * Builds every texture the game uses, once, at boot. No external image files.
 *
 * Naming:
 *   duck        4-frame flap sheet (up, mid, down, mid), faces right
 *   duck-hit    single tumbling / shot frame
 *   croc        3-frame sheet (lurk, snap, grin)
 *   crosshair, muzzle, feather, puff, star, ring
 *   cloud0/1, bush, tree, reed, grass, sun, moon
 *   heart, bullet, bullet-empty
 *   pow-double, pow-freeze, pow-clear
 *   vignette
 */

import { Palette as C } from "./palette";
import {
  circle,
  ellipse,
  fillPoly,
  line,
  rect,
  register,
  registerSheet,
  surface,
} from "./draw";

type TM = Phaser.Textures.TextureManager;

// ── DUCK ───────────────────────────────────────────────────────────

const DUCK_W = 64;
const DUCK_H = 48;

// Two clean tones + a highlight = readable volume at this small size.
// Light from the top-left; belly and tail undersides sit in shadow.
function drawDuckBody(ctx: CanvasRenderingContext2D): void {
  // tail
  fillPoly(ctx, [[16, 22], [3, 17], [17, 31]], C.duckBody);
  fillPoly(ctx, [[16, 27], [5, 20], [17, 31]], C.duckBodyShade);
  fillPoly(ctx, [[3, 17], [11, 20], [6, 25]], C.duckWing);
  // body: light top, shaded belly, dark sliver, highlight
  ellipse(ctx, 30, 27, 15, 10, C.duckBody);
  ellipse(ctx, 30, 31, 14, 6, C.duckBodyShade);
  ellipse(ctx, 30, 35, 9, 2.4, C.duckCore);
  ellipse(ctx, 25, 22, 6, 3.4, C.duckLit);
  // neck + head
  fillPoly(ctx, [[34, 21], [41, 9], [46, 16], [39, 27]], C.duckHead);
  fillPoly(ctx, [[36, 25], [42, 14], [45, 17], [39, 27]], C.duckHeadShade);
  ellipse(ctx, 46, 15, 8, 7, C.duckHead);
  ellipse(ctx, 47, 18, 6.5, 4, C.duckHeadShade);
  ellipse(ctx, 43.6, 12.4, 2.6, 2, C.duckHeadLit);
  // white collar
  line(ctx, 39, 21, 45, 24, C.duckBody, 2.6);
  // eye
  circle(ctx, 49, 13, 1.8, C.duckEye);
  circle(ctx, 49.7, 12.4, 0.7, 0xffffff);
  // beak
  fillPoly(ctx, [[52, 13], [63, 14], [63, 17.5], [52, 18]], C.duckBeakLit);
  fillPoly(ctx, [[52, 18], [63, 17.5], [63, 20.5], [52, 20]], C.duckBeak);
  line(ctx, 53, 18.5, 62, 18.2, C.duckBeakShade, 1);
}

function drawDuckWing(ctx: CanvasRenderingContext2D, phase: "up" | "mid" | "down"): void {
  if (phase === "up") {
    fillPoly(ctx, [[28, 20], [19, 3], [35, 6], [37, 21]], C.duckWing);
    fillPoly(ctx, [[28, 20], [22, 8], [31, 10], [33, 19]], C.duckWingLit);
  } else if (phase === "mid") {
    fillPoly(ctx, [[27, 22], [5, 15], [10, 27], [29, 29]], C.duckWing);
    fillPoly(ctx, [[26, 23], [10, 18], [12, 22], [26, 26]], C.duckWingLit);
  } else {
    fillPoly(ctx, [[28, 30], [21, 45], [37, 43], [37, 30]], C.duckWing);
    fillPoly(ctx, [[28, 30], [25, 39], [33, 38], [35, 31]], C.duckWingLit);
  }
}

function buildDuck(tm: TM): void {
  const phases: Array<"up" | "mid" | "down"> = ["up", "mid", "down", "mid"];
  registerSheet(tm, "duck", DUCK_W, DUCK_H, 4, (ctx, i) => {
    drawDuckBody(ctx);
    drawDuckWing(ctx, phases[i]);
  });

  const s = surface(DUCK_W, DUCK_H);
  const ctx = s.ctx;
  drawDuckBody(ctx);
  // both wings flung up
  fillPoly(ctx, [[28, 20], [19, 3], [35, 6], [37, 21]], C.duckWing);
  fillPoly(ctx, [[28, 20], [21, 6], [33, 8], [34, 19]], C.duckWingLit);
  fillPoly(ctx, [[30, 22], [40, 6], [48, 12], [40, 26]], C.duckWing);
  fillPoly(ctx, [[31, 22], [39, 9], [45, 13], [39, 24]], C.duckWingLit);
  // X eye
  line(ctx, 47, 11, 51, 15, C.duckEye, 1.6);
  line(ctx, 51, 11, 47, 15, C.duckEye, 1.6);
  register(tm, "duck-hit", s);
}

// ── CROCODILE (marsh retriever) ────────────────────────────────────

const CROC_W = 100;
const CROC_H = 64;

function buildCroc(tm: TM): void {
  registerSheet(tm, "croc", CROC_W, CROC_H, 3, (ctx, i) => {
    if (i === 0) drawCrocLurk(ctx);
    else if (i === 1) drawCrocSnap(ctx);
    else drawCrocGrin(ctx);
  });
}

/** teeth: little triangles along a segment, pointing `dir` (1 down, -1 up) */
function teeth(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, dir: number, n: number): void {
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const x = x1 + (x2 - x1) * t;
    const y = y1 + (y2 - y1) * t;
    fillPoly(ctx, [[x - 2, y], [x + 2, y], [x, y + dir * 5]], C.crocTeeth);
  }
}

function backRidge(ctx: CanvasRenderingContext2D, x: number, y: number, n: number, step: number): void {
  for (let i = 0; i < n; i++) fillPoly(ctx, [[x + i * step, y], [x + i * step + 5, y], [x + i * step + 2, y - 6]], C.crocShade);
}

function drawCrocLurk(ctx: CanvasRenderingContext2D): void {
  // low snout ridge just breaking the surface
  ellipse(ctx, 50, 50, 40, 10, C.crocBody);
  rect(ctx, 12, 46, 78, 12, C.crocBody);
  ctx.globalAlpha = 0.4;
  rect(ctx, 12, 46, 78, 3, C.crocBelly);
  ctx.globalAlpha = 1;
  // eye humps
  ellipse(ctx, 34, 40, 8, 8, C.crocBody);
  ellipse(ctx, 52, 40, 8, 8, C.crocBody);
  circle(ctx, 34, 39, 3, C.crocEye);
  circle(ctx, 52, 39, 3, C.crocEye);
  circle(ctx, 34, 39, 1.4, C.crocMouth);
  circle(ctx, 52, 39, 1.4, C.crocMouth);
  // nostrils at the snout tip
  circle(ctx, 82, 48, 1.6, C.crocShade);
  circle(ctx, 88, 50, 1.6, C.crocShade);
}

function drawCrocSnap(ctx: CanvasRenderingContext2D): void {
  // body rising out of the water
  ellipse(ctx, 40, 50, 30, 18, C.crocBody);
  ellipse(ctx, 40, 58, 24, 9, C.crocBelly);
  backRidge(ctx, 16, 40, 5, 9);
  // head
  ellipse(ctx, 58, 34, 18, 14, C.crocBody);
  // mouth cavity
  fillPoly(ctx, [[50, 34], [96, 16], [98, 26], [54, 40]], C.crocMouth);
  // lower jaw (forward)
  fillPoly(ctx, [[50, 36], [96, 24], [98, 34], [54, 44]], C.crocBody);
  teeth(ctx, 56, 36, 94, 26, -1, 6);
  // upper jaw (hinged up-back)
  fillPoly(ctx, [[48, 30], [90, 2], [96, 12], [54, 34]], C.crocBody);
  teeth(ctx, 56, 30, 88, 12, 1, 6);
  // eye on top of the head
  ellipse(ctx, 54, 20, 7, 7, C.crocBody);
  circle(ctx, 54, 19, 3.2, C.crocEye);
  circle(ctx, 54, 19, 1.4, C.crocMouth);
  circle(ctx, 92, 8, 1.6, C.crocShade);
}

function drawCrocGrin(ctx: CanvasRenderingContext2D): void {
  ellipse(ctx, 40, 50, 30, 18, C.crocBody);
  ellipse(ctx, 40, 58, 24, 9, C.crocBelly);
  backRidge(ctx, 16, 40, 5, 9);
  // long head, closed smug grin
  ellipse(ctx, 58, 34, 22, 15, C.crocBody);
  fillPoly(ctx, [[36, 36], [92, 28], [92, 33], [36, 41]], C.crocShade);
  // zig-zag teeth along the seam
  for (let i = 0; i < 9; i++) {
    const x = 40 + i * 6;
    const y = 37 - i * 0.9;
    fillPoly(ctx, [[x - 2, y], [x + 2, y], [x, y + (i % 2 ? 4 : -4)]], C.crocTeeth);
  }
  // eyes: one open, one half-closed (smug)
  ellipse(ctx, 46, 22, 7, 7, C.crocBody);
  circle(ctx, 46, 21, 3.2, C.crocEye);
  circle(ctx, 46, 21, 1.4, C.crocMouth);
  line(ctx, 60, 22, 70, 21, C.crocShade, 2.4);
  // a stray feather poking from the mouth corner
  fillPoly(ctx, [[88, 30], [96, 24], [99, 28], [92, 34]], C.duckBody);
  line(ctx, 89, 31, 97, 26, C.duckWing, 1);
  circle(ctx, 90, 44, 1.6, C.crocShade);
}

// ── FX + PROPS ─────────────────────────────────────────────────────

function buildFx(tm: TM): void {
  // crosshair
  {
    const s = surface(44, 44);
    const ctx = s.ctx;
    ctx.strokeStyle = "#161327";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(22, 22, 13, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = "#c8322b";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(22, 22, 13, 0, Math.PI * 2);
    ctx.stroke();
    for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]] as const) {
      line(ctx, 22 + dx * 7, 22 + dy * 7, 22 + dx * 20, 22 + dy * 20, C.blood, 3);
    }
    circle(ctx, 22, 22, 2, C.blood);
    register(tm, "crosshair", s);
  }
  // muzzle flash
  {
    const s = surface(56, 56);
    const ctx = s.ctx;
    const star = (r1: number, r2: number, color: number) => {
      const pts: number[][] = [];
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2;
        const r = i % 2 ? r2 : r1;
        pts.push([28 + Math.cos(a) * r, 28 + Math.sin(a) * r]);
      }
      fillPoly(ctx, pts, color);
    };
    star(26, 9, C.muzzle);
    star(15, 5, C.muzzleCore);
    register(tm, "muzzle", s);
  }
  // feather
  {
    const s = surface(10, 10);
    fillPoly(s.ctx, [[1, 5], [6, 1], [9, 4], [4, 9]], C.duckBody);
    line(s.ctx, 2, 6, 8, 3, C.duckBodyShade, 1);
    register(tm, "feather", s);
  }
  // raindrop / gust streaks for weather
  {
    const s = surface(3, 16);
    s.ctx.fillStyle = "rgba(200,224,244,0.85)";
    s.ctx.fillRect(0, 0, 3, 16);
    register(tm, "raindrop", s);
  }
  {
    const s = surface(28, 3);
    s.ctx.fillStyle = "rgba(255,255,255,0.5)";
    s.ctx.fillRect(0, 0, 28, 3);
    register(tm, "gust", s);
  }
  // puff
  {
    const s = surface(22, 22);
    const ctx = s.ctx;
    ctx.globalAlpha = 0.9;
    circle(ctx, 8, 13, 6, C.paper);
    circle(ctx, 15, 11, 5, C.paperShade);
    circle(ctx, 12, 8, 5, C.paper);
    register(tm, "puff", s);
  }
  // sparkle star
  {
    const s = surface(14, 14);
    fillPoly(s.ctx, [[7, 0], [9, 5], [14, 7], [9, 9], [7, 14], [5, 9], [0, 7], [5, 5]], C.gold);
    circle(s.ctx, 7, 7, 1.6, C.paper);
    register(tm, "star", s);
  }
  // soft ring (shockwave)
  {
    const s = surface(64, 64);
    s.ctx.strokeStyle = "#ffffff";
    s.ctx.lineWidth = 6;
    s.ctx.beginPath();
    s.ctx.arc(32, 32, 26, 0, Math.PI * 2);
    s.ctx.stroke();
    register(tm, "ring", s);
  }
  // vignette (full screen)
  {
    const s = surface(960, 540);
    const g = s.ctx.createRadialGradient(480, 300, 180, 480, 300, 620);
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(1, "rgba(6,8,20,0.55)");
    s.ctx.fillStyle = g;
    s.ctx.fillRect(0, 0, 960, 540);
    register(tm, "vignette", s);
  }
}

function buildScenery(tm: TM): void {
  // clouds
  const cloud = (key: string, w: number, h: number) => {
    const s = surface(w, h);
    const ctx = s.ctx;
    const cy = h * 0.62;
    circle(ctx, w * 0.28, cy, h * 0.34, C.cloudShade);
    circle(ctx, w * 0.6, cy, h * 0.4, C.cloudShade);
    circle(ctx, w * 0.28, cy - 3, h * 0.32, C.cloud);
    circle(ctx, w * 0.5, cy - 6, h * 0.4, C.cloud);
    circle(ctx, w * 0.72, cy - 2, h * 0.3, C.cloud);
    rect(ctx, w * 0.2, cy, w * 0.6, h * 0.34, C.cloud);
    register(tm, key, s);
  };
  cloud("cloud0", 110, 46);
  cloud("cloud1", 74, 34);

  // bush
  {
    const s = surface(84, 44);
    const ctx = s.ctx;
    circle(ctx, 20, 30, 16, C.foliageDark);
    circle(ctx, 44, 24, 20, C.foliageDark);
    circle(ctx, 66, 30, 15, C.foliageDark);
    circle(ctx, 26, 26, 12, C.foliage);
    circle(ctx, 46, 22, 15, C.foliage);
    circle(ctx, 40, 18, 8, C.foliageLight);
    rect(ctx, 4, 32, 76, 12, C.foliageDark);
    register(tm, "bush", s);
  }
  // tree
  {
    const s = surface(120, 140);
    const ctx = s.ctx;
    rect(ctx, 52, 92, 18, 48, C.trunkDark);
    rect(ctx, 52, 92, 8, 48, C.trunk);
    circle(ctx, 60, 58, 40, C.foliageDark);
    circle(ctx, 32, 68, 26, C.foliageDark);
    circle(ctx, 88, 68, 26, C.foliageDark);
    circle(ctx, 58, 52, 30, C.foliage);
    circle(ctx, 46, 40, 16, C.foliageLight);
    register(tm, "tree", s);
  }
  // reeds
  {
    const s = surface(30, 56);
    const ctx = s.ctx;
    for (const x of [6, 14, 22]) {
      fillPoly(ctx, [[x, 56], [x - 3, 20], [x + 2, 8], [x + 3, 22], [x + 4, 56]], C.reed);
    }
    register(tm, "reed", s);
  }
  // grass tuft
  {
    const s = surface(34, 22);
    const ctx = s.ctx;
    for (const x of [4, 10, 16, 22, 28]) {
      fillPoly(ctx, [[x, 22], [x - 2, 6], [x + 2, 22]], C.grassDark);
    }
    register(tm, "grass", s);
  }
  // sun / moon
  {
    const s = surface(80, 80);
    circle(s.ctx, 40, 40, 30, 0xffe9a8);
    circle(s.ctx, 40, 40, 24, C.gold);
    register(tm, "sun", s);
  }
  {
    const s = surface(72, 72);
    const ctx = s.ctx;
    circle(ctx, 36, 36, 26, 0xf2f3ff);
    circle(ctx, 46, 30, 22, C.sky1Night);
    circle(ctx, 28, 44, 4, 0xd8dcf5);
    circle(ctx, 40, 50, 3, 0xd8dcf5);
    register(tm, "moon", s);
  }
}

function buildHudIcons(tm: TM): void {
  // heart
  {
    const s = surface(18, 16);
    const ctx = s.ctx;
    circle(ctx, 6, 6, 4.5, C.blood);
    circle(ctx, 12, 6, 4.5, C.blood);
    fillPoly(ctx, [[1.5, 7], [16.5, 7], [9, 15.5]], C.blood);
    circle(ctx, 5, 5, 1.6, 0xef7d78);
    register(tm, "heart", s);
  }
  // bullet (brass shell)
  {
    const s = surface(12, 24);
    const ctx = s.ctx;
    rect(ctx, 2, 8, 8, 14, C.goldDeep);
    rect(ctx, 2, 8, 3, 14, C.gold);
    fillPoly(ctx, [[2, 8], [10, 8], [6, 1]], C.gold);
    rect(ctx, 2, 20, 8, 3, C.rust);
    register(tm, "bullet", s);
  }
  {
    const s = surface(12, 24);
    const ctx = s.ctx;
    ctx.globalAlpha = 0.4;
    rect(ctx, 2, 8, 8, 14, C.inkSoft);
    fillPoly(ctx, [[2, 8], [10, 8], [6, 1]], C.inkSoft);
    register(tm, "bullet-empty", s);
  }
}

function powerIcon(
  tm: TM,
  key: string,
  paint: (ctx: CanvasRenderingContext2D) => void,
): void {
  const s = surface(30, 30);
  const ctx = s.ctx;
  circle(ctx, 15, 15, 14, C.inkSoft);
  ctx.strokeStyle = "#ffd447";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(15, 15, 13, 0, Math.PI * 2);
  ctx.stroke();
  paint(ctx);
  register(tm, key, s);
}

function buildPowerIcons(tm: TM): void {
  powerIcon(tm, "pow-double", (ctx) => {
    for (const off of [-3, 3]) {
      ctx.save();
      ctx.translate(15 + off, 15);
      ctx.rotate(off > 0 ? 0.4 : -0.4);
      rect(ctx, -2, -6, 4, 9, C.goldDeep);
      fillPoly(ctx, [[-2, -6], [2, -6], [0, -10]], C.gold);
      ctx.restore();
    }
  });
  powerIcon(tm, "pow-freeze", (ctx) => {
    ctx.strokeStyle = "#bdeefc";
    ctx.lineWidth = 2;
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(15, 15);
      ctx.lineTo(15 + Math.cos(a) * 9, 15 + Math.sin(a) * 9);
      ctx.stroke();
    }
    circle(ctx, 15, 15, 2, C.paper);
  });
  powerIcon(tm, "pow-clear", (ctx) => {
    circle(ctx, 15, 17, 7, C.ink);
    rect(ctx, 14, 6, 2, 5, C.goldDeep);
    circle(ctx, 15, 6, 2, C.blood);
    circle(ctx, 12, 14, 1.6, 0x4a4a66);
  });
}

function buildBadges(tm: TM): void {
  // achievement medal
  {
    const s = surface(34, 42);
    const ctx = s.ctx;
    // ribbon
    fillPoly(ctx, [[12, 20], [22, 20], [18, 40], [17, 40]], C.blood);
    fillPoly(ctx, [[13, 20], [21, 20], [17, 34], [16, 34]], C.rust);
    // disc
    circle(ctx, 17, 16, 14, C.goldDeep);
    circle(ctx, 17, 16, 11, C.gold);
    // star
    fillPoly(
      ctx,
      [
        [17, 6], [19.5, 13], [27, 13], [21, 17.5],
        [23.5, 25], [17, 20.5], [10.5, 25], [13, 17.5],
        [7, 13], [14.5, 13],
      ],
      C.ink,
    );
    register(tm, "medal", s);
  }
  // locked medal (grey, question mark drawn by scene as text)
  {
    const s = surface(34, 42);
    const ctx = s.ctx;
    fillPoly(ctx, [[12, 20], [22, 20], [18, 40], [17, 40]], C.inkSoft);
    circle(ctx, 17, 16, 14, 0x3a3850);
    circle(ctx, 17, 16, 11, C.inkSoft);
    register(tm, "medal-locked", s);
  }
}

function buildBoss(tm: TM): void {
  const W = 150;
  const H = 110;
  const paint = (ctx: CanvasRenderingContext2D, wingUp: boolean): void => {
    // tail
    fillPoly(ctx, [[34, 52], [6, 40], [36, 70]], 0xf2f0e4);
    fillPoly(ctx, [[6, 40], [22, 46], [12, 56]], C.duckWing);
    // body
    ellipse(ctx, 74, 62, 40, 27, 0xf2f0e4);
    ellipse(ctx, 70, 74, 32, 15, C.duckBodyShade);
    ctx.globalAlpha = 0.22;
    ellipse(ctx, 66, 48, 26, 10, 0xffffff);
    ctx.globalAlpha = 1;
    // neck + head (royal green)
    fillPoly(ctx, [[86, 50], [104, 22], [118, 40], [100, 66]], C.duckHead);
    ellipse(ctx, 116, 34, 21, 19, C.duckHead);
    ellipse(ctx, 116, 42, 18, 10, C.duckHeadShade);
    // white collar
    line(ctx, 98, 50, 112, 58, 0xf2f0e4, 7);
    // eye
    circle(ctx, 124, 30, 3.4, C.duckEye);
    circle(ctx, 125.5, 28.5, 1.4, C.paper);
    // beak
    fillPoly(ctx, [[132, 30], [150, 32], [150, 44], [132, 46]], C.duckBeak);
    fillPoly(ctx, [[132, 42], [150, 44], [150, 47], [132, 46]], C.duckBeakShade);
    // crown
    fillPoly(ctx, [[104, 16], [110, 2], [116, 12], [122, 0], [128, 12], [134, 3], [138, 16]], C.gold);
    rect(ctx, 104, 15, 34, 5, C.goldDeep);
    circle(ctx, 121, 4, 2, C.blood);
    // wing
    if (wingUp) {
      fillPoly(ctx, [[70, 44], [52, 6], [96, 12], [98, 46]], C.duckWing);
      fillPoly(ctx, [[52, 6], [70, 14], [64, 26]], C.duckBodyShade);
    } else {
      fillPoly(ctx, [[70, 74], [58, 108], [100, 100], [100, 72]], C.duckWing);
      fillPoly(ctx, [[58, 108], [74, 100], [68, 88]], C.duckBodyShade);
    }
  };
  registerSheet(tm, "boss", W, H, 2, (ctx, i) => paint(ctx, i === 0));
}

function buildExtras(tm: TM): void {
  // soft ground shadow that scales with a duck's height
  {
    const s = surface(48, 18);
    const g = s.ctx.createRadialGradient(24, 9, 2, 24, 9, 22);
    g.addColorStop(0, "rgba(12,16,32,0.5)");
    g.addColorStop(1, "rgba(12,16,32,0)");
    s.ctx.fillStyle = g;
    s.ctx.fillRect(0, 0, 48, 18);
    register(tm, "duck-shadow", s);
  }
  // rubber decoy duck — glossy toy, do not shoot
  {
    const s = surface(32, 26);
    const ctx = s.ctx;
    ellipse(ctx, 14, 18, 12.5, 8.5, 0xd99416); // rim
    ellipse(ctx, 14, 17, 12, 8, 0xffcf3a); // base
    ellipse(ctx, 15, 20, 9, 5, 0xe0a220); // form shadow
    ellipse(ctx, 10, 14, 5, 3, 0xfff0b0); // highlight
    circle(ctx, 8, 12, 1.6, 0xffffff); // specular
    ellipse(ctx, 21, 10, 6, 5, 0xffcf3a); // head
    ellipse(ctx, 20, 11.5, 5, 3.2, 0xe0a220);
    ellipse(ctx, 19.5, 8.5, 2.6, 1.8, 0xfff0b0);
    fillPoly(ctx, [[24, 8], [31, 9], [31, 12], [24, 13]], 0xf9a83a); // bill top
    fillPoly(ctx, [[24, 13], [31, 12], [31, 15], [24, 15]], 0xd97e18); // bill bottom
    circle(ctx, 21.5, 9, 1.4, C.ink);
    register(tm, "duck-decoy", s);
  }
  // coin (loot)
  {
    const s = surface(16, 16);
    const ctx = s.ctx;
    circle(ctx, 8, 8, 7, C.goldDeep);
    circle(ctx, 8, 8, 5, C.gold);
    line(ctx, 8, 4, 8, 12, C.goldDeep, 2);
    register(tm, "coin", s);
  }

  // crosshair variants (xh-<id>) — classic mirrors the default reticle
  const xhBase = (ctx: CanvasRenderingContext2D, ring: number, tick: number) => {
    ctx.strokeStyle = "#161327";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(22, 22, ring, 0, Math.PI * 2);
    ctx.stroke();
    for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]] as const) {
      line(ctx, 22 + dx * (ring - 5), 22 + dy * (ring - 5), 22 + dx * tick, 22 + dy * tick, tick > 0 ? 0x161327 : 0x161327, 3);
    }
  };
  {
    const s = surface(44, 44);
    xhBase(s.ctx, 13, 20);
    s.ctx.strokeStyle = "#c8322b";
    s.ctx.lineWidth = 2;
    s.ctx.beginPath();
    s.ctx.arc(22, 22, 13, 0, Math.PI * 2);
    s.ctx.stroke();
    circle(s.ctx, 22, 22, 2, C.blood);
    register(tm, "xh-classic", s);
  }
  {
    const s = surface(44, 44);
    circle(s.ctx, 22, 22, 4, 0x3a7d3c);
    circle(s.ctx, 22, 22, 2, 0x8fd06a);
    for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]] as const) {
      line(s.ctx, 22 + dx * 8, 22 + dy * 8, 22 + dx * 16, 22 + dy * 16, 0x3a7d3c, 2);
    }
    register(tm, "xh-dot", s);
  }
  {
    const s = surface(44, 44);
    s.ctx.strokeStyle = "#e0952a";
    s.ctx.lineWidth = 3;
    s.ctx.beginPath();
    s.ctx.arc(22, 22, 15, 0, Math.PI * 2);
    s.ctx.stroke();
    s.ctx.strokeStyle = "#ffd447";
    s.ctx.lineWidth = 2;
    s.ctx.beginPath();
    s.ctx.arc(22, 22, 9, 0, Math.PI * 2);
    s.ctx.stroke();
    circle(s.ctx, 22, 22, 1.6, C.gold);
    register(tm, "xh-ring", s);
  }
  {
    const s = surface(44, 44);
    const ctx = s.ctx;
    circle(ctx, 22, 20, 8, C.paper);
    fillPoly(ctx, [[16, 26], [28, 26], [26, 32], [18, 32]], C.paper);
    circle(ctx, 19, 20, 2, C.ink);
    circle(ctx, 25, 20, 2, C.ink);
    rect(ctx, 20, 25, 1.6, 4, C.ink);
    rect(ctx, 23, 25, 1.6, 4, C.ink);
    register(tm, "xh-skull", s);
  }

  // croc hats (hat-<id>) — drawn centred, origin used as (0.5, 1) by the croc
  {
    const s = surface(30, 26);
    const ctx = s.ctx;
    rect(ctx, 3, 20, 24, 4, C.ink); // brim
    rect(ctx, 8, 2, 14, 20, C.ink); // stovepipe
    rect(ctx, 8, 13, 14, 3, C.blood); // band
    register(tm, "hat-top", s);
  }
  {
    const s = surface(26, 26);
    fillPoly(s.ctx, [[13, 1], [3, 24], [23, 24]], 0x4fb4d8);
    fillPoly(s.ctx, [[13, 1], [9, 12], [17, 12]], C.gold);
    circle(s.ctx, 13, 2, 2.4, C.blood);
    register(tm, "hat-party", s);
  }
  {
    const s = surface(30, 20);
    const ctx = s.ctx;
    fillPoly(ctx, [[3, 18], [3, 6], [9, 12], [15, 2], [21, 12], [27, 6], [27, 18]], C.gold);
    rect(ctx, 3, 16, 24, 4, C.goldDeep);
    circle(ctx, 15, 6, 2, C.blood);
    register(tm, "hat-crown", s);
  }
}

// ── first-person weapon viewmodels ────────────────────────────────
// Side profile, held bottom-right, barrel pointing up-left toward the action.

const GUN_W = 210;
const GUN_H = 150;

/** thin lit edge along the top of a metal part */
function metalBar(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
  rect(ctx, x, y, w, h, C.gunMetal);
  rect(ctx, x, y, w, Math.max(2, h * 0.28), C.gunMetalLit);
  rect(ctx, x, y + h - Math.max(2, h * 0.24), w, Math.max(2, h * 0.24), C.gunMetalDark);
}

function buildGuns(tm: TM): void {
  // pistol
  {
    const s = surface(GUN_W, GUN_H);
    const ctx = s.ctx;
    // grip
    fillPoly(ctx, [[150, 96], [186, 120], [176, 150], [136, 150], [128, 108]], C.gunMetalDark);
    fillPoly(ctx, [[150, 96], [182, 116], [174, 144], [140, 144]], C.gunMetal);
    fillPoly(ctx, [[150, 96], [168, 106], [160, 128], [146, 118]], C.gunMetalLit);
    // frame / slide
    metalBar(ctx, 78, 80, 84, 26);
    // trigger guard
    ctx.strokeStyle = "#2b2d34";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(132, 118, 12, Math.PI * 0.15, Math.PI * 1.1);
    ctx.stroke();
    // barrel
    fillPoly(ctx, [[92, 82], [40, 46], [34, 56], [86, 96]], C.gunMetal);
    fillPoly(ctx, [[92, 82], [40, 46], [37, 51], [88, 88]], C.gunMetalLit);
    circle(ctx, 37, 51, 4, C.gunMetalDark);
    register(tm, "gun-pistol", s);
  }
  // shotgun
  {
    const s = surface(GUN_W, GUN_H);
    const ctx = s.ctx;
    // wooden stock
    fillPoly(ctx, [[150, 86], [210, 118], [210, 150], [140, 150], [130, 104]], C.gunWoodLit);
    fillPoly(ctx, [[150, 92], [204, 120], [204, 146], [146, 146]], C.gunWood);
    // receiver
    metalBar(ctx, 92, 78, 68, 30);
    // pump forend (grooved wood)
    fillPoly(ctx, [[58, 72], [96, 92], [90, 108], [50, 88]], C.gunWood);
    for (let i = 0; i < 4; i++) line(ctx, 58 + i * 8, 78 + i * 4, 66 + i * 8, 96 + i * 4, C.gunWoodLit, 2);
    // barrel + magazine tube
    fillPoly(ctx, [[100, 74], [22, 20], [16, 30], [94, 88]], C.gunMetal);
    fillPoly(ctx, [[100, 74], [22, 20], [19, 25], [96, 82]], C.gunMetalLit);
    fillPoly(ctx, [[96, 90], [30, 40], [26, 48], [92, 100]], C.gunMetalDark);
    circle(ctx, 19, 25, 5, C.gunMetalDark);
    circle(ctx, 19, 25, 2.4, C.ink);
    register(tm, "gun-shotgun", s);
  }
  // rifle
  {
    const s = surface(GUN_W, GUN_H);
    const ctx = s.ctx;
    fillPoly(ctx, [[150, 90], [210, 116], [210, 150], [138, 150], [128, 106]], C.gunWood);
    fillPoly(ctx, [[150, 90], [206, 114], [190, 118], [150, 102]], C.gunWoodLit);
    metalBar(ctx, 96, 82, 60, 22);
    // bolt handle
    fillPoly(ctx, [[150, 92], [166, 82], [172, 88], [156, 100]], C.gunMetalLit);
    // long thin barrel
    fillPoly(ctx, [[104, 84], [14, 30], [10, 37], [100, 92]], C.gunMetal);
    fillPoly(ctx, [[104, 84], [14, 30], [12, 33], [102, 88]], C.gunMetalLit);
    // scope
    metalBar(ctx, 100, 60, 44, 14);
    circle(ctx, 100, 67, 8, C.gunMetalDark);
    circle(ctx, 100, 67, 5, 0x2a3a4a);
    circle(ctx, 144, 67, 7, C.gunMetalDark);
    line(ctx, 108, 74, 116, 82, C.gunMetalDark, 4);
    line(ctx, 132, 74, 138, 82, C.gunMetalDark, 4);
    circle(ctx, 12, 33, 3.6, C.gunMetalDark);
    register(tm, "gun-rifle", s);
  }
  // smg
  {
    const s = surface(GUN_W, GUN_H);
    const ctx = s.ctx;
    // folding stock
    fillPoly(ctx, [[168, 84], [206, 92], [206, 100], [170, 96]], C.gunMetalDark);
    fillPoly(ctx, [[200, 96], [206, 96], [206, 132], [200, 132]], C.gunMetalDark);
    // boxy receiver
    metalBar(ctx, 96, 74, 78, 34);
    // pistol grip
    fillPoly(ctx, [[150, 104], [172, 122], [164, 148], [140, 148], [136, 112]], C.gunMetalDark);
    fillPoly(ctx, [[150, 104], [166, 116], [160, 138], [144, 128]], C.gunMetal);
    // curved magazine
    fillPoly(ctx, [[108, 106], [126, 108], [138, 150], [116, 150]], C.gunMetalDark);
    fillPoly(ctx, [[110, 108], [122, 110], [132, 146], [120, 146]], C.gunMetal);
    // short shrouded barrel
    fillPoly(ctx, [[104, 76], [46, 40], [40, 50], [98, 90]], C.gunMetal);
    fillPoly(ctx, [[104, 76], [46, 40], [43, 45], [100, 82]], C.gunMetalLit);
    for (let i = 0; i < 5; i++) circle(ctx, 92 - i * 10, 82 - i * 6, 2, C.gunMetalDark);
    circle(ctx, 43, 45, 4, C.gunMetalDark);
    register(tm, "gun-smg", s);
  }
}

// ── extra targets: pigeon (flies), fox + bear (run on the ground) ──

function buildCritters(tm: TM): void {
  // pigeon — 2-frame flap, faces right
  {
    const W = 52;
    const H = 38;
    const paint = (ctx: CanvasRenderingContext2D, up: boolean): void => {
      fillPoly(ctx, [[10, 20], [1, 15], [12, 26]], 0x7d8595); // tail
      ellipse(ctx, 24, 22, 13, 8, 0x9aa2b1); // body
      ellipse(ctx, 24, 25, 11, 4.5, 0x7d8595); // belly shade
      ellipse(ctx, 21, 19, 5, 3, 0xc6ccd6); // highlight
      ellipse(ctx, 36, 16, 6, 5.5, 0x9aa2b1); // head
      ellipse(ctx, 35, 19, 4, 2.4, 0x3fae9e); // iridescent neck
      fillPoly(ctx, [[41, 15], [48, 16], [41, 18]], 0xd88b3a); // beak
      circle(ctx, 37, 15, 1.4, C.duckEye);
      circle(ctx, 37.4, 14.6, 0.6, 0xffffff);
      if (up) {
        fillPoly(ctx, [[22, 18], [14, 3], [30, 6], [31, 19]], 0x5c6474);
        fillPoly(ctx, [[22, 18], [17, 7], [27, 9], [29, 18]], 0x848c9c);
      } else {
        fillPoly(ctx, [[22, 24], [16, 36], [32, 34], [31, 24]], 0x5c6474);
        fillPoly(ctx, [[22, 24], [19, 32], [29, 31], [30, 24]], 0x848c9c);
      }
    };
    registerSheet(tm, "pigeon", W, H, 2, (ctx, i) => paint(ctx, i === 0));
  }

  // fox — 2-frame run, feet at the bottom edge, faces right
  {
    const W = 60;
    const H = 42;
    const paint = (ctx: CanvasRenderingContext2D, a: boolean): void => {
      // bushy tail
      fillPoly(ctx, [[6, 20], [-2, 8], [4, 30], [16, 26]], 0xd9772e);
      circle(ctx, 4, 16, 6, 0xf0f0e6); // tail tip
      // legs (alternate)
      const lx = a ? [16, 40] : [22, 34];
      for (const x of lx) {
        rect(ctx, x, 26, 4, 12, 0xd9772e);
        rect(ctx, x, 34, 4, 4, 0x2b2733);
      }
      // body
      ellipse(ctx, 30, 22, 18, 9, 0xd9772e);
      ellipse(ctx, 30, 26, 15, 4, 0xf0f0e6); // white belly
      // head + snout
      ellipse(ctx, 46, 18, 8, 7, 0xd9772e);
      fillPoly(ctx, [[52, 15], [60, 18], [52, 21]], 0xe08c48); // snout
      circle(ctx, 59, 18, 1.6, 0x2b2733); // nose
      fillPoly(ctx, [[44, 12], [42, 3], [49, 9]], 0xd9772e); // ear
      fillPoly(ctx, [[45, 11], [43.5, 6], [47.5, 9]], 0x2b2733);
      ellipse(ctx, 47, 20, 4, 2.4, 0xf0f0e6); // cheek
      circle(ctx, 47, 16, 1.5, 0x2b2733); // eye
    };
    registerSheet(tm, "fox", W, H, 2, (ctx, i) => paint(ctx, i === 0));
  }

  // bear — 2-frame lumber, feet at the bottom edge, faces right
  {
    const W = 78;
    const H = 56;
    const paint = (ctx: CanvasRenderingContext2D, a: boolean): void => {
      const lx = a ? [14, 46] : [22, 38];
      for (const x of lx) {
        rect(ctx, x, 36, 9, 18, 0x4a3320);
        rect(ctx, x, 50, 9, 4, 0x2b1d12);
      }
      ellipse(ctx, 38, 30, 27, 17, 0x6b4a2f); // body
      ellipse(ctx, 38, 38, 22, 8, 0x543b26); // belly shade
      ellipse(ctx, 30, 22, 12, 6, 0x7d5836); // back highlight
      // head
      ellipse(ctx, 60, 24, 12, 11, 0x6b4a2f);
      circle(ctx, 55, 14, 4, 0x543b26); // ear
      circle(ctx, 66, 14, 4, 0x543b26);
      fillPoly(ctx, [[64, 24], [74, 26], [74, 31], [62, 31]], 0x8a6540); // snout
      circle(ctx, 73, 27, 2, 0x2b1d12); // nose
      circle(ctx, 58, 21, 1.6, 0x2b1d12); // eye
    };
    registerSheet(tm, "bear", W, H, 2, (ctx, i) => paint(ctx, i === 0));
  }

  // little shop icon for the menu button
  {
    const s = surface(30, 30);
    const ctx = s.ctx;
    rect(ctx, 5, 13, 20, 14, C.gunWood); // stall body
    rect(ctx, 5, 13, 20, 3, C.gunWoodLit);
    // striped awning
    for (let i = 0; i < 5; i++) {
      fillPoly(ctx, [[3 + i * 4.8, 13], [7.8 + i * 4.8, 13], [5.4 + i * 4.8, 7]], i % 2 ? C.blood : C.paper);
    }
    rect(ctx, 13, 19, 4, 8, C.gunWoodLit); // door
    register(tm, "shop-icon", s);
  }
}

/** Entry point — call once from BootScene. */
export function generateAllTextures(tm: TM): void {
  buildDuck(tm);
  buildBoss(tm);
  buildCroc(tm);
  buildFx(tm);
  buildScenery(tm);
  buildHudIcons(tm);
  buildPowerIcons(tm);
  buildBadges(tm);
  buildExtras(tm);
  buildGuns(tm);
  buildCritters(tm);
}

export const DuckFrame = { W: DUCK_W, H: DUCK_H };
export const CrocFrame = { W: CROC_W, H: CROC_H };
