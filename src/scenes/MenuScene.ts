import Phaser from "phaser";
import { FONT_FAMILY, GAME_HEIGHT, GAME_WIDTH, Scenes } from "../constants";
import { Palette as C, css } from "../art/palette";
import { Parallax } from "../ui/Parallax";
import { PixelButton } from "../ui/Button";
import { Audio } from "../audio/AudioBus";
import { currentUser, logout } from "../data/accounts";
import { ACHIEVEMENTS, unlockedCount } from "../data/achievements";

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
      .text(cx + 5, 82, "DUCK  HUNT", { fontFamily: FONT_FAMILY, fontSize: "50px", color: css(C.rust) })
      .setOrigin(0.5);
    const title = this.add
      .text(cx, 76, "DUCK  HUNT", { fontFamily: FONT_FAMILY, fontSize: "50px", color: css(C.gold) })
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
        .text(cx, 176, `Mejor ${user.bestScore.toLocaleString("es")}   ·   Nivel máx ${user.bestLevel}`, {
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
    new PixelButton(this, cx, 234, "JUGAR", {
      width: 340,
      height: 56,
      fill: C.rust,
      onClick: () => {
        this.cameras.main.fadeOut(220, 0, 0, 0);
        this.time.delayedCall(240, () => this.scene.start(Scenes.Game));
      },
    });
    const done = unlockedCount();
    const grid: Array<[string, () => void]> = [
      ["PUNTAJES", () => this.scene.start(Scenes.Scores)],
      [`LOGROS ${done}/${ACHIEVEMENTS.length}`, () => this.scene.start(Scenes.Achievements)],
      ["AJUSTES", () => this.scene.start(Scenes.Settings)],
      ["CÓMO JUGAR", () => this.toggleHelp()],
    ];
    grid.forEach(([label, fn], i) => {
      const gx = cx + (i % 2 === 0 ? -90 : 90);
      const gy = 300 + Math.floor(i / 2) * 62;
      new PixelButton(this, gx, gy, label, {
        width: 168,
        height: 52,
        fontSize: 11,
        fill: C.inkSoft,
        onClick: fn,
      });
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
      "· R = recargar.  P / ESC = pausa.",
      "· 1 2 3 = power-ups (se desbloquean por nivel).",
      "· El combo sube el multiplicador (x4) pero se",
      "  vacía si dejas de acertar.",
      "· Entre niveles hay TIENDA: gasta monedas en",
      "  mejoras y armas. Nivel 5 = jefe final.",
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
