/**
 * The level-5 boss: a giant crowned mallard with a health bar.
 * It sweeps along the top of the screen, periodically diving low (easier to hit,
 * worth chip damage) or summoning a pair of ordinary ducks.
 *
 * Events:
 *   boss.on("spawnMinions", (n:number) => ...)
 *   boss.on("hurt",        () => ...)      took damage
 *   boss.on("defeated",    () => ...)      hp reached 0, death anim started
 */

import Phaser from "phaser";
import { GAME_WIDTH } from "../constants";

export class BossDuck extends Phaser.GameObjects.Sprite {
  readonly maxHp: number;
  hp: number;
  alive = true;

  private t = 0;
  private baseY = 120;
  private attackAt: number;
  private diving = false;
  private summons = 0;

  constructor(scene: Phaser.Scene, maxHp: number) {
    super(scene, GAME_WIDTH / 2, 120, "boss", 0);
    scene.add.existing(this);
    this.maxHp = maxHp;
    this.hp = maxHp;
    this.setDepth(25).setScale(1.15);

    if (!scene.anims.exists("boss-flap")) {
      scene.anims.create({
        key: "boss-flap",
        frames: scene.anims.generateFrameNumbers("boss", { start: 0, end: 1 }),
        frameRate: 4,
        repeat: -1,
      });
    }
    this.play("boss-flap");
    this.attackAt = scene.time.now + 2600;
  }

  tick(deltaMs: number, targetX: number): void {
    if (!this.alive) return;
    this.t += deltaMs / 1000;

    if (!this.diving) {
      this.x = GAME_WIDTH / 2 + Math.sin(this.t * 0.6) * (GAME_WIDTH / 2 - 130);
      this.y = this.baseY + Math.sin(this.t * 2.2) * 14;
      this.setFlipX(Math.cos(this.t * 0.6) < 0);

      if (this.scene.time.now >= this.attackAt) {
        this.attackAt =
          this.scene.time.now + Phaser.Math.Between(3200, 4600) - Math.min(1500, this.summons * 200);
        if (Math.random() < 0.55) this.dive(targetX);
        else this.summon();
      }
    }
  }

  private dive(targetX: number): void {
    this.diving = true;
    const tx = Phaser.Math.Clamp(targetX, 120, GAME_WIDTH - 120);
    this.scene.tweens.chain({
      targets: this,
      tweens: [
        { x: tx, y: 350, duration: 620, ease: "quad.in" },
        { y: 360, duration: 180 },
        { x: GAME_WIDTH / 2, y: this.baseY, duration: 640, ease: "quad.out" },
      ],
      onComplete: () => {
        this.diving = false;
      },
    });
  }

  private summon(): void {
    this.summons++;
    this.emit("spawnMinions", 2);
    this.scene.tweens.add({ targets: this, scaleX: 1.3, scaleY: 1.0, yoyo: true, duration: 120 });
  }

  hit(dmg: number): void {
    if (!this.alive) return;
    this.hp = Math.max(0, this.hp - dmg);
    this.emit("hurt");
    this.setTintFill(0xffffff);
    this.scene.time.delayedCall(60, () => this.alive && this.clearTint());

    if (this.hp <= 0) this.defeat();
  }

  private defeat(): void {
    this.alive = false;
    this.emit("defeated");
    this.clearTint();
    this.stop();
    this.scene.tweens.killTweensOf(this);
    this.scene.tweens.add({
      targets: this,
      angle: 540,
      y: 520,
      scaleX: 0.6,
      scaleY: 0.6,
      duration: 1400,
      ease: "quad.in",
    });
  }
}
