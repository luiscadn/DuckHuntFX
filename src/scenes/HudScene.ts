import Phaser from "phaser";
import { FONT_FAMILY, GAME_WIDTH, Power, Scenes, type PowerId } from "../constants";
import { Palette as C, css } from "../art/palette";
import type { AchievementDef } from "../data/achievements";
import type { HudSnapshot } from "./GameScene";

const POWER_ORDER: PowerId[] = [Power.Double, Power.Freeze, Power.Clear];

export class HudScene extends Phaser.Scene {
  private hearts: Phaser.GameObjects.Image[] = [];
  private heartMax = 0;
  private bullets: Phaser.GameObjects.Image[] = [];
  private bulletMag = 0;

  private scoreText!: Phaser.GameObjects.Text;
  private levelText!: Phaser.GameObjects.Text;
  private reloadText!: Phaser.GameObjects.Text;
  private multText!: Phaser.GameObjects.Text;
  private coinText!: Phaser.GameObjects.Text;
  private weaponText!: Phaser.GameObjects.Text;
  private barFill!: Phaser.GameObjects.Rectangle;
  private comboBar!: Phaser.GameObjects.Rectangle;
  private comboBarBg!: Phaser.GameObjects.Rectangle;
  private bossBarBg!: Phaser.GameObjects.Rectangle;
  private bossBarFill!: Phaser.GameObjects.Rectangle;
  private bossLabel!: Phaser.GameObjects.Text;
  private banner!: Phaser.GameObjects.Container;
  private bannerBig!: Phaser.GameObjects.Text;
  private bannerSmall!: Phaser.GameObjects.Text;

  private toastQueue: AchievementDef[] = [];
  private toastBusy = false;

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
    this.heartMax = 0;
    this.bullets = [];
    this.bulletMag = 0;
    this.powerSlots = [];
    this.toastQueue = [];
    this.toastBusy = false;

    this.coinText = this.add
      .text(20, this.scale.height - 22, "", { fontFamily: FONT_FAMILY, fontSize: "10px", color: css(C.gold) })
      .setOrigin(0, 0.5);
    this.weaponText = this.add
      .text(GAME_WIDTH - 24, 74, "", { fontFamily: FONT_FAMILY, fontSize: "8px", color: css(C.paperShade) })
      .setOrigin(1, 0.5);

    // boss health bar (hidden unless a boss is present)
    this.bossBarBg = this.add.rectangle(GAME_WIDTH / 2, 118, 440, 16, C.ink, 0.75).setStrokeStyle(2, C.blood).setVisible(false);
    this.bossBarFill = this.add.rectangle(GAME_WIDTH / 2 - 216, 118, 432, 10, C.blood).setOrigin(0, 0.5).setVisible(false);
    this.bossLabel = this.add
      .text(GAME_WIDTH / 2, 102, "EL REY PATO", { fontFamily: FONT_FAMILY, fontSize: "9px", color: css(C.gold) })
      .setOrigin(0.5)
      .setVisible(false);

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

    // multiplier + combo meter
    this.multText = this.add
      .text(GAME_WIDTH - 30, 150, "", { fontFamily: FONT_FAMILY, fontSize: "22px", color: css(C.gold), stroke: css(C.ink), strokeThickness: 5 })
      .setOrigin(1, 0.5);
    this.comboBarBg = this.add
      .rectangle(GAME_WIDTH - 30, 172, 96, 8, C.ink, 0.5)
      .setOrigin(1, 0.5)
      .setVisible(false);
    this.comboBar = this.add
      .rectangle(GAME_WIDTH - 32, 172, 92, 5, C.gold)
      .setOrigin(1, 0.5)
      .setVisible(false);

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
    this.game.events.on("dh:achievement", this.queueToast, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.game.events.off("dh:banner", this.showBanner, this);
      this.game.events.off("dh:banner-mini", this.showMiniBanner, this);
      this.game.events.off("dh:combo", this.pingCombo, this);
      this.game.events.off("dh:achievement", this.queueToast, this);
    });
  }

  private queueToast(def: AchievementDef): void {
    this.toastQueue.push(def);
    if (!this.toastBusy) this.pumpToast();
  }

  private pumpToast(): void {
    const def = this.toastQueue.shift();
    if (!def) {
      this.toastBusy = false;
      return;
    }
    this.toastBusy = true;

    const w = 260;
    const startX = GAME_WIDTH + w;
    const restX = GAME_WIDTH - w / 2 - 16;
    const y = 118;

    const card = this.add.container(startX, y).setDepth(500);
    card.add(this.add.rectangle(0, 0, w, 54, C.ink, 0.92).setStrokeStyle(3, C.gold));
    card.add(this.add.image(-w / 2 + 28, 0, "medal").setScale(1));
    card.add(
      this.add
        .text(-w / 2 + 54, -13, "LOGRO", { fontFamily: FONT_FAMILY, fontSize: "8px", color: css(C.gold) }),
    );
    card.add(
      this.add
        .text(-w / 2 + 54, 1, def.title, { fontFamily: FONT_FAMILY, fontSize: "11px", color: css(C.paper) }),
    );

    this.tweens.chain({
      targets: card,
      tweens: [
        { x: restX, duration: 260, ease: "back.out" },
        { x: restX, duration: 1800 },
        { x: startX, duration: 240, ease: "quad.in" },
      ],
      onComplete: () => {
        card.destroy();
        this.pumpToast();
      },
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

    // hearts (rebuilt when the max changes, e.g. after a shop purchase)
    if (this.heartMax !== s.maxLives) {
      this.hearts.forEach((h) => h.destroy());
      this.hearts = [];
      const n = Math.min(s.maxLives, 8);
      for (let i = 0; i < n; i++) {
        this.hearts.push(this.add.image(28 + i * 28, 30, "heart").setScale(1.3).setScrollFactor(0));
      }
      this.heartMax = s.maxLives;
    }
    for (let i = 0; i < this.hearts.length; i++) {
      this.hearts[i].setVisible(true).setAlpha(i < s.lives ? 1 : 0.18);
    }

    this.scoreText.setText(s.score.toLocaleString("es"));
    this.levelText.setText(`NIVEL ${s.level} · ${s.levelName}`);
    this.coinText.setText(`MONEDAS ${s.coins}`);
    this.weaponText.setText(s.weapon.toUpperCase());

    // boss bar
    const boss = s.boss;
    this.bossBarBg.setVisible(!!boss);
    this.bossBarFill.setVisible(!!boss);
    this.bossLabel.setVisible(!!boss);
    if (boss) this.bossBarFill.width = 432 * Phaser.Math.Clamp(boss.hp / boss.maxHp, 0, 1);

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

    // multiplier + combo decay meter
    this.multText.setText(s.multiplier > 1 ? `x${s.multiplier}` : "");
    const showCombo = s.combo >= 2;
    this.comboBarBg.setVisible(showCombo);
    this.comboBar.setVisible(showCombo);
    if (showCombo) {
      const frac = Phaser.Math.Clamp(s.comboTimer / Math.max(1, s.comboWindow), 0, 1);
      this.comboBar.width = 92 * frac;
      this.comboBar.setFillStyle(frac < 0.25 ? C.blood : frac < 0.5 ? C.goldDeep : C.gold);
    }

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
