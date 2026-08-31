/**
 * Builds every texture the game uses, once, at boot. No external image files.
 *
 * Naming:
 *   duck        4-frame flap sheet (up, mid, down, mid), faces right
 *   duck-hit    single tumbling / shot frame
 *   dog         3-frame sheet (sniff, jump, laugh)
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

function drawDuckBody(ctx: CanvasRenderingContext2D): void {
  // tail
  fillPoly(ctx, [[16, 22], [3, 17], [17, 31]], C.duckBody);
  fillPoly(ctx, [[3, 17], [11, 20], [6, 25]], C.duckWing);
  // body
  ellipse(ctx, 30, 27, 15, 10, C.duckBody);
  ellipse(ctx, 28, 32, 12, 6, C.duckBodyShade);
  ctx.globalAlpha = 0.25;
  ellipse(ctx, 27, 21, 10, 4, 0xffffff);
  ctx.globalAlpha = 1;
  // neck + head
  fillPoly(ctx, [[34, 21], [41, 9], [46, 16], [39, 27]], C.duckHead);
  ellipse(ctx, 46, 15, 8, 7, C.duckHead);
  ellipse(ctx, 46, 18, 7, 4, C.duckHeadShade);
  // white collar
  line(ctx, 39, 21, 45, 24, C.duckBody, 3);
  // eye
  circle(ctx, 49, 13, 1.7, C.duckEye);
  circle(ctx, 49.6, 12.4, 0.7, C.paper);
  // beak
  fillPoly(ctx, [[53, 13], [63, 14], [63, 19], [53, 20]], C.duckBeak);
  fillPoly(ctx, [[53, 18], [63, 19], [63, 21], [53, 20]], C.duckBeakShade);
  line(ctx, 55, 16.5, 62, 16.5, C.duckBeakShade, 1);
}

function drawDuckWing(ctx: CanvasRenderingContext2D, phase: "up" | "mid" | "down"): void {
  if (phase === "up") {
    fillPoly(ctx, [[28, 20], [19, 3], [35, 6], [37, 21]], C.duckWing);
    fillPoly(ctx, [[19, 3], [26, 6], [24, 11]], C.duckBodyShade);
  } else if (phase === "mid") {
    fillPoly(ctx, [[27, 22], [5, 15], [10, 27], [29, 29]], C.duckWing);
    fillPoly(ctx, [[5, 15], [13, 18], [11, 23]], C.duckBodyShade);
  } else {
    fillPoly(ctx, [[28, 30], [21, 45], [37, 43], [37, 30]], C.duckWing);
    fillPoly(ctx, [[21, 45], [28, 43], [26, 38]], C.duckBodyShade);
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
  fillPoly(ctx, [[30, 22], [40, 6], [48, 12], [40, 26]], C.duckWing);
  // X eye
  line(ctx, 47, 11, 51, 15, C.duckEye, 1.6);
  line(ctx, 51, 11, 47, 15, C.duckEye, 1.6);
  register(tm, "duck-hit", s);
}

// ── DOG ────────────────────────────────────────────────────────────

const DOG_W = 76;
const DOG_H = 58;

function buildDog(tm: TM): void {
  registerSheet(tm, "dog", DOG_W, DOG_H, 3, (ctx, i) => {
    if (i === 0) drawDogSniff(ctx);
    else if (i === 1) drawDogJump(ctx);
    else drawDogLaugh(ctx);
  });
}

function drawDogSniff(ctx: CanvasRenderingContext2D): void {
  // tail
  fillPoly(ctx, [[12, 30], [4, 16], [18, 26]], C.dogBody);
  // legs
  rect(ctx, 20, 42, 5, 12, C.dogBodyShade);
  rect(ctx, 40, 42, 5, 12, C.dogBodyShade);
  // body
  ellipse(ctx, 34, 34, 21, 12, C.dogBody);
  ellipse(ctx, 34, 40, 17, 7, C.dogWhite);
  // head down-forward
  ellipse(ctx, 54, 36, 12, 10, C.dogBody);
  fillPoly(ctx, [[60, 33], [72, 36], [72, 44], [58, 43]], C.dogBody);
  ellipse(ctx, 66, 41, 6, 3, C.dogWhite);
  circle(ctx, 71, 39, 2.4, C.dogNose);
  // ear
  fillPoly(ctx, [[47, 26], [43, 44], [54, 34]], C.dogEar);
  // eye
  circle(ctx, 55, 32, 1.6, C.dogNose);
}

function drawDogJump(ctx: CanvasRenderingContext2D): void {
  ctx.save();
  ctx.translate(38, 30);
  ctx.rotate(-0.18);
  ctx.translate(-38, -30);
  // back legs tucked
  rect(ctx, 22, 40, 5, 10, C.dogBodyShade);
  // body more upright
  ellipse(ctx, 36, 32, 18, 13, C.dogBody);
  ellipse(ctx, 36, 38, 14, 7, C.dogWhite);
  // front paws reaching up
  fillPoly(ctx, [[48, 20], [56, 8], [60, 12], [54, 26]], C.dogBody);
  fillPoly(ctx, [[44, 22], [50, 10], [54, 14], [50, 28]], C.dogBodyShade);
  // head up, mouth open
  ellipse(ctx, 52, 20, 11, 10, C.dogBody);
  fillPoly(ctx, [[58, 16], [70, 12], [70, 20], [58, 22]], C.dogBody);
  fillPoly(ctx, [[58, 20], [70, 22], [70, 27], [57, 25]], C.dogBodyShade);
  ellipse(ctx, 62, 21, 3, 2, C.dogTongue);
  circle(ctx, 69, 14, 2.2, C.dogNose);
  fillPoly(ctx, [[45, 10], [41, 24], [51, 16]], C.dogEar);
  circle(ctx, 53, 17, 1.6, C.dogNose);
  ctx.restore();
}

function drawDogLaugh(ctx: CanvasRenderingContext2D): void {
  // arms resting on belly
  rect(ctx, 18, 40, 6, 12, C.dogBodyShade);
  rect(ctx, 44, 40, 6, 12, C.dogBodyShade);
  ellipse(ctx, 34, 36, 20, 13, C.dogBody);
  ellipse(ctx, 34, 42, 16, 7, C.dogWhite);
  // paws clutching belly
  ellipse(ctx, 24, 34, 5, 4, C.dogBodyShade);
  ellipse(ctx, 44, 34, 5, 4, C.dogBodyShade);
  // head tipped back, wide open laughing mouth
  ellipse(ctx, 40, 20, 13, 11, C.dogBody);
  fillPoly(ctx, [[30, 10], [24, 24], [36, 16]], C.dogEar);
  fillPoly(ctx, [[50, 10], [56, 24], [44, 16]], C.dogEar);
  ellipse(ctx, 43, 24, 6, 5, C.dogNose);
  ellipse(ctx, 43, 26, 4, 3, C.dogTongue);
  circle(ctx, 40, 9, 2.4, C.dogNose);
  // squeezed-shut happy eyes
  line(ctx, 33, 17, 39, 19, C.dogNose, 1.6);
  line(ctx, 47, 19, 53, 17, C.dogNose, 1.6);
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

/** Entry point — call once from BootScene. */
export function generateAllTextures(tm: TM): void {
  buildDuck(tm);
  buildDog(tm);
  buildFx(tm);
  buildScenery(tm);
  buildHudIcons(tm);
  buildPowerIcons(tm);
  buildBadges(tm);
}

export const DuckFrame = { W: DUCK_W, H: DUCK_H };
export const DogFrame = { W: DOG_W, H: DOG_H };
