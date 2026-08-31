/**
 * The marsh crocodile. Lurks below the reeds and lunges up with open jaws to
 * catch a downed duck, or surfaces with a smug, toothy grin when one gets away.
 * Shoot it and it sulks (won't retrieve for a while). When the player's croc
 * meter is full it can be unleashed to sweep the whole pond.
 * One instance lives in the game scene.
 */

import Phaser from "phaser";
import { GAME_HEIGHT, GROUND_Y } from "../constants";
import { equippedCosmetic } from "../data/cosmetics";

const REST_Y = GROUND_Y + 20;
const HIDE_Y = GAME_HEIGHT + 70;

export class Croc extends Phaser.GameObjects.Sprite {
  private busy = false;
  private angryUntil = 0;
  private hat?: Phaser.GameObjects.Image;

  constructor(scene: Phaser.Scene) {
    super(scene, -200, HIDE_Y, "croc", 0);
    scene.add.existing(this);
    this.setOrigin(0.5, 1).setDepth(16).setScale(1.3).setVisible(false);

    const hatId = equippedCosmetic("hat");
    if (hatId !== "none") {
      this.hat = scene.add
        .image(this.x, this.y, `hat-${hatId}`)
        .setOrigin(0.5, 1)
        .setDepth(17)
        .setScale(1.2)
        .setVisible(false);
    }
  }

  preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);
    if (this.hat) {
      const show = this.visible && this.y < REST_Y + 40;
      this.hat.setVisible(show);
      if (show) {
        this.hat.setPosition(this.x + (this.flipX ? -6 : 6), this.y - 56 * (this.scaleY / 1.3));
        this.hat.setFlipX(this.flipX);
        this.hat.setScale(1.2 * (this.scaleY / 1.3));
      }
    }
  }

  isAngry(): boolean {
    return this.scene.time.now < this.angryUntil;
  }

  /** Player shot the croc — it dives and sulks. */
  anger(ms: number): void {
    this.angryUntil = this.scene.time.now + ms;
    this.setTint(0xff6a5a);
    this.scene.time.delayedCall(ms, () => this.clearTint());
    if (this.visible) {
      this.scene.tweens.killTweensOf(this);
      this.scene.tweens.add({
        targets: this,
        y: HIDE_Y,
        duration: 200,
        ease: "quad.in",
        onComplete: () => {
          this.setVisible(false);
          this.busy = false;
        },
      });
    }
  }

  private clampX(x: number): number {
    return Phaser.Math.Clamp(x, 60, this.scene.scale.width - 60);
  }

  private surface(x: number, frame: number, holdMs: number, onTop?: () => void): void {
    if (this.busy) return;
    this.busy = true;
    this.setFrame(frame).setFlipX(false).setPosition(this.clampX(x), HIDE_Y).setVisible(true);
    this.scene.tweens.chain({
      targets: this,
      tweens: [
        { y: REST_Y, duration: 200, ease: "back.out" },
        { y: REST_Y, duration: holdMs, onStart: () => onTop?.() },
        { y: HIDE_Y, duration: 200, ease: "quad.in" },
      ],
      onComplete: () => {
        this.setVisible(false);
        this.busy = false;
      },
    });
  }

  retrieve(x: number, onTop?: () => void): void {
    if (this.busy || this.isAngry()) return;
    this.busy = true;
    this.setFrame(1).setFlipX(false).setPosition(this.clampX(x), HIDE_Y).setVisible(true);
    this.scene.tweens.chain({
      targets: this,
      tweens: [
        { y: REST_Y - 22, duration: 180, ease: "back.out", onStart: () => onTop?.() },
        { y: REST_Y - 22, duration: 120, onComplete: () => this.setFrame(2) },
        { y: HIDE_Y, duration: 220, ease: "quad.in" },
      ],
      onComplete: () => {
        this.setVisible(false);
        this.busy = false;
      },
    });
  }

  laugh(x: number, onTop?: () => void): void {
    this.surface(x, 2, 620, onTop);
  }

  /** The ultimate: a giant crocodile sweep across the whole pond. */
  rampage(onSweep: (x: number) => void, onDone: () => void): void {
    this.scene.tweens.killTweensOf(this);
    this.busy = true;
    const w = this.scene.scale.width;
    this.setFrame(1).setFlipX(false).setScale(2.7).setPosition(-180, GROUND_Y - 24).setVisible(true);
    this.scene.tweens.add({
      targets: this,
      x: w + 200,
      duration: 950,
      ease: "sine.in",
      onUpdate: () => onSweep(this.x),
      onComplete: () => {
        this.setScale(1.3).setVisible(false);
        this.busy = false;
        onDone();
      },
    });
  }

  sniffAcross(fromX: number, toX: number, ms: number): void {
    this.busy = true;
    this.setFrame(0).setFlipX(toX < fromX).setPosition(fromX, REST_Y + 12).setVisible(true);
    this.scene.tweens.add({
      targets: this,
      x: toX,
      duration: ms,
      ease: "sine.inOut",
      onComplete: () => {
        this.setVisible(false);
        this.busy = false;
      },
    });
  }
}
