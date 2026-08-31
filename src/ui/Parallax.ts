/**
 * The layered, drifting backdrop shared by the menu and the game.
 * Pure procedural scenery: gradient sky, sun/moon, three hill silhouettes,
 * a tree line, a grass band and foreground reeds — plus slow-scrolling clouds.
 */

import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH, GROUND_Y } from "../constants";
import { Palette as C } from "../art/palette";
import { mulberry32 } from "../art/draw";
import type { TimeOfDay } from "../data/levels";

interface Skin {
  skyTop: number;
  skyBottom: number;
  hills: [number, number, number];
  disc: "sun" | "moon";
  ground: number;
  groundDark: number;
  stars: number;
  ambient: number; // overlay darkness 0..1
}

const SKINS: Record<TimeOfDay, Skin> = {
  day: {
    skyTop: C.sky1Day,
    skyBottom: C.sky2Day,
    hills: [C.hillFar, C.hillMid, C.hillNear],
    disc: "sun",
    ground: C.grass,
    groundDark: C.grassDark,
    stars: 0,
    ambient: 0,
  },
  dusk: {
    skyTop: C.sky1Dusk,
    skyBottom: C.sky2Dusk,
    hills: [0x51608f, 0x3f5f57, 0x2c4a3c],
    disc: "sun",
    ground: 0x5c934a,
    groundDark: 0x3c6a30,
    stars: 30,
    ambient: 0.12,
  },
  night: {
    skyTop: C.sky1Night,
    skyBottom: C.sky2Night,
    hills: [0x28305f, 0x233a3a, 0x1a2b2a],
    disc: "moon",
    ground: 0x33623a,
    groundDark: 0x21401f,
    stars: 90,
    ambient: 0.3,
  },
};

export class Parallax {
  private readonly scene: Phaser.Scene;
  private readonly clouds: Phaser.GameObjects.Image[] = [];
  private readonly container: Phaser.GameObjects.Container;

  constructor(scene: Phaser.Scene, tod: TimeOfDay) {
    this.scene = scene;
    this.container = scene.add.container(0, 0).setDepth(-100);
    const skin = SKINS[tod];
    const rng = mulberry32(1337 + tod.length);

    // sky
    const sky = scene.add.graphics();
    sky.fillGradientStyle(skin.skyTop, skin.skyTop, skin.skyBottom, skin.skyBottom, 1);
    sky.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    this.container.add(sky);

    // stars (dusk/night)
    if (skin.stars > 0) {
      const g = scene.add.graphics();
      for (let i = 0; i < skin.stars; i++) {
        const x = rng() * GAME_WIDTH;
        const y = rng() * (GROUND_Y - 140);
        g.fillStyle(0xffffff, 0.5 + rng() * 0.5);
        g.fillRect(x, y, rng() < 0.15 ? 2 : 1, rng() < 0.15 ? 2 : 1);
      }
      this.container.add(g);
    }

    // sun / moon
    const disc = scene.add.image(GAME_WIDTH * 0.78, 96, skin.disc).setScale(1.1);
    if (skin.disc === "sun") disc.setAlpha(0.95);
    this.container.add(disc);

    // hill silhouettes, far -> near
    const hillBands: Array<[yBase: number, amp: number, color: number]> = [
      [GROUND_Y - 96, 34, skin.hills[0]],
      [GROUND_Y - 58, 26, skin.hills[1]],
      [GROUND_Y - 24, 20, skin.hills[2]],
    ];
    for (const [yBase, amp, color] of hillBands) {
      this.container.add(this.hill(yBase, amp, color, rng));
    }

    // tree line just behind the ground
    const treeRng = mulberry32(99);
    for (let x = -20; x < GAME_WIDTH + 40; x += 120 + treeRng() * 80) {
      const t = scene.add
        .image(x, GROUND_Y - 4, "tree")
        .setOrigin(0.5, 1)
        .setScale(0.7 + treeRng() * 0.4);
      if (skin.ambient > 0) t.setTint(this.darken(0xffffff, skin.ambient));
      this.container.add(t);
    }

    // ground band
    const ground = scene.add.graphics();
    ground.fillStyle(skin.ground, 1);
    ground.fillRect(0, GROUND_Y, GAME_WIDTH, GAME_HEIGHT - GROUND_Y);
    ground.fillStyle(skin.groundDark, 1);
    ground.fillRect(0, GROUND_Y, GAME_WIDTH, 5);
    for (let i = 0; i < 60; i++) {
      ground.fillStyle(skin.groundDark, 0.5);
      ground.fillRect(rng() * GAME_WIDTH, GROUND_Y + 8 + rng() * (GAME_HEIGHT - GROUND_Y - 12), 3, 2);
    }
    this.container.add(ground);

    // foreground bushes + reeds
    const fg = mulberry32(7);
    for (let x = 10; x < GAME_WIDTH; x += 150 + fg() * 90) {
      this.container.add(
        scene.add.image(x, GROUND_Y + 14, "bush").setOrigin(0.5, 1).setScale(0.8 + fg() * 0.5),
      );
    }
    for (let x = -10; x < GAME_WIDTH + 20; x += 60 + fg() * 50) {
      this.container.add(
        scene.add.image(x, GAME_HEIGHT + 6, "reed").setOrigin(0.5, 1).setScale(0.9 + fg() * 0.7),
      );
    }

    // clouds (scrolling)
    for (let i = 0; i < 6; i++) {
      const key = rng() < 0.5 ? "cloud0" : "cloud1";
      const c = scene.add
        .image(rng() * GAME_WIDTH, 40 + rng() * 180, key)
        .setAlpha(0.75 + rng() * 0.25)
        .setScale(0.8 + rng() * 1.1)
        .setDepth(-90);
      c.setData("speed", 6 + rng() * 14);
      if (skin.ambient > 0) c.setTint(this.darken(0xffffff, skin.ambient * 0.6));
      this.clouds.push(c);
    }

    // ambient darkening overlay
    if (skin.ambient > 0) {
      const veil = scene.add
        .rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x0a0e24, skin.ambient)
        .setOrigin(0)
        .setDepth(-80);
      this.container.add(veil);
    }
  }

  private hill(
    yBase: number,
    amp: number,
    color: number,
    rng: () => number,
  ): Phaser.GameObjects.Graphics {
    const g = this.scene.add.graphics();
    g.fillStyle(color, 1);
    const pts: Phaser.Types.Math.Vector2Like[] = [{ x: -20, y: GAME_HEIGHT }];
    const phase = rng() * 10;
    const phase2 = rng() * 10;
    for (let x = -20; x <= GAME_WIDTH + 20; x += 16) {
      const y =
        yBase +
        Math.sin(x * 0.012 + phase) * amp +
        Math.sin(x * 0.031 + phase2) * amp * 0.35;
      pts.push({ x, y });
    }
    pts.push({ x: GAME_WIDTH + 20, y: GAME_HEIGHT });
    g.fillPoints(pts, true);
    return g;
  }

  private darken(hex: number, amt: number): number {
    const r = ((hex >> 16) & 0xff) * (1 - amt);
    const gg = ((hex >> 8) & 0xff) * (1 - amt);
    const b = (hex & 0xff) * (1 - amt);
    return (Math.round(r) << 16) | (Math.round(gg) << 8) | Math.round(b);
  }

  update(_time: number, deltaMs: number): void {
    const dx = deltaMs / 1000;
    for (const c of this.clouds) {
      c.x -= (c.getData("speed") as number) * dx;
      if (c.x < -c.displayWidth) c.x = GAME_WIDTH + c.displayWidth * 0.5;
    }
  }

  destroy(): void {
    this.container.destroy();
    this.clouds.forEach((c) => c.destroy());
    this.clouds.length = 0;
  }
}
