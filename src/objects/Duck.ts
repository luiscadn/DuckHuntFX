/**
 * A single duck. Handles its own flight AI (upward drift + weave + random jukes),
 * flap animation, and its death → tumble → splash sequence.
 *
 * Comes in several kinds (see data/ducks.ts): normal, fast, armored, golden, bomb.
 *
 * The scene listens for:
 *   duck.on("escaped", d => ...)   duck left through the top of the screen
 *   duck.on("bagged",  d => ...)   duck was shot and hit the ground
 */

import Phaser from "phaser";
import { GAME_WIDTH, GROUND_Y } from "../constants";
import { DUCK_KINDS, type DuckKind } from "../data/ducks";

export type DuckState = "alive" | "falling" | "done";

export class Duck extends Phaser.GameObjects.Sprite {
  state: DuckState = "alive";
  readonly speed: number;
  readonly bornAt: number;
  readonly kind: DuckKind;

  private hp: number;
  private readonly baseScale: number;
  private vx: number;
  private vy: number;
  private baseY = 0;
  private weavePhase = Math.random() * Math.PI * 2;
  private jukeAt: number;
  private speedMul = 1; // Freeze power
  private sparkleAcc = 0;
  private pulseTween?: Phaser.Tweens.Tween;

  constructor(scene: Phaser.Scene, speed: number, kind: DuckKind = DUCK_KINDS.normal) {
    const x = Phaser.Math.Between(80, GAME_WIDTH - 80);
    const y = GROUND_Y - Phaser.Math.Between(0, 30);
    super(scene, x, y, "duck", 1);
    scene.add.existing(this);

    this.kind = kind;
    this.hp = kind.hp;
    this.baseScale = kind.scale;
    this.speed = speed * kind.speedMul;
    this.bornAt = scene.time.now;
    this.setDepth(20);
    this.setScale(kind.scale);
    this.setTint(kind.tint);

    const dir = Math.random() < 0.5 ? -1 : 1;
    this.vx = dir * this.speed * Phaser.Math.FloatBetween(0.45, 0.8);
    this.vy = -this.speed * Phaser.Math.FloatBetween(0.7, 1);
    this.jukeAt = scene.time.now + this.nextJuke();

    if (kind.isDecoy) {
      // a rubber duck bobbing across the water — never flies up
      this.setTexture("duck-decoy");
      const fromLeft = Math.random() < 0.5;
      this.x = fromLeft ? -30 : GAME_WIDTH + 30;
      this.baseY = Phaser.Math.Between(GROUND_Y - 120, GROUND_Y - 36);
      this.y = this.baseY;
      this.vx = (fromLeft ? 1 : -1) * this.speed;
      this.vy = 0;
      this.setFlipX(!fromLeft);
      this.setInteractive({ pixelPerfect: false, useHandCursor: false });
      return;
    }

    if (!scene.anims.exists("duck-flap")) {
      scene.anims.create({
        key: "duck-flap",
        frames: scene.anims.generateFrameNumbers("duck", { start: 0, end: 3 }),
        frameRate: 12,
        repeat: -1,
      });
    }
    this.play("duck-flap");
    if (kind.id === "fast" && this.anims.currentAnim) this.anims.timeScale = 1.5;

    if (kind.pulse) {
      this.pulseTween = scene.tweens.add({
        targets: this,
        scaleX: kind.scale * 1.14,
        scaleY: kind.scale * 1.14,
        yoyo: true,
        repeat: -1,
        duration: 340,
        ease: "sine.inOut",
      });
    }

    this.setInteractive({ pixelPerfect: false, useHandCursor: false });
  }

  private nextJuke(): number {
    return this.kind.id === "fast"
      ? Phaser.Math.Between(300, 700)
      : Phaser.Math.Between(600, 1300);
  }

  /** 1 = normal, <1 = slowed by Freeze power. */
  setSpeedMul(mul: number): void {
    this.speedMul = mul;
    if (this.anims.currentAnim) this.anims.timeScale = mul <= 0.2 ? 0.25 : 1;
  }

  /** Duck runs for the top edge — used when a wave is ending. */
  panic(): void {
    if (this.state !== "alive") return;
    this.vy = -this.speed * 1.6;
    this.vx *= 0.4;
  }

  tick(_time: number, deltaMs: number): void {
    const dt = (deltaMs / 1000) * this.speedMul;

    if (this.kind.isDecoy) {
      if (this.state !== "alive") return;
      this.x += this.vx * dt;
      this.y = this.baseY + Math.sin(this.scene.time.now / 260 + this.weavePhase) * 5;
      this.rotation = Math.sin(this.scene.time.now / 320 + this.weavePhase) * 0.12;
      if (this.x < -50 || this.x > GAME_WIDTH + 50) {
        this.state = "done";
        this.emit("escaped", this);
      }
      return;
    }

    if (this.state === "alive") {
      if (this.scene.time.now >= this.jukeAt) {
        this.jukeAt = this.scene.time.now + this.nextJuke();
        this.vx = Phaser.Math.FloatBetween(0.4, 0.9) * this.speed * (Math.random() < 0.5 ? -1 : 1);
        this.vy = -Phaser.Math.FloatBetween(0.55, 1.05) * this.speed;
      }
      this.weavePhase += dt * (this.kind.id === "fast" ? 9 : 6);
      const weave = Math.sin(this.weavePhase) * this.speed * 0.35;

      this.x += (this.vx + weave) * dt;
      this.y += this.vy * dt;

      if (this.x < 46 && this.vx < 0) this.vx = Math.abs(this.vx);
      if (this.x > GAME_WIDTH - 46 && this.vx > 0) this.vx = -Math.abs(this.vx);
      this.setFlipX(this.vx + weave < 0);
      this.rotation = Phaser.Math.Clamp(this.vy / this.speed, -1, 0.2) * 0.18;

      if (this.kind.sparkle) this.emitSparkle(deltaMs);

      if (this.y < -60) {
        this.state = "done";
        this.emit("escaped", this);
      }
    } else if (this.state === "falling") {
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      this.vy += 900 * dt;
      this.rotation += dt * 9;
      if (this.y >= GROUND_Y + 6) {
        this.state = "done";
        this.landSplash();
        this.emit("bagged", this);
      }
    }
  }

  private emitSparkle(deltaMs: number): void {
    this.sparkleAcc += deltaMs;
    if (this.sparkleAcc < 110) return;
    this.sparkleAcc = 0;
    const s = this.scene.add
      .image(this.x + Phaser.Math.Between(-14, 14), this.y + Phaser.Math.Between(-10, 10), "star")
      .setDepth(this.depth + 1)
      .setScale(Phaser.Math.FloatBetween(0.4, 0.9));
    this.scene.tweens.add({ targets: s, scale: 0, alpha: 0, duration: 360, onComplete: () => s.destroy() });
  }

  /**
   * A shot landed on this duck. Returns true if it was bagged (killed), false if
   * it only took damage (armored duck's first hit).
   */
  hit(): boolean {
    if (this.state !== "alive") return false;

    if (this.hp > 1) {
      this.hp--;
      if (this.kind.hurtTint) this.setTint(this.kind.hurtTint);
      this.vx += Phaser.Math.FloatBetween(-30, 30);
      this.scene.tweens.add({
        targets: this,
        scaleX: this.baseScale * 1.2,
        scaleY: this.baseScale * 0.85,
        yoyo: true,
        duration: 90,
      });
      return false;
    }

    this.state = "falling";
    this.pulseTween?.stop();
    this.stop();
    this.setTexture("duck-hit");
    this.setScale(this.baseScale);
    this.disableInteractive();
    this.vx = Phaser.Math.FloatBetween(-40, 40);
    this.vy = -120;
    this.scene.tweens.add({
      targets: this,
      scaleX: this.baseScale * 1.25,
      scaleY: this.baseScale * 1.25,
      yoyo: true,
      duration: 70,
    });
    return true;
  }

  /** Force-bag this duck regardless of remaining hp (Clear power, bomb blast). */
  bag(): void {
    if (this.state !== "alive") return;
    this.hp = 1;
    this.hit();
  }

  private landSplash(): void {
    const puff = this.scene.add.image(this.x, GROUND_Y + 4, "puff").setDepth(19).setScale(0.6);
    this.scene.tweens.add({
      targets: puff,
      scale: 1.6,
      alpha: 0,
      duration: 300,
      onComplete: () => puff.destroy(),
    });
  }
}
