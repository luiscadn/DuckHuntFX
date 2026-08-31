/**
 * The hunting dog. Pops up out of the grass to retrieve a bagged duck, or to
 * point and laugh when one gets away. One instance lives in the game scene.
 */

import Phaser from "phaser";
import { GROUND_Y } from "../constants";

export class Dog extends Phaser.GameObjects.Sprite {
  private busy = false;

  constructor(scene: Phaser.Scene) {
    super(scene, -200, GROUND_Y + 60, "dog", 0);
    scene.add.existing(this);
    this.setOrigin(0.5, 1).setDepth(16).setVisible(false);
  }

  private popup(x: number, frame: number, holdMs: number, onTop?: () => void): void {
    if (this.busy) return;
    this.busy = true;
    this.setFrame(frame);
    this.setFlipX(false);
    this.setPosition(Phaser.Math.Clamp(x, 60, this.scene.scale.width - 60), GROUND_Y + 60);
    this.setVisible(true);
    this.scene.tweens.chain({
      targets: this,
      tweens: [
        { y: GROUND_Y + 8, duration: 220, ease: "back.out" },
        { y: GROUND_Y + 8, duration: holdMs, onStart: () => onTop?.() },
        { y: GROUND_Y + 60, duration: 200, ease: "quad.in" },
      ],
      onComplete: () => {
        this.setVisible(false);
        this.busy = false;
      },
    });
  }

  retrieve(x: number, onTop?: () => void): void {
    this.popup(x, 1, 320, onTop);
  }

  laugh(x: number, onTop?: () => void): void {
    this.popup(x, 2, 620, onTop);
  }

  /** Intro flourish: trot across the grass sniffing. */
  sniffAcross(fromX: number, toX: number, ms: number): void {
    this.busy = true;
    this.setFrame(0);
    this.setFlipX(toX < fromX);
    this.setPosition(fromX, GROUND_Y + 6);
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
