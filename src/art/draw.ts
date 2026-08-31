/**
 * Procedural art toolkit.
 *
 * Instead of shipping PNGs, every sprite and every piece of scenery is drawn at a
 * small internal resolution with the Canvas 2D API and registered as a Phaser
 * texture. The textures are then sampled with NEAREST filtering, which gives the
 * whole game a crisp, cohesive low-res look (one palette, one pixel size).
 */

import { css } from "./palette";

export interface Surface {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  w: number;
  h: number;
}

export function surface(w: number, h: number): Surface {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;
  return { canvas, ctx, w, h };
}

export function register(
  textures: Phaser.Textures.TextureManager,
  key: string,
  s: Surface,
): void {
  if (textures.exists(key)) textures.remove(key);
  textures.addCanvas(key, s.canvas);
}

/**
 * Render N equally sized frames into one strip and register it as a spritesheet.
 * `paint(ctx, i)` draws frame `i` with the origin already translated to that cell.
 */
export function registerSheet(
  textures: Phaser.Textures.TextureManager,
  key: string,
  frameW: number,
  frameH: number,
  count: number,
  paint: (ctx: CanvasRenderingContext2D, index: number) => void,
): void {
  const s = surface(frameW * count, frameH);
  for (let i = 0; i < count; i++) {
    s.ctx.save();
    s.ctx.translate(i * frameW, 0);
    s.ctx.beginPath();
    s.ctx.rect(0, 0, frameW, frameH);
    s.ctx.clip();
    paint(s.ctx, i);
    s.ctx.restore();
  }
  if (textures.exists(key)) textures.remove(key);
  const tex = textures.addCanvas(key, s.canvas)!;
  for (let i = 0; i < count; i++) tex.add(i, 0, i * frameW, 0, frameW, frameH);
}

// ── primitives ─────────────────────────────────────────────────────

export function fillPoly(ctx: CanvasRenderingContext2D, pts: number[][], color: number): void {
  ctx.fillStyle = css(color);
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
  ctx.fill();
}

export function ellipse(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  color: number,
): void {
  ctx.fillStyle = css(color);
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}

export function circle(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, color: number): void {
  ellipse(ctx, cx, cy, r, r, color);
}

export function rect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: number,
): void {
  ctx.fillStyle = css(color);
  ctx.fillRect(x, y, w, h);
}

export function line(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: number,
  width = 1,
): void {
  ctx.strokeStyle = css(color);
  ctx.lineWidth = width;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

/** A soft vertical gradient fill (used for the sky). */
export function verticalGradient(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  top: number,
  bottom: number,
): void {
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, css(top));
  g.addColorStop(1, css(bottom));
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
}

/** Deterministic pseudo-random so scenery is stable between reloads. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
