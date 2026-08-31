/**
 * A single duck. Handles its own flight AI (upward drift + weave + random jukes),
 * flap animation, and its death → tumble → splash sequence.
 *
 * The scene listens for two events:
 *   duck.on("escaped", d => ...)   duck left through the top of the screen
 *   duck.on("bagged",  d => ...)   duck was shot and hit the ground
 */

import Phaser from "phaser";
import { GAME_WIDTH, GROUND_Y } from "../constants";

export type DuckState = "alive" | "falling" | "done";

export class Duck extends Phaser.GameObjects.Sprite {
  state: DuckState = "alive";
  readonly speed: number;
  readonly bornAt: number;

  private vx: number;
  private vy: number;
  private weavePhase = Math.random() * Math.PI * 2;
  private jukeAt: number;
  private speedMul = 1;

  constructor(scene: Phaser.Scene, speed: number) {
    const x = Phaser.Math.Between(80, GAME_WIDTH - 80);
    const y = GROUND_Y - Phaser.Math.Between(0, 30);
    super(scene, x, y, "duck", 1);
    scene.add.existing(this);

    this.speed = speed;
    this.bornAt = scene.time.now;
    this.setDepth(20);
    this.setScale(1);

    const dir = Math.random() < 0.5 ? -1 : 1;
    this.vx = dir * speed * Phaser.Math.FloatBetween(0.45, 0.8);
    this.vy = -speed * Phaser.Math.FloatBetween(0.7, 1);
    this.jukeAt = scene.time.now + Phaser.Math.Between(500, 1100);

    if (!scene.anims.exists("duck-flap")) {
      scene.anims.create({
        key: "duck-flap",
        frames: scene.anims.generateFrameNumbers("duck", { start: 0, end: 3 }),
        frameRate: 12,
        repeat: -1,
      });
    }
    this.play("duck-flap");

    this.setInteractive({ pixelPerfect: false, useHandCursor: false });
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

    if (this.state === "alive") {
      if (this.scene.time.now >= this.jukeAt) {
        this.jukeAt = this.scene.time.now + Phaser.Math.Between(600, 1300);
        this.vx = Phaser.Math.FloatBetween(0.4, 0.9) * this.speed * (Math.random() < 0.5 ? -1 : 1);
        this.vy = -Phaser.Math.FloatBetween(0.55, 1.05) * this.speed;
      }
      this.weavePhase += dt * 6;
      const weave = Math.sin(this.weavePhase) * this.speed * 0.35;

      this.x += (this.vx + weave) * dt;
      this.y += this.vy * dt;

      // bounce off the sides so ducks stay in play
      if (this.x < 46 && this.vx < 0) this.vx = Math.abs(this.vx);
      if (this.x > GAME_WIDTH - 46 && this.vx > 0) this.vx = -Math.abs(this.vx);
      this.setFlipX(this.vx + weave < 0);
      this.rotation = Phaser.Math.Clamp(this.vy / this.speed, -1, 0.2) * 0.18;

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

  /** Called by the scene when the crosshair is over this duck and a shot lands. */
  hit(): void {
    if (this.state !== "alive") return;
    this.state = "falling";
    this.stop();
    this.setTexture("duck-hit");
    this.disableInteractive();
    this.vx = Phaser.Math.FloatBetween(-40, 40);
    this.vy = -120;
    this.setTint(0xffffff);
    this.scene.tweens.add({ targets: this, scaleX: 1.25, scaleY: 1.25, yoyo: true, duration: 70 });
  }

  private landSplash(): void {
    const puff = this.scene.add
      .image(this.x, GROUND_Y + 4, "puff")
      .setDepth(19)
      .setScale(0.6);
    this.scene.tweens.add({
      targets: puff,
      scale: 1.6,
      alpha: 0,
      duration: 300,
      onComplete: () => puff.destroy(),
    });
  }
}
