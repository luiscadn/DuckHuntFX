import Phaser from "phaser";
import { FONT_FAMILY, GAME_HEIGHT, GAME_WIDTH, GROUND_Y, Scenes } from "../constants";
import { Palette as C, css } from "../art/palette";
import { Parallax } from "../ui/Parallax";
import { PixelButton } from "../ui/Button";
import { Audio } from "../audio/AudioBus";
import { currentUser } from "../data/accounts";

interface OverData {
  score: number;
  level: number;
  win: boolean;
  newAchievements?: string[];
}

export class GameOverScene extends Phaser.Scene {
  private bg!: Parallax;
  private params!: OverData;

  constructor() {
    super(Scenes.GameOver);
  }

  init(data: OverData): void {
    this.params = data;
  }

  create(): void {
    const win = this.params.win;
    this.bg = new Parallax(this, win ? "day" : "night");
    const cx = GAME_WIDTH / 2;
    const user = currentUser();
    const isBest = user ? this.params.score >= user.bestScore : false;

    this.add
      .text(cx + 4, 96, win ? "¡VICTORIA!" : "GAME OVER", {
        fontFamily: FONT_FAMILY,
        fontSize: "48px",
        color: css(C.ink),
      })
      .setOrigin(0.5);
    this.add
      .text(cx, 90, win ? "¡VICTORIA!" : "GAME OVER", {
        fontFamily: FONT_FAMILY,
        fontSize: "48px",
        color: css(win ? C.gold : C.blood),
      })
      .setOrigin(0.5);

    this.add
      .text(cx, 168, `PUNTUACIÓN`, { fontFamily: FONT_FAMILY, fontSize: "12px", color: css(C.paper) })
      .setOrigin(0.5);
    const big = this.add
      .text(cx, 210, "0", { fontFamily: FONT_FAMILY, fontSize: "40px", color: css(C.gold), stroke: css(C.ink), strokeThickness: 6 })
      .setOrigin(0.5);
    this.tweens.addCounter({
      from: 0,
      to: this.params.score,
      duration: 900,
      ease: "cubic.out",
      onUpdate: (t) => big.setText(Math.round(t.getValue() ?? 0).toLocaleString("es")),
    });

    this.add
      .text(cx, 252, `Nivel alcanzado: ${this.params.level}${win ? " (máximo)" : ""}`, {
        fontFamily: FONT_FAMILY,
        fontSize: "11px",
        color: css(C.paper),
      })
      .setOrigin(0.5);

    if (isBest) {
      const nb = this.add
        .text(cx, 284, "¡NUEVO RÉCORD!", { fontFamily: FONT_FAMILY, fontSize: "13px", color: css(C.gold) })
        .setOrigin(0.5);
      this.tweens.add({ targets: nb, scale: { from: 1, to: 1.12 }, yoyo: true, repeat: -1, duration: 500 });
    } else if (user) {
      this.add
        .text(cx, 284, `Tu récord: ${user.bestScore.toLocaleString("es")}`, {
          fontFamily: FONT_FAMILY,
          fontSize: "10px",
          color: css(C.paperShade),
        })
        .setOrigin(0.5);
    }

    const gained = this.params.newAchievements ?? [];
    if (gained.length) {
      this.add.image(cx - 148, 314, "medal").setScale(0.85);
      this.add
        .text(cx - 128, 306, `${gained.length} LOGRO${gained.length > 1 ? "S" : ""} NUEVO${gained.length > 1 ? "S" : ""}`, {
          fontFamily: FONT_FAMILY,
          fontSize: "9px",
          color: css(C.gold),
        })
        .setOrigin(0, 0.5);
      this.add
        .text(cx - 128, 322, gained.slice(0, 3).join("  ·  ") + (gained.length > 3 ? " …" : ""), {
          fontFamily: FONT_FAMILY,
          fontSize: "7px",
          color: css(C.paper),
          wordWrap: { width: 300 },
          lineSpacing: 3,
        })
        .setOrigin(0, 0.5);
    }

    new PixelButton(this, cx - 130, 372, "REINTENTAR", {
      width: 240,
      fill: C.rust,
      onClick: () => this.scene.start(Scenes.Game),
    });
    new PixelButton(this, cx + 130, 372, "MENÚ", {
      width: 240,
      fill: C.inkSoft,
      onClick: () => this.scene.start(Scenes.Menu),
    });
    new PixelButton(this, cx, 434, "VER PUNTAJES", {
      width: 300,
      height: 46,
      fontSize: 12,
      fill: C.inkSoft,
      onClick: () => this.scene.start(Scenes.Scores),
    });

    if (win) this.celebrate();
    else this.sadDog();

    this.cameras.main.fadeIn(400, 0, 0, 0);
  }

  private celebrate(): void {
    this.time.addEvent({
      delay: 90,
      repeat: 40,
      callback: () => {
        const f = this.add
          .image(Phaser.Math.Between(0, GAME_WIDTH), -20, Math.random() < 0.5 ? "feather" : "star")
          .setScale(Phaser.Math.FloatBetween(0.8, 1.8))
          .setDepth(50);
        this.tweens.add({
          targets: f,
          y: GAME_HEIGHT + 30,
          x: f.x + Phaser.Math.Between(-80, 80),
          angle: Phaser.Math.Between(-360, 360),
          duration: Phaser.Math.Between(1800, 3200),
          onComplete: () => f.destroy(),
        });
      },
    });
    Audio.powerup();
  }

  private sadDog(): void {
    const dog = this.add.sprite(GAME_WIDTH - 120, GROUND_Y + 30, "dog", 2).setOrigin(0.5, 1).setDepth(5);
    dog.setFlipX(true);
    this.tweens.add({ targets: dog, y: GROUND_Y + 24, yoyo: true, repeat: -1, duration: 700 });
  }

  update(time: number, delta: number): void {
    this.bg.update(time, delta);
  }
}
