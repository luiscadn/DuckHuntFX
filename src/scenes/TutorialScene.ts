/**
 * A short, hands-on tutorial. Five guided steps — aim & shoot, reload, spare the
 * decoy, chain a combo, fire the crocodile ultimate. Fully skippable: the
 * "SALTAR" button (and ESC) jump straight to the menu and mark it done so it
 * never nags again. Reached from the menu, and auto-offered on a first run.
 */

import Phaser from "phaser";
import { FONT_FAMILY, GAME_HEIGHT, GAME_WIDTH, GROUND_Y, Scenes, StoreKeys } from "../constants";
import { Palette as C, css } from "../art/palette";
import { Parallax } from "../ui/Parallax";
import { PixelButton } from "../ui/Button";
import { Audio } from "../audio/AudioBus";

export function tutorialDone(): boolean {
  try {
    return localStorage.getItem(StoreKeys.tutorial) === "1";
  } catch {
    return false;
  }
}

interface Target {
  spr: Phaser.GameObjects.Sprite;
  decoy: boolean;
  dead: boolean;
}

export class TutorialScene extends Phaser.Scene {
  private bg!: Parallax;
  private crosshair!: Phaser.GameObjects.Image;
  private titleText!: Phaser.GameObjects.Text;
  private hintText!: Phaser.GameObjects.Text;
  private progressText!: Phaser.GameObjects.Text;
  private bulletPips: Phaser.GameObjects.Image[] = [];
  private crocBar!: Phaser.GameObjects.Rectangle;

  private targets: Target[] = [];
  private ammo = 3;
  private step = 0;
  private stepDone = false;
  private comboHits = 0;

  constructor() {
    super(Scenes.Tutorial);
  }

  create(): void {
    this.bg = new Parallax(this, "day");
    this.targets = [];
    this.bulletPips = [];
    this.ammo = 3;
    this.step = 0;
    this.stepDone = false;
    this.comboHits = 0;

    Audio.setBossMode(false);
    Audio.setIntensity(0);

    this.titleText = this.add
      .text(GAME_WIDTH / 2, 30, "", {
        fontFamily: FONT_FAMILY,
        fontSize: "16px",
        color: css(C.gold),
        stroke: css(C.ink),
        strokeThickness: 5,
      })
      .setOrigin(0.5)
      .setDepth(50);
    this.hintText = this.add
      .text(GAME_WIDTH / 2, 66, "", {
        fontFamily: FONT_FAMILY,
        fontSize: "10px",
        color: css(C.paper),
        stroke: css(C.ink),
        strokeThickness: 3,
        align: "center",
        lineSpacing: 6,
        wordWrap: { width: 720 },
      })
      .setOrigin(0.5, 0)
      .setDepth(50);
    this.progressText = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 26, "", { fontFamily: FONT_FAMILY, fontSize: "8px", color: css(C.paperShade) })
      .setOrigin(0.5)
      .setDepth(50);

    // ammo pips (bottom-right)
    for (let i = 0; i < 3; i++) {
      this.bulletPips.push(this.add.image(GAME_WIDTH - 24 - i * 16, 28, "bullet").setDepth(50));
    }

    // crocodile meter (bottom-left) — only shown on its step
    this.add.rectangle(24, GAME_HEIGHT - 52, 128, 12, C.ink, 0.55).setOrigin(0, 0.5).setDepth(49).setName("crocMeterBg");
    this.crocBar = this.add.rectangle(26, GAME_HEIGHT - 52, 124, 8, 0x4f7d3f).setOrigin(0, 0.5).setDepth(50);
    this.setCrocVisible(false);

    // crosshair
    this.input.setDefaultCursor("none");
    this.crosshair = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, "crosshair").setDepth(100);
    this.input.on("pointermove", (p: Phaser.Input.Pointer) => this.crosshair.setPosition(p.x, p.y));
    this.input.on("pointerdown", (p: Phaser.Input.Pointer) => this.shoot(p.x, p.y));
    this.input.keyboard?.on("keydown-R", () => this.onReload());
    this.input.keyboard?.on("keydown-Q", () => this.onCroc());
    this.input.keyboard?.on("keydown-ESC", () => this.finish());

    // skip
    new PixelButton(this, GAME_WIDTH - 82, GAME_HEIGHT - 26, "SALTAR", {
      width: 128,
      height: 34,
      fontSize: 9,
      fill: C.inkSoft,
      onClick: () => this.finish(),
    });

    this.cameras.main.fadeIn(220, 0, 0, 0);
    this.beginStep(0);
  }

  // ── steps ──────────────────────────────────────────────────────────

  private readonly steps: Array<{ title: string; hint: string; setup: () => void }> = [
    {
      title: "APUNTAR Y DISPARAR",
      hint: "Mueve el mouse para apuntar.\nHaz CLICK sobre el pato para dispararle.",
      setup: () => this.spawnTarget(false, 60),
    },
    {
      title: "RECARGAR",
      hint: "Cada disparo gasta una bala.\nCuando se acaben, pulsa [R] para recargar.",
      setup: () => {
        this.ammo = 1;
        this.refreshPips();
      },
    },
    {
      title: "EL SEÑUELO",
      hint: "El pato de goma es una trampa: NO le dispares.\nAcierta solo al pato de verdad.",
      setup: () => {
        this.spawnTarget(true, 40);
        this.time.delayedCall(400, () => this.spawnTarget(false, 70));
      },
    },
    {
      title: "COMBO",
      hint: "Encadena aciertos para subir el multiplicador (x4).\nSi fallas o tardas, el combo se vacía. Baja los 3 patos.",
      setup: () => {
        this.comboHits = 0;
        for (let i = 0; i < 3; i++) this.time.delayedCall(i * 500, () => this.spawnTarget(false, 80));
      },
    },
    {
      title: "EL COCODRILO",
      hint: "Al bajar patos se llena la barra del cocodrilo.\nCuando esté llena, pulsa [Q] para soltarlo.",
      setup: () => {
        this.setCrocVisible(true);
        this.crocBar.width = 124;
      },
    },
  ];

  private beginStep(i: number): void {
    this.step = i;
    this.stepDone = false;
    const s = this.steps[i];
    this.titleText.setText(s.title);
    this.hintText.setText(s.hint);
    this.progressText.setText(`PASO ${i + 1} / ${this.steps.length}    ·    [ESC] o SALTAR para omitir`);
    if (i !== 4) this.setCrocVisible(false);
    s.setup();
  }

  private completeStep(): void {
    if (this.stepDone) return;
    this.stepDone = true;
    Audio.uiConfirm();
    this.flashHint("¡BIEN!");
    this.time.delayedCall(750, () => {
      this.clearTargets();
      if (this.step + 1 >= this.steps.length) this.showOutro();
      else this.beginStep(this.step + 1);
    });
  }

  private showOutro(): void {
    this.titleText.setText("¡LISTO!");
    this.hintText.setText("Ya sabes lo básico. Los jefes aparecen cada 15 niveles\ny EL REY PATO espera en el nivel 100. ¡Suerte!");
    this.progressText.setText("");
    new PixelButton(this, GAME_WIDTH / 2, GAME_HEIGHT / 2 + 40, "AL MENÚ", {
      width: 260,
      height: 48,
      fill: C.rust,
      onClick: () => this.finish(),
    });
  }

  private finish(): void {
    try {
      localStorage.setItem(StoreKeys.tutorial, "1");
    } catch {
      /* ignore */
    }
    this.input.setDefaultCursor("default");
    this.cameras.main.fadeOut(200, 0, 0, 0);
    this.time.delayedCall(220, () => this.scene.start(Scenes.Menu));
  }

  // ── interaction ────────────────────────────────────────────────────

  private shoot(x: number, y: number): void {
    if (this.step === 4) return; // croc step: only [Q]
    // don't fire when tapping the SALTAR / AL MENÚ buttons
    if (y > GAME_HEIGHT - 52 && x > GAME_WIDTH - 160) return;
    if (this.stepDone) return;
    if (this.ammo <= 0) {
      Audio.dryFire();
      this.flashHint("SIN BALAS — pulsa [R]");
      return;
    }
    this.ammo--;
    this.refreshPips();
    Audio.shoot();
    this.muzzle(x, y);

    const hit = this.targets.find((t) => !t.dead && t.spr.getBounds().contains(x, y));
    if (!hit) return;

    if (hit.decoy) {
      Audio.uiBack();
      this.cameras.main.shake(180, 0.01);
      this.flashHint("¡ESE NO! Es el señuelo.");
      hit.spr.setTint(0xff5555);
      this.time.delayedCall(200, () => hit.spr.clearTint());
      return;
    }

    hit.dead = true;
    this.featherBurst(hit.spr.x, hit.spr.y);
    this.tweens.add({
      targets: hit.spr,
      y: GROUND_Y + 30,
      angle: 200,
      alpha: 0.2,
      duration: 600,
      ease: "quad.in",
      onComplete: () => hit.spr.destroy(),
    });

    if (this.step === 0 || this.step === 1 || this.step === 2) {
      this.completeStep();
    } else if (this.step === 3) {
      this.comboHits++;
      this.flashHint(`COMBO x${Math.min(4, this.comboHits + 1)}`);
      if (this.comboHits >= 3) this.completeStep();
    }
  }

  private onReload(): void {
    if (this.ammo >= 3) return;
    this.ammo = 3;
    this.refreshPips();
    Audio.reload();
    if (this.step === 1) this.completeStep();
  }

  private onCroc(): void {
    if (this.step !== 4) return;
    Audio.powerup();
    this.cameras.main.flash(180, 255, 255, 255);
    const croc = this.add
      .image(-120, GROUND_Y - 10, "croc", 0)
      .setDepth(60)
      .setScale(1.1);
    this.tweens.add({
      targets: croc,
      x: GAME_WIDTH + 140,
      duration: 900,
      ease: "quad.in",
      onComplete: () => croc.destroy(),
    });
    this.crocBar.width = 4;
    this.completeStep();
  }

  // ── helpers ────────────────────────────────────────────────────────

  private spawnTarget(decoy: boolean, speed: number): void {
    const fromLeft = Math.random() < 0.5;
    const y = Phaser.Math.Between(150, GROUND_Y - 120);
    const spr = this.add
      .sprite(fromLeft ? -40 : GAME_WIDTH + 40, y, decoy ? "duck-decoy" : "duck", 1)
      .setDepth(20)
      .setScale(decoy ? 1.15 : 1.25);
    if (!decoy) {
      spr.setTint(0x9fd15a);
      if (this.anims.exists("duck-flap")) spr.play("duck-flap");
      else {
        this.anims.create({
          key: "duck-flap",
          frames: this.anims.generateFrameNumbers("duck", { start: 0, end: 3 }),
          frameRate: 12,
          repeat: -1,
        });
        spr.play("duck-flap");
      }
    }
    spr.setFlipX(!fromLeft);
    const t: Target = { spr, decoy, dead: false };
    this.targets.push(t);
    this.tweens.add({
      targets: spr,
      x: fromLeft ? GAME_WIDTH + 40 : -40,
      y: y - Phaser.Math.Between(-40, 60),
      duration: (GAME_WIDTH / speed) * 1000,
      ease: "sine.inOut",
      onComplete: () => {
        if (!t.dead) {
          spr.destroy();
          t.dead = true;
          // gently respawn so the learner isn't stuck
          if (!this.stepDone && this.step !== 4) this.spawnTarget(decoy, speed);
        }
      },
    });
  }

  private clearTargets(): void {
    this.targets.forEach((t) => {
      this.tweens.killTweensOf(t.spr);
      t.spr.destroy();
    });
    this.targets = [];
  }

  private refreshPips(): void {
    this.bulletPips.forEach((p, i) => p.setTexture(i < this.ammo ? "bullet" : "bullet-empty"));
  }

  private setCrocVisible(v: boolean): void {
    this.crocBar.setVisible(v);
    (this.children.getByName("crocMeterBg") as Phaser.GameObjects.Rectangle | null)?.setVisible(v);
  }

  private flashHint(text: string): void {
    const t = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 70, text, {
        fontFamily: FONT_FAMILY,
        fontSize: "20px",
        color: css(C.gold),
        stroke: css(C.ink),
        strokeThickness: 6,
      })
      .setOrigin(0.5)
      .setDepth(120)
      .setScale(0.7);
    this.tweens.chain({
      targets: t,
      tweens: [
        { scale: 1, duration: 150, ease: "back.out" },
        { y: t.y - 26, alpha: 0, duration: 480, ease: "quad.in" },
      ],
      onComplete: () => t.destroy(),
    });
  }

  private muzzle(x: number, y: number): void {
    const m = this.add.image(x, y, "muzzle").setDepth(110).setScale(0.6);
    this.tweens.add({ targets: m, scale: 1.1, alpha: 0, duration: 130, onComplete: () => m.destroy() });
  }

  private featherBurst(x: number, y: number): void {
    for (let i = 0; i < 6; i++) {
      const f = this.add.image(x, y, "feather").setDepth(30);
      this.tweens.add({
        targets: f,
        x: x + Phaser.Math.Between(-50, 50),
        y: y + Phaser.Math.Between(-10, 60),
        angle: Phaser.Math.Between(-180, 180),
        alpha: 0,
        duration: 600,
        onComplete: () => f.destroy(),
      });
    }
  }

  update(time: number, delta: number): void {
    this.bg.update(time, delta);
  }
}
