/**
 * A boss. Three variants:
 *   rey    — the crowned mallard, the level-100 finale. Sweeps the top, dives.
 *   garza  — a heron; flies higher, dives fast like a spear, summons pigeons.
 *   jabali — a wild boar; patrols the ground and charges across it, summons foxes.
 *
 * Events:  boss.on("spawnMinions", (n, kind) => ...) · "hurt" · "defeated"
 */

import Phaser from "phaser";
import { GAME_WIDTH, GROUND_Y } from "../constants";
import type { BossVariant } from "../data/levels";
import type { DuckKindId } from "../data/ducks";

interface Def {
  name: string;
  tex: string;
  scale: number;
  ground: boolean;
  diveDurMs: number;
  attackMin: number;
  attackMax: number;
  minion: DuckKindId;
  baseY: number;
}

const DEFS: Record<BossVariant, Def> = {
  rey: { name: "EL REY PATO", tex: "boss", scale: 1.15, ground: false, diveDurMs: 620, attackMin: 3200, attackMax: 4600, minion: "normal", baseY: 120 },
  garza: { name: "LA GARZA", tex: "boss-garza", scale: 1.1, ground: false, diveDurMs: 360, attackMin: 2200, attackMax: 3400, minion: "pigeon", baseY: 96 },
  jabali: { name: "EL JABALÍ", tex: "boss-jabali", scale: 1.25, ground: true, diveDurMs: 520, attackMin: 2600, attackMax: 4000, minion: "fox", baseY: GROUND_Y + 8 },
};

export class Boss extends Phaser.GameObjects.Sprite {
  readonly maxHp: number;
  readonly variant: BossVariant;
  readonly displayName: string;
  hp: number;
  alive = true;

  private def: Def;
  private t = 0;
  private attackAt: number;
  private busy = false;
  private summons = 0;

  constructor(scene: Phaser.Scene, variant: BossVariant, maxHp: number) {
    const def = DEFS[variant];
    super(scene, GAME_WIDTH / 2, def.baseY, def.tex, 0);
    scene.add.existing(this);
    this.variant = variant;
    this.def = def;
    this.displayName = def.name;
    this.maxHp = maxHp;
    this.hp = maxHp;
    this.setDepth(25).setScale(def.scale);
    if (def.ground) this.setOrigin(0.5, 1);

    const animKey = `${def.tex}-move`;
    if (!scene.anims.exists(animKey)) {
      scene.anims.create({
        key: animKey,
        frames: scene.anims.generateFrameNumbers(def.tex, { start: 0, end: 1 }),
        frameRate: def.ground ? 6 : 4,
        repeat: -1,
      });
    }
    this.play(animKey);
    this.attackAt = scene.time.now + 2600;
  }

  tick(deltaMs: number, targetX: number): void {
    if (!this.alive || this.busy) return;
    this.t += deltaMs / 1000;

    if (this.def.ground) {
      this.x = GAME_WIDTH / 2 + Math.sin(this.t * 0.5) * (GAME_WIDTH / 2 - 110);
      this.setFlipX(Math.cos(this.t * 0.5) < 0);
    } else {
      this.x = GAME_WIDTH / 2 + Math.sin(this.t * 0.6) * (GAME_WIDTH / 2 - 130);
      this.y = this.def.baseY + Math.sin(this.t * 2.2) * 12;
      this.setFlipX(Math.cos(this.t * 0.6) < 0);
    }

    if (this.scene.time.now >= this.attackAt) {
      this.attackAt =
        this.scene.time.now + Phaser.Math.Between(this.def.attackMin, this.def.attackMax) - Math.min(1400, this.summons * 160);
      if (Math.random() < 0.55) this.attack(targetX);
      else this.summon();
    }
  }

  private attack(targetX: number): void {
    this.busy = true;
    if (this.def.ground) {
      // a charge across the screen and back
      const dir = targetX > GAME_WIDTH / 2 ? 1 : -1;
      this.setFlipX(dir < 0);
      this.scene.tweens.chain({
        targets: this,
        tweens: [
          { x: dir > 0 ? GAME_WIDTH - 60 : 60, duration: this.def.diveDurMs, ease: "quad.in" },
          { x: GAME_WIDTH / 2, duration: this.def.diveDurMs + 260, ease: "quad.out" },
        ],
        onComplete: () => (this.busy = false),
      });
    } else {
      const tx = Phaser.Math.Clamp(targetX, 120, GAME_WIDTH - 120);
      this.scene.tweens.chain({
        targets: this,
        tweens: [
          { x: tx, y: GROUND_Y - 110, duration: this.def.diveDurMs, ease: "quad.in" },
          { y: GROUND_Y - 90, duration: 150 },
          { x: GAME_WIDTH / 2, y: this.def.baseY, duration: this.def.diveDurMs + 220, ease: "quad.out" },
        ],
        onComplete: () => (this.busy = false),
      });
    }
  }

  private summon(): void {
    this.summons++;
    this.emit("spawnMinions", 2, this.def.minion);
    this.scene.tweens.add({ targets: this, scaleX: this.def.scale * 1.14, yoyo: true, duration: 120 });
  }

  hit(dmg: number): void {
    if (!this.alive) return;
    this.hp = Math.max(0, this.hp - dmg);
    this.emit("hurt");
    this.setTintFill(0xffffff);
    this.scene.time.delayedCall(55, () => this.alive && this.clearTint());
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
      y: this.def.ground ? this.y : 560,
      scaleX: this.def.scale * 0.55,
      scaleY: this.def.scale * 0.55,
      alpha: 0.3,
      duration: 1400,
      ease: "quad.in",
    });
  }
}
