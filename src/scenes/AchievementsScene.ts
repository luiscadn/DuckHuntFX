import Phaser from "phaser";
import { FONT_FAMILY, GAME_HEIGHT, GAME_WIDTH, Scenes } from "../constants";
import { Palette as C, css } from "../art/palette";
import { Parallax } from "../ui/Parallax";
import { PixelButton } from "../ui/Button";
import { ACHIEVEMENTS, achievementList } from "../data/achievements";

export class AchievementsScene extends Phaser.Scene {
  private bg!: Parallax;

  constructor() {
    super(Scenes.Achievements);
  }

  create(): void {
    this.bg = new Parallax(this, "night");
    const cx = GAME_WIDTH / 2;
    const list = achievementList();
    const done = list.filter((a) => a.unlocked).length;

    this.add
      .text(cx, 44, "LOGROS", { fontFamily: FONT_FAMILY, fontSize: "32px", color: css(C.gold) })
      .setOrigin(0.5);
    this.add
      .text(cx, 78, `${done} / ${ACHIEVEMENTS.length}`, {
        fontFamily: FONT_FAMILY,
        fontSize: "12px",
        color: css(C.paper),
      })
      .setOrigin(0.5);

    const cols = 3;
    const x0 = 88;
    const y0 = 118;
    const dx = 274;
    const dy = 73;

    list.forEach((a, i) => {
      const gx = x0 + (i % cols) * dx;
      const gy = y0 + Math.floor(i / cols) * dy;
      const cell = this.add.container(gx, gy);

      cell.add(
        this.add
          .rectangle(120, 22, 250, 62, C.ink, a.unlocked ? 0.5 : 0.32)
          .setOrigin(0.5)
          .setStrokeStyle(2, a.unlocked ? C.gold : C.inkSoft),
      );
      cell.add(this.add.image(20, 22, a.unlocked ? "medal" : "medal-locked").setScale(0.9));
      if (!a.unlocked) {
        cell.add(
          this.add.text(20, 14, "?", { fontFamily: FONT_FAMILY, fontSize: "12px", color: css(C.paperShade) }).setOrigin(0.5),
        );
      }
      cell.add(
        this.add.text(44, 5, a.title, {
          fontFamily: FONT_FAMILY,
          fontSize: "10px",
          color: css(a.unlocked ? C.gold : C.paperShade),
        }),
      );
      cell.add(
        this.add.text(44, 24, a.desc, {
          fontFamily: FONT_FAMILY,
          fontSize: "7px",
          color: css(a.unlocked ? C.paper : C.inkSoft),
          wordWrap: { width: 198 },
          lineSpacing: 3,
        }),
      );
    });

    new PixelButton(this, cx, GAME_HEIGHT - 40, "VOLVER", {
      width: 240,
      height: 46,
      fill: C.inkSoft,
      onClick: () => this.scene.start(Scenes.Menu),
    });
    this.input.keyboard?.on("keydown-ESC", () => this.scene.start(Scenes.Menu));
    this.cameras.main.fadeIn(220, 0, 0, 0);
  }

  update(time: number, delta: number): void {
    this.bg.update(time, delta);
  }
}
