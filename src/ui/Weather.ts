/**
 * Per-level weather overlay: rain (with lightning), fog, or wind.
 * `windForce()` is read by GameScene to nudge the ducks sideways.
 */

import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH } from "../constants";
import { Audio } from "../audio/AudioBus";

export type WeatherKind = "clear" | "rain" | "fog" | "wind";

export class Weather {
  readonly kind: WeatherKind;
  private readonly scene: Phaser.Scene;
  private layer: Phaser.GameObjects.Container;
  private emitter?: Phaser.GameObjects.Particles.ParticleEmitter;
  private fogSprites: Phaser.GameObjects.Image[] = [];
  private lightningAt = 0;
  private wind = 0;

  constructor(scene: Phaser.Scene, kind: WeatherKind) {
    this.scene = scene;
    this.kind = kind;
    this.layer = scene.add.container(0, 0).setDepth(85);

    if (kind === "rain") this.buildRain();
    else if (kind === "fog") this.buildFog();
    else if (kind === "wind") this.buildWind();
  }

  private buildRain(): void {
    this.layer.add(
      this.scene.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x0a1428, 0.22).setOrigin(0),
    );
    this.emitter = this.scene.add
      .particles(0, -20, "raindrop", {
        x: { min: -40, max: GAME_WIDTH },
        y: -20,
        lifespan: 700,
        speedY: { min: 900, max: 1150 },
        speedX: { min: -260, max: -180 },
        scaleY: { min: 0.8, max: 1.6 },
        scaleX: 1,
        quantity: 6,
        frequency: 16,
        alpha: { min: 0.4, max: 0.8 },
        blendMode: "NORMAL",
      })
      .setDepth(86);
    this.lightningAt = this.scene.time.now + Phaser.Math.Between(4000, 9000);
  }

  private buildFog(): void {
    this.layer.add(
      this.scene.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0xdfe6ef, 0.16).setOrigin(0),
    );
    for (let i = 0; i < 5; i++) {
      const f = this.scene.add
        .image(Math.random() * GAME_WIDTH, 120 + Math.random() * 220, Math.random() < 0.5 ? "cloud0" : "cloud1")
        .setScale(3 + Math.random() * 3)
        .setAlpha(0.14 + Math.random() * 0.12)
        .setTint(0xe8edf5);
      f.setData("spd", 10 + Math.random() * 18);
      this.fogSprites.push(f);
      this.layer.add(f);
    }
  }

  private buildWind(): void {
    this.wind = 55;
    this.emitter = this.scene.add
      .particles(GAME_WIDTH + 30, 0, "gust", {
        x: GAME_WIDTH + 30,
        y: { min: 40, max: GAME_HEIGHT - 120 },
        lifespan: 1100,
        speedX: { min: -900, max: -650 },
        scaleX: { min: 0.8, max: 2.2 },
        alpha: { min: 0.15, max: 0.4 },
        quantity: 1,
        frequency: 90,
      })
      .setDepth(86);
  }

  /** Lateral push applied to ducks, px/s. */
  windForce(): number {
    return this.wind;
  }

  update(deltaMs: number): void {
    const dt = deltaMs / 1000;
    for (const f of this.fogSprites) {
      f.x -= (f.getData("spd") as number) * dt;
      if (f.x < -f.displayWidth) f.x = GAME_WIDTH + f.displayWidth * 0.5;
    }
    if (this.kind === "rain" && this.scene.time.now >= this.lightningAt) {
      this.lightningAt = this.scene.time.now + Phaser.Math.Between(5000, 11000);
      this.strike();
    }
  }

  private strike(): void {
    const flash = this.scene.add
      .rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0xffffff, 0.85)
      .setOrigin(0)
      .setDepth(120);
    this.scene.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 260,
      ease: "quad.in",
      onComplete: () => flash.destroy(),
    });
    Audio.thunder();
  }

  destroy(): void {
    this.emitter?.destroy();
    this.fogSprites.forEach((f) => f.destroy());
    this.fogSprites = [];
    this.layer.destroy();
  }
}

/** Pick weather for a level — later/darker levels lean stormy. */
export function pickWeather(level: number): WeatherKind {
  const r = Math.random();
  if (level <= 1) return r < 0.75 ? "clear" : "wind";
  if (level === 2) return r < 0.6 ? "clear" : r < 0.8 ? "wind" : "fog";
  if (level === 3) return r < 0.4 ? "clear" : r < 0.7 ? "rain" : "fog";
  if (level === 4) return r < 0.3 ? "wind" : r < 0.7 ? "rain" : "fog";
  return r < 0.6 ? "rain" : "fog";
}
