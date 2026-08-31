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
  accuracy?: number;
  bestCombo?: number;
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
      .text(cx, 248, `Nivel ${this.params.level}${win ? " (máximo)" : ""}   ·   Puntería ${this.params.accuracy ?? 0}%   ·   Combo ${this.params.bestCombo ?? 0}`, {
        fontFamily: FONT_FAMILY,
        fontSize: "9px",
        color: css(C.paper),
      })
      .setOrigin(0.5);

    if (isBest) {
      const nb = this.add
        .text(cx, 276, "¡NUEVO RÉCORD!", { fontFamily: FONT_FAMILY, fontSize: "13px", color: css(C.gold) })
        .setOrigin(0.5);
      this.tweens.add({ targets: nb, scale: { from: 1, to: 1.12 }, yoyo: true, repeat: -1, duration: 500 });
    } else if (user) {
      this.add
        .text(cx, 276, `Tu récord: ${user.bestScore.toLocaleString("es")}`, {
          fontFamily: FONT_FAMILY,
          fontSize: "10px",
          color: css(C.paperShade),
        })
        .setOrigin(0.5);
    }

    const gained = this.params.newAchievements ?? [];
    if (gained.length) {
      this.add.image(cx - 150, 306, "medal").setScale(0.8);
      this.add
        .text(cx - 130, 299, `${gained.length} LOGRO${gained.length > 1 ? "S" : ""} NUEVO${gained.length > 1 ? "S" : ""}`, {
          fontFamily: FONT_FAMILY,
          fontSize: "9px",
          color: css(C.gold),
        })
        .setOrigin(0, 0.5);
      this.add
        .text(cx - 130, 314, gained.slice(0, 3).join("  ·  ") + (gained.length > 3 ? " …" : ""), {
          fontFamily: FONT_FAMILY,
          fontSize: "7px",
          color: css(C.paper),
          wordWrap: { width: 300 },
        })
        .setOrigin(0, 0.5);
    }

    new PixelButton(this, cx - 128, 366, "REINTENTAR", {
      width: 236,
      height: 50,
      fill: C.rust,
      onClick: () => this.scene.start(Scenes.Game),
    });
    new PixelButton(this, cx + 128, 366, "MENÚ", {
      width: 236,
      height: 50,
      fill: C.inkSoft,
      onClick: () => this.scene.start(Scenes.Menu),
    });
    new PixelButton(this, cx - 128, 424, "COMPARTIR", {
      width: 236,
      height: 46,
      fontSize: 12,
      fill: C.foliageDark,
      onClick: () => this.share(),
    });
    new PixelButton(this, cx + 128, 424, "PUNTAJES", {
      width: 236,
      height: 46,
      fontSize: 12,
      fill: C.inkSoft,
      onClick: () => this.scene.start(Scenes.Scores),
    });

    if (win) this.celebrate();
    else this.sadCroc();

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

  // ── share card ───────────────────────────────────────────────────

  private async share(): Promise<void> {
    Audio.uiConfirm();
    const name = currentUser()?.name ?? "Jugador";
    const { score, level, win } = this.params;
    const acc = this.params.accuracy ?? 0;
    const combo = this.params.bestCombo ?? 0;

    const w = 660;
    const h = 340;
    const cv = document.createElement("canvas");
    cv.width = w;
    cv.height = h;
    const ctx = cv.getContext("2d")!;
    ctx.imageSmoothingEnabled = false;

    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "#1a2a6c");
    g.addColorStop(1, "#0b1026");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = css(C.gold);
    ctx.lineWidth = 6;
    ctx.strokeRect(10, 10, w - 20, h - 20);

    const font = (px: number) => `${px}px "Press Start 2P", ui-monospace, monospace`;
    ctx.textAlign = "center";
    ctx.fillStyle = css(C.gold);
    ctx.font = font(30);
    ctx.fillText("SALPICON", w / 2, 62);
    ctx.fillStyle = css(C.paper);
    ctx.font = font(13);
    ctx.fillText(`${name}${win ? "  ·  ¡VICTORIA!" : ""}`, w / 2, 100);

    ctx.fillStyle = css(C.gold);
    ctx.font = font(46);
    ctx.fillText(score.toLocaleString("es"), w / 2, 182);
    ctx.fillStyle = css(C.paperShade);
    ctx.font = font(11);
    ctx.fillText("PUNTOS", w / 2, 206);

    ctx.fillStyle = css(C.paper);
    ctx.font = font(11);
    ctx.fillText(`NIVEL ${level}     PUNTERIA ${acc}%     COMBO x${combo}`, w / 2, 250);

    ctx.fillStyle = "#9aa7d0";
    ctx.font = font(8);
    ctx.fillText(new Date().toLocaleDateString("es"), w / 2, h - 28);

    try {
      const src = this.textures.get("duck").getSourceImage() as HTMLCanvasElement;
      const fw = src.width / 4;
      ctx.drawImage(src, fw, 0, fw, src.height, 40, h - 118, 120, (120 * src.height) / fw);
    } catch {
      /* duck art optional */
    }

    const text = `Hice ${score.toLocaleString("es")} puntos en Salpicón (nivel ${level}, ${acc}% de puntería). ¿Puedes superarlo?`;
    cv.toBlob(async (blob) => {
      if (!blob) return;
      const file = new File([blob], "salpicon.png", { type: "image/png" });
      const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
      if (nav.canShare?.({ files: [file] })) {
        try {
          await nav.share({ files: [file], text, title: "Salpicón" });
          return;
        } catch {
          /* user cancelled — fall through to download */
        }
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "salpicon.png";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      try {
        await navigator.clipboard?.writeText(text);
      } catch {
        /* clipboard optional */
      }
      this.toast("Imagen descargada · texto copiado");
    }, "image/png");
  }

  private toast(msg: string): void {
    const t = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 24, msg, {
        fontFamily: FONT_FAMILY,
        fontSize: "9px",
        color: css(C.ink),
        backgroundColor: css(C.gold),
        padding: { x: 10, y: 6 },
      })
      .setOrigin(0.5)
      .setDepth(400);
    this.tweens.add({ targets: t, alpha: 0, delay: 1800, duration: 500, onComplete: () => t.destroy() });
  }

  private sadCroc(): void {
    const croc = this.add.sprite(GAME_WIDTH - 120, GROUND_Y + 44, "croc", 2).setOrigin(0.5, 1).setDepth(5);
    this.tweens.add({ targets: croc, y: GROUND_Y + 38, yoyo: true, repeat: -1, duration: 900 });
  }

  update(time: number, delta: number): void {
    this.bg.update(time, delta);
  }
}
