/** A chunky pixel-styled button used across the Phaser menus. */

import Phaser from "phaser";
import { FONT_FAMILY } from "../constants";
import { Palette as C, css } from "../art/palette";
import { Audio } from "../audio/AudioBus";

export interface ButtonOpts {
  width?: number;
  height?: number;
  fontSize?: number;
  fill?: number;
  textColor?: number;
  onClick: () => void;
}

export class PixelButton extends Phaser.GameObjects.Container {
  private readonly face: Phaser.GameObjects.Rectangle;
  private readonly shadow: Phaser.GameObjects.Rectangle;
  private readonly border: Phaser.GameObjects.Rectangle;
  private readonly label: Phaser.GameObjects.Text;
  private enabledState = true;

  constructor(scene: Phaser.Scene, x: number, y: number, text: string, opts: ButtonOpts) {
    super(scene, x, y);
    const w = opts.width ?? 300;
    const h = opts.height ?? 58;

    this.shadow = scene.add.rectangle(4, 6, w, h, C.ink, 0.45).setOrigin(0.5);
    this.face = scene.add.rectangle(0, 0, w, h, opts.fill ?? C.rust).setOrigin(0.5);
    this.border = scene.add.rectangle(0, 0, w, h, 0x000000, 0).setOrigin(0.5).setStrokeStyle(3, C.ink);
    this.label = scene.add
      .text(0, 0, text, {
        fontFamily: FONT_FAMILY,
        fontSize: `${opts.fontSize ?? 16}px`,
        color: css(opts.textColor ?? C.paper),
      })
      .setOrigin(0.5);

    this.add([this.shadow, this.face, this.border, this.label]);
    this.setSize(w, h);
    this.setInteractive({ useHandCursor: true });

    this.on("pointerover", () => {
      if (!this.enabledState) return;
      Audio.uiMove();
      scene.tweens.add({ targets: this, scale: 1.05, duration: 90, ease: "quad.out" });
      this.face.setFillStyle(Phaser.Display.Color.IntegerToColor(opts.fill ?? C.rust).brighten(12).color);
    });
    this.on("pointerout", () => {
      scene.tweens.add({ targets: this, scale: 1, duration: 120, ease: "quad.out" });
      this.face.setFillStyle(opts.fill ?? C.rust);
      this.y = y;
    });
    this.on("pointerdown", () => {
      if (!this.enabledState) return;
      this.y = y + 3;
    });
    this.on("pointerup", () => {
      if (!this.enabledState) return;
      this.y = y;
      Audio.uiConfirm();
      opts.onClick();
    });

    scene.add.existing(this);
  }

  setEnabled(on: boolean): this {
    this.enabledState = on;
    this.setAlpha(on ? 1 : 0.45);
    if (on) this.setInteractive({ useHandCursor: true });
    else this.disableInteractive();
    return this;
  }

  setLabel(text: string): this {
    this.label.setText(text);
    return this;
  }
}
