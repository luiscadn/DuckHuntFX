import Phaser from "phaser";
import { FONT_FAMILY, GAME_HEIGHT, GAME_WIDTH, Scenes } from "../constants";
import { Palette as C, css } from "../art/palette";
import { Parallax } from "../ui/Parallax";
import { PixelButton } from "../ui/Button";
import { Audio } from "../audio/AudioBus";
import { currentUser, logout } from "../data/accounts";
import { ACHIEVEMENTS, unlockedCount } from "../data/achievements";
import { bankCoins } from "../data/bank";
import { tutorialDone } from "./TutorialScene";
import type { GameMode } from "./GameScene";

export class MenuScene extends Phaser.Scene {
  private bg!: Parallax;
  private helpLayer?: Phaser.GameObjects.Container;

  constructor() {
    super(Scenes.Menu);
  }

  create(): void {
    this.bg = new Parallax(this, "day");
    Audio.setBossMode(false);
    Audio.setIntensity(0);
    Audio.startMusic();

    const user = currentUser();
    const cx = GAME_WIDTH / 2;

    // title
    this.add
      .text(cx + 5, 82, "SALPICON", { fontFamily: FONT_FAMILY, fontSize: "50px", color: css(C.rust) })
      .setOrigin(0.5);
    const title = this.add
      .text(cx, 76, "SALPICON", { fontFamily: FONT_FAMILY, fontSize: "50px", color: css(C.gold) })
      .setOrigin(0.5);
    this.tweens.add({ targets: title, angle: { from: -1.5, to: 1.5 }, duration: 2200, yoyo: true, repeat: -1, ease: "sine.inOut" });

    this.add
      .text(cx, 150, user ? `Hola, ${user.name}` : "Hola", {
        fontFamily: FONT_FAMILY,
        fontSize: "13px",
        color: css(C.paper),
        stroke: css(C.ink),
        strokeThickness: 4,
      })
      .setOrigin(0.5);
    if (user) {
      this.add
        .text(cx, 172, `Mejor ${user.bestScore.toLocaleString("es")}   ·   Banco ${bankCoins()} monedas`, {
          fontFamily: FONT_FAMILY,
          fontSize: "9px",
          color: css(C.paper),
          stroke: css(C.ink),
          strokeThickness: 3,
        })
        .setOrigin(0.5);
    }

    // ambient ducks
    this.spawnAmbientDucks();

    // buttons
    new PixelButton(this, cx, 216, "JUGAR", {
      width: 340,
      height: 52,
      fill: C.rust,
      onClick: () => this.openModeSelect(),
    });
    const done = unlockedCount();
    const grid: Array<[string, () => void]> = [
      ["PUNTAJES", () => this.scene.start(Scenes.Scores)],
      [`LOGROS ${done}/${ACHIEVEMENTS.length}`, () => this.scene.start(Scenes.Achievements)],
      ["MISIONES", () => this.scene.start(Scenes.Missions)],
      ["TIENDA", () => this.scene.start(Scenes.Shop)],
      ["ESTADÍSTICAS", () => this.scene.start(Scenes.Stats)],
      ["AJUSTES", () => this.scene.start(Scenes.Settings)],
    ];
    grid.forEach(([label, fn], i) => {
      const gx = cx + ((i % 3) - 1) * 168;
      const gy = 276 + Math.floor(i / 3) * 58;
      new PixelButton(this, gx, gy, label, {
        width: 158,
        height: 48,
        fontSize: 10,
        fill: label === "TIENDA" ? C.foliageDark : C.inkSoft,
        onClick: fn,
      });
      if (label === "TIENDA") this.add.image(gx - 56, gy, "shop-icon").setScale(1.1);
    });
    this.add
      .text(cx - 70, 400, "¿cómo jugar?", { fontFamily: FONT_FAMILY, fontSize: "9px", color: css(C.paper) })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on("pointerup", () => this.toggleHelp());
    this.add
      .text(cx + 78, 400, "TUTORIAL", { fontFamily: FONT_FAMILY, fontSize: "9px", color: css(C.gold) })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on("pointerup", () => {
        Audio.uiConfirm();
        this.scene.start(Scenes.Tutorial);
      });

    // logout
    const out = this.add
      .text(GAME_WIDTH - 24, GAME_HEIGHT - 32, "CERRAR SESIÓN", {
        fontFamily: FONT_FAMILY,
        fontSize: "9px",
        color: css(C.paper),
      })
      .setOrigin(1, 0.5)
      .setInteractive({ useHandCursor: true });
    out.on("pointerover", () => out.setColor(css(C.gold)));
    out.on("pointerout", () => out.setColor(css(C.paper)));
    out.on("pointerup", () => {
      Audio.uiBack();
      logout();
      this.scene.start(Scenes.Auth);
    });

    this.cameras.main.fadeIn(260, 0, 0, 0);

    if (!tutorialDone()) this.time.delayedCall(400, () => this.offerTutorial());
  }

  private openModeSelect(): void {
    const cx = GAME_WIDTH / 2;
    const c = this.add.container(0, 0).setDepth(300);
    c.add(this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x0a0e24, 0.78).setOrigin(0).setInteractive());
    c.add(this.add.rectangle(cx, GAME_HEIGHT / 2, 560, 380, C.ink).setStrokeStyle(4, C.gold));
    c.add(
      this.add.text(cx, GAME_HEIGHT / 2 - 150, "ELIGE UN MODO", { fontFamily: FONT_FAMILY, fontSize: "16px", color: css(C.gold) }).setOrigin(0.5),
    );

    const modes: Array<[GameMode, string, string]> = [
      ["campaign", "CAMPAÑA", "100 niveles · jefes cada 15 · Rey Pato final"],
      ["timeattack", "CONTRARRELOJ", "90 segundos · haz el máximo de puntos"],
      ["survival", "SUPERVIVENCIA", "una sola vida · oleadas infinitas"],
    ];
    modes.forEach(([mode, label, desc], i) => {
      const y = GAME_HEIGHT / 2 - 92 + i * 84;
      c.add(
        new PixelButton(this, cx, y, label, {
          width: 420,
          height: 52,
          fill: i === 0 ? C.rust : C.inkSoft,
          onClick: () => {
            this.cameras.main.fadeOut(220, 0, 0, 0);
            this.time.delayedCall(240, () => this.scene.start(Scenes.Game, { mode }));
          },
        }),
      );
      c.add(
        this.add
          .text(cx, y + 30, desc, { fontFamily: FONT_FAMILY, fontSize: "7px", color: css(C.paperShade) })
          .setOrigin(0.5),
      );
    });

    c.add(
      this.add
        .text(cx, GAME_HEIGHT / 2 + 150, "[ cancelar ]", { fontFamily: FONT_FAMILY, fontSize: "9px", color: css(C.paperShade) })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true })
        .on("pointerup", () => {
          Audio.uiBack();
          c.destroy();
        }),
    );
  }

  private offerTutorial(): void {
    if (this.helpLayer) return;
    const cx = GAME_WIDTH / 2;
    const c = this.add.container(0, 0).setDepth(260);
    c.add(this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x0a0e24, 0.7).setOrigin(0).setInteractive());
    c.add(this.add.rectangle(cx, GAME_HEIGHT / 2, 520, 240, C.ink).setStrokeStyle(4, C.gold));
    c.add(
      this.add.text(cx, GAME_HEIGHT / 2 - 74, "¿PRIMERA VEZ?", { fontFamily: FONT_FAMILY, fontSize: "15px", color: css(C.gold) }).setOrigin(0.5),
    );
    c.add(
      this.add
        .text(cx, GAME_HEIGHT / 2 - 30, "Un tutorial rápido de 5 pasos.\nPuedes saltarlo cuando quieras.", {
          fontFamily: FONT_FAMILY,
          fontSize: "9px",
          color: css(C.paper),
          align: "center",
          lineSpacing: 6,
        })
        .setOrigin(0.5),
    );
    c.add(
      new PixelButton(this, cx - 108, GAME_HEIGHT / 2 + 52, "TUTORIAL", {
        width: 190,
        height: 44,
        fill: C.rust,
        onClick: () => this.scene.start(Scenes.Tutorial),
      }),
    );
    c.add(
      new PixelButton(this, cx + 108, GAME_HEIGHT / 2 + 52, "AHORA NO", {
        width: 190,
        height: 44,
        fill: C.inkSoft,
        onClick: () => {
          try {
            localStorage.setItem("dh:tutorialDone", "1");
          } catch {
            /* ignore */
          }
          Audio.uiBack();
          c.destroy();
        },
      }),
    );
  }

  private spawnAmbientDucks(): void {
    this.anims.exists("duck-flap") ||
      this.anims.create({
        key: "duck-flap",
        frames: this.anims.generateFrameNumbers("duck", { start: 0, end: 3 }),
        frameRate: 12,
        repeat: -1,
      });
    for (let i = 0; i < 3; i++) {
      const d = this.add.sprite(-80, 0, "duck", 1).setDepth(-5).setScale(0.8 + Math.random() * 0.5);
      d.play("duck-flap");
      const fly = () => {
        d.x = -80;
        d.y = Phaser.Math.Between(70, 240);
        const dur = Phaser.Math.Between(5000, 9000);
        d.setFlipX(false);
        this.tweens.add({
          targets: d,
          x: GAME_WIDTH + 80,
          y: d.y - Phaser.Math.Between(-40, 60),
          duration: dur,
          onComplete: fly,
        });
      };
      this.time.delayedCall(i * 1800, fly);
    }
  }

  private toggleHelp(): void {
    if (this.helpLayer) {
      this.helpLayer.destroy();
      this.helpLayer = undefined;
      return;
    }
    const c = this.add.container(0, 0).setDepth(200);
    c.add(this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x0a0e24, 0.72).setOrigin(0));
    const panel = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, 640, 400, C.paper).setStrokeStyle(4, C.ink);
    c.add(panel);
    const lines = [
      "CÓMO JUGAR",
      "",
      "· Apunta con el mouse y haz click para disparar.",
      "· Tienes un cargador por pato: si se te acaba y el",
      "  pato escapa, pierdes una vida.",
      "· R = recargar.  P / ESC = pausa.  1 2 3 = power-ups.",
      "· El combo sube el multiplicador (x4) y se vacía",
      "  si dejas de acertar. Combo 10/20/30 = ¡FRENESÍ!",
      "· Q suelta al cocodrilo cuando su barra está llena.",
      "· ¡No dispares al pato de goma (señuelo)!",
      "· También salen palomas, zorros y osos.",
      "· Las monedas van al BANCO. Gástalas en el menú →",
      "  TIENDA (mejoras, armas, cosméticos, premium).",
      "· 100 niveles. Jefes cada 15 (La Garza, El Jabalí…)",
      "  y EL REY PATO en el nivel 100.",
      "· Modos: Campaña · Contrarreloj · Supervivencia.",
      "",
      "Click para cerrar",
    ];
    c.add(
      this.add
        .text(GAME_WIDTH / 2, GAME_HEIGHT / 2, lines.join("\n"), {
          fontFamily: FONT_FAMILY,
          fontSize: "11px",
          color: css(C.ink),
          align: "left",
          lineSpacing: 8,
        })
        .setOrigin(0.5),
    );
    c.setSize(GAME_WIDTH, GAME_HEIGHT);
    c.setInteractive(new Phaser.Geom.Rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT), Phaser.Geom.Rectangle.Contains);
    c.on("pointerup", () => this.toggleHelp());
    this.helpLayer = c;
  }

  update(time: number, delta: number): void {
    this.bg.update(time, delta);
  }
}
