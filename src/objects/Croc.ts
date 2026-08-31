/**
 * The marsh crocodile. Lurks below the reeds and lunges up with open jaws to
 * catch a downed duck, or surfaces with a smug, toothy grin when one gets away.
 * One instance lives in the game scene.
 */

import Phaser from "phaser";
import { GAME_HEIGHT, GROUND_Y } from "../constants";

const REST_Y = GROUND_Y + 20; // head/jaws above the reed line
const HIDE_Y = GAME_HEIGHT + 70; // fully submerged

export class Croc extends Phaser.GameObjects.Sprite {
  private busy = false;

  constructor(scene: Phaser.Scene) {
    super(scene, -200, HIDE_Y, "croc", 0);
    scene.add.existing(this);
    this.setOrigin(0.5, 1).setDepth(16).setScale(1.3).setVisible(false);
  }

  private surface(x: number, frame: number, holdMs: number, onTop?: () => void): void {
    if (this.busy) return;
    this.busy = true;
    this.setFrame(frame);
    this.setFlipX(false);
    this.setPosition(Phaser.Math.Clamp(x, 60, this.scene.scale.width - 60), HIDE_Y);
    this.setVisible(true);
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

  /** Lunge up with jaws open, then chomp shut on the way down. */
  retrieve(x: number, onTop?: () => void): void {
    this.busy = true;
    this.setFrame(1);
    this.setFlipX(false);
    this.setPosition(Phaser.Math.Clamp(x, 60, this.scene.scale.width - 60), HIDE_Y);
    this.setVisible(true);
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

  /** Surface with a smug grin (a stray feather in its teeth) when a duck escapes. */
  laugh(x: number, onTop?: () => void): void {
    this.surface(x, 2, 620, onTop);
  }

  /** Intro flourish: glide through the water showing only its snout. */
  sniffAcross(fromX: number, toX: number, ms: number): void {
    this.busy = true;
    this.setFrame(0);
    this.setFlipX(toX < fromX);
    this.setPosition(fromX, REST_Y + 12);
    this.setVisible(true);
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
