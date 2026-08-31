import Phaser from "phaser";
import { FONT_FAMILY, GAME_WIDTH, Power, Scenes, type PowerId } from "../constants";
import { Palette as C, css } from "../art/palette";
import type { HudSnapshot } from "./GameScene";

const POWER_ORDER: PowerId[] = [Power.Double, Power.Freeze, Power.Clear];

export class HudScene extends Phaser.Scene {
  private hearts: Phaser.GameObjects.Image[] = [];
  private bullets: Phaser.GameObjects.Image[] = [];
  private bulletMag = 0;

  private scoreText!: Phaser.GameObjects.Text;
  private levelText!: Phaser.GameObjects.Text;
  private reloadText!: Phaser.GameObjects.Text;
  private multText!: Phaser.GameObjects.Text;
  private barFill!: Phaser.GameObjects.Rectangle;
  private banner!: Phaser.GameObjects.Container;
  private bannerBig!: Phaser.GameObjects.Text;
  private bannerSmall!: Phaser.GameObjects.Text;

  private powerSlots: Array<{
    root: Phaser.GameObjects.Container;
    icon: Phaser.GameObjects.Image;
    border: Phaser.GameObjects.Rectangle;
    bar: Phaser.GameObjects.Rectangle;
    keyText: Phaser.GameObjects.Text;
  }> = [];

  constructor() {
    super({ key: Scenes.Hud, active: false });
  }

  create(): void {
    // this scene is launched fresh on every run — clear anything from a prior life
    this.hearts = [];
    this.bullets = [];
    this.bulletMag = 0;
    this.powerSlots = [];

    // hearts
    for (let i = 0; i < 4; i++) {
      this.hearts.push(this.add.image(28 + i * 30, 30, "heart").setScale(1.4).setScrollFactor(0));
    }

    // score + progress bar
    this.scoreText = this.add
      .text(GAME_WIDTH / 2, 22, "0", { fontFamily: FONT_FAMILY, fontSize: "30px", color: css(C.paper), stroke: css(C.ink), strokeThickness: 5 })
      .setOrigin(0.5, 0);
    this.add.rectangle(GAME_WIDTH / 2, 66, 260, 10, C.ink, 0.55).setOrigin(0.5);
    this.barFill = this.add.rectangle(GAME_WIDTH / 2 - 128, 66, 4, 6, C.gold).setOrigin(0, 0.5);
    this.levelText = this.add
      .text(GAME_WIDTH / 2, 82, "", { fontFamily: FONT_FAMILY, fontSize: "9px", color: css(C.paperShade) })
      .setOrigin(0.5, 0);

    // ammo
    this.reloadText = this.add
      .text(GAME_WIDTH - 24, 54, "RECARGANDO", { fontFamily: FONT_FAMILY, fontSize: "9px", color: css(C.gold) })
      .setOrigin(1, 0.5)
      .setVisible(false);

    // multiplier
    this.multText = this.add
      .text(GAME_WIDTH - 30, 150, "", { fontFamily: FONT_FAMILY, fontSize: "22px", color: css(C.gold), stroke: css(C.ink), strokeThickness: 5 })
      .setOrigin(1, 0.5);

    // power slots (bottom-right)
    POWER_ORDER.forEach((id, i) => {
      const x = GAME_WIDTH - 150 + i * 52;
      const y = this.scale.height - 40;
      const root = this.add.container(x, y);
      const border = this.add.rectangle(0, 0, 40, 40, 0x000000, 0).setStrokeStyle(3, C.inkSoft);
      const icon = this.add.image(0, 0, id === Power.Double ? "pow-double" : id === Power.Freeze ? "pow-freeze" : "pow-clear").setScale(1.15);
      const bar = this.add.rectangle(-18, 20, 36, 5, C.gold).setOrigin(0, 0.5);
      const keyText = this.add
        .text(0, 24, "", { fontFamily: FONT_FAMILY, fontSize: "8px", color: css(C.paperShade) })
        .setOrigin(0.5, 0);
      root.add([border, icon, bar, keyText]);
      root.setVisible(false);
      this.powerSlots.push({ root, icon, border, bar, keyText });
    });

    // banner
    this.bannerBig = this.add
      .text(0, -14, "", { fontFamily: FONT_FAMILY, fontSize: "40px", color: css(C.gold), stroke: css(C.ink), strokeThickness: 7 })
      .setOrigin(0.5);
    this.bannerSmall = this.add
      .text(0, 26, "", { fontFamily: FONT_FAMILY, fontSize: "13px", color: css(C.paper) })
      .setOrigin(0.5);
    this.banner = this.add.container(GAME_WIDTH / 2, this.scale.height / 2 - 40, [this.bannerBig, this.bannerSmall]).setAlpha(0);

    this.game.events.on("dh:banner", this.showBanner, this);
    this.game.events.on("dh:banner-mini", this.showMiniBanner, this);
    this.game.events.on("dh:combo", this.pingCombo, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.game.events.off("dh:banner", this.showBanner, this);
      this.game.events.off("dh:banner-mini", this.showMiniBanner, this);
      this.game.events.off("dh:combo", this.pingCombo, this);
    });
  }

  private showBanner(payload: { big: string; small: string }): void {
    this.bannerBig.setText(payload.big);
    this.bannerSmall.setText(payload.small);
    this.banner.setScale(0.6).setAlpha(0);
    this.tweens.killTweensOf(this.banner);
    this.tweens.chain({
      targets: this.banner,
      tweens: [
        { scale: 1, alpha: 1, duration: 240, ease: "back.out" },
        { alpha: 1, duration: 900 },
        { alpha: 0, scale: 1.1, duration: 260, ease: "quad.in" },
      ],
    });
  }

  private showMiniBanner(text: string): void {
    const t = this.add
      .text(GAME_WIDTH / 2, this.scale.height / 2 - 110, text, {
        fontFamily: FONT_FAMILY,
        fontSize: "18px",
        color: css(C.gold),
        stroke: css(C.ink),
        strokeThickness: 5,
      })
      .setOrigin(0.5)
      .setScale(0.7);
    this.tweens.chain({
      targets: t,
      tweens: [
        { scale: 1, duration: 160, ease: "back.out" },
        { y: t.y - 30, alpha: 0, duration: 520, ease: "quad.in" },
      ],
      onComplete: () => t.destroy(),
    });
  }

  private pingCombo(mult: number): void {
    this.tweens.killTweensOf(this.multText);
    this.multText.setScale(1.5);
    this.tweens.add({ targets: this.multText, scale: 1, duration: 260, ease: "back.out" });
    if (mult >= 4) this.cameras.main.flash(120, 255, 212, 71);
  }

  update(): void {
    if (!this.scene.isActive()) return;
    const s = this.registry.get("dh:hud") as HudSnapshot | undefined;
    if (!s) return;

    for (let i = 0; i < this.hearts.length; i++) this.hearts[i].setVisible(i < s.lives);

    this.scoreText.setText(s.score.toLocaleString("es"));
    this.levelText.setText(`NIVEL ${s.level} · ${s.levelName}`);

    const span = Math.max(1, s.target - s.prevTarget);
    const prog = Phaser.Math.Clamp((s.score - s.prevTarget) / span, 0, 1);
    this.barFill.width = 4 + prog * 252;

    // ammo
    if (this.bulletMag !== s.magazine) {
      this.bullets.forEach((b) => b.destroy());
      this.bullets = [];
      for (let i = 0; i < s.magazine; i++) {
        this.bullets.push(this.add.image(GAME_WIDTH - 24 - i * 16, 28, "bullet").setScale(1).setScrollFactor(0));
      }
      this.bulletMag = s.magazine;
    }
    for (let i = 0; i < this.bullets.length; i++) {
      this.bullets[i].setTexture(i < s.ammo ? "bullet" : "bullet-empty");
    }
    this.reloadText.setVisible(s.reloading && Math.floor(s.now / 200) % 2 === 0);

    // multiplier
    this.multText.setText(s.multiplier > 1 ? `x${s.multiplier}` : "");

    // powers
    POWER_ORDER.forEach((id, i) => {
      const slot = this.powerSlots[i];
      const p = s.powers[id];
      if (!p.unlocked) {
        slot.root.setVisible(false);
        return;
      }
      slot.root.setVisible(true);
      slot.keyText.setText(`[${p.key}]`);

      if (p.active) {
        const left = Phaser.Math.Clamp((p.activeUntil - s.now) / p.durationMs, 0, 1);
        slot.border.setStrokeStyle(3, C.gold);
        slot.icon.setAlpha(1);
        slot.bar.setVisible(true).setFillStyle(C.gold);
        slot.bar.width = 36 * left;
      } else if (s.now < p.cooldownUntil) {
        const left = Phaser.Math.Clamp((p.cooldownUntil - s.now) / p.cooldownMs, 0, 1);
        slot.border.setStrokeStyle(3, C.inkSoft);
        slot.icon.setAlpha(0.4);
        slot.bar.setVisible(true).setFillStyle(C.paperShade);
        slot.bar.width = 36 * (1 - left);
      } else {
        slot.border.setStrokeStyle(3, C.foliageLight);
        slot.icon.setAlpha(1);
        slot.bar.setVisible(false);
      }
    });
  }
}
