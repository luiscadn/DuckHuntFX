import Phaser from "phaser";
import { FONT_FAMILY, GAME_HEIGHT, GAME_WIDTH, Scenes } from "../constants";
import { Palette as C, css } from "../art/palette";
import { Parallax } from "../ui/Parallax";
import { PixelButton } from "../ui/Button";
import { activeMissions } from "../data/missions";
import { bankCoins } from "../data/bank";

export class MissionsScene extends Phaser.Scene {
  private bg!: Parallax;

  constructor() {
    super(Scenes.Missions);
  }

  create(): void {
    this.bg = new Parallax(this, "day");
    const cx = GAME_WIDTH / 2;

    this.add.text(cx, 48, "MISIONES", { fontFamily: FONT_FAMILY, fontSize: "30px", color: css(C.gold) }).setOrigin(0.5);
    this.add
      .text(cx, 84, `Banco: ${bankCoins()} monedas`, { fontFamily: FONT_FAMILY, fontSize: "11px", color: css(C.paper) })
      .setOrigin(0.5);
    this.add
      .text(cx, 108, "Se completan jugando; la recompensa va al banco.", {
        fontFamily: FONT_FAMILY,
        fontSize: "8px",
        color: css(C.paperShade),
      })
      .setOrigin(0.5);

    activeMissions().forEach((m, i) => {
      const y = 156 + i * 100;
      this.add.rectangle(cx, y + 22, 640, 84, C.ink, 0.45).setStrokeStyle(2, m.done ? C.foliageLight : C.inkSoft);
      this.add.text(cx - 300, y, m.text, {
        fontFamily: FONT_FAMILY,
        fontSize: "11px",
        color: css(m.done ? C.foliageLight : C.paper),
      });
      this.add
        .text(cx + 300, y, `+${m.reward}`, { fontFamily: FONT_FAMILY, fontSize: "11px", color: css(C.gold) })
        .setOrigin(1, 0);

      const frac = Phaser.Math.Clamp(m.progress / m.target, 0, 1);
      this.add.rectangle(cx - 300, y + 34, 600, 12, C.inkSoft, 0.8).setOrigin(0, 0.5);
      this.add.rectangle(cx - 298, y + 34, 596 * frac, 8, m.done ? C.foliageLight : C.gold).setOrigin(0, 0.5);
      this.add
        .text(cx + 300, y + 34, m.done ? "HECHO" : `${Math.min(m.progress, m.target)} / ${m.target}`, {
          fontFamily: FONT_FAMILY,
          fontSize: "8px",
          color: css(C.paperShade),
        })
        .setOrigin(1, 0.5);
    });

    new PixelButton(this, cx, GAME_HEIGHT - 44, "VOLVER", {
      width: 240,
      height: 48,
      fill: C.inkSoft,
      onClick: () => this.scene.start(Scenes.Menu),
    });
    this.input.keyboard?.on("keydown-ESC", () => this.scene.start(Scenes.Menu));
    this.cameras.main.fadeIn(200, 0, 0, 0);
  }

  update(time: number, delta: number): void {
    this.bg.update(time, delta);
  }
}
