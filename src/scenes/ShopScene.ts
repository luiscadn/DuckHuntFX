import Phaser from "phaser";
import { FONT_FAMILY, GAME_HEIGHT, GAME_WIDTH, Scenes } from "../constants";
import { Palette as C, css } from "../art/palette";
import { Parallax } from "../ui/Parallax";
import { PixelButton } from "../ui/Button";
import { Audio } from "../audio/AudioBus";
import { bankCoins, bankSpend } from "../data/bank";
import { UPGRADE_DEFS, buyUpgrade, upgradeCost, upgradeLevel } from "../data/upgrades";
import { WEAPONS, WEAPON_ORDER, equipWeapon, equippedWeapon, isWeaponUnlocked, unlockWeapon } from "../data/weapons";
import {
  COSMETICS,
  buyCosmetic,
  cosmeticOwned,
  equippedCosmetic,
  type CosmeticSlot,
} from "../data/cosmetics";
import { PREMIUM_ITEMS, premiumOwned, requestPurchase } from "../data/premium";
import { lifetimeDucks } from "../data/achievements";

type Tab = "mejoras" | "armas" | "cosmeticos" | "premium";
const TABS: Array<[Tab, string]> = [
  ["mejoras", "MEJORAS"],
  ["armas", "ARMAS"],
  ["cosmeticos", "COSMÉTICOS"],
  ["premium", "PREMIUM"],
];

export class ShopScene extends Phaser.Scene {
  private bg!: Parallax;
  private tab: Tab = "mejoras";
  private layer!: Phaser.GameObjects.Container;
  private coinText!: Phaser.GameObjects.Text;
  private tabBtns: PixelButton[] = [];

  constructor() {
    super(Scenes.Shop);
  }

  create(): void {
    this.bg = new Parallax(this, "dusk");
    const cx = GAME_WIDTH / 2;
    this.tab = "mejoras";
    this.tabBtns = [];

    this.add.image(cx - 118, 34, "shop-icon").setScale(1.4);
    this.add.text(cx, 30, "TIENDA", { fontFamily: FONT_FAMILY, fontSize: "26px", color: css(C.gold) }).setOrigin(0.5);
    this.coinText = this.add
      .text(cx, 60, "", { fontFamily: FONT_FAMILY, fontSize: "11px", color: css(C.paper) })
      .setOrigin(0.5);

    TABS.forEach(([id, label], i) => {
      const btn = new PixelButton(this, cx - 297 + i * 198, 92, label, {
        width: 186,
        height: 40,
        fontSize: 10,
        fill: C.inkSoft,
        onClick: () => {
          this.tab = id;
          this.render();
        },
      });
      this.tabBtns.push(btn);
    });

    this.layer = this.add.container(0, 0);
    this.render();

    new PixelButton(this, cx, GAME_HEIGHT - 38, "VOLVER", {
      width: 240,
      height: 44,
      fill: C.inkSoft,
      onClick: () => this.scene.start(Scenes.Menu),
    });
    this.input.keyboard?.on("keydown-ESC", () => this.scene.start(Scenes.Menu));
    this.cameras.main.fadeIn(200, 0, 0, 0);
  }

  private render(): void {
    this.layer.removeAll(true);
    this.coinText.setText(`Banco: ${bankCoins()} monedas`);
    this.tabBtns.forEach((b, i) => b.setAlpha(TABS[i][0] === this.tab ? 1 : 0.5));
    if (this.tab === "mejoras") this.renderMejoras();
    else if (this.tab === "armas") this.renderArmas();
    else if (this.tab === "cosmeticos") this.renderCosmeticos();
    else this.renderPremium();
  }

  private row(
    y: number,
    name: string,
    desc: string,
    right: string,
    rightColor: number,
    enabled: boolean,
    onClick: () => void,
    btnLabel: string,
  ): void {
    const cx = GAME_WIDTH / 2;
    this.layer.add(this.add.rectangle(cx, y + 16, 660, 60, C.ink, 0.4).setStrokeStyle(2, C.inkSoft));
    this.layer.add(this.add.text(cx - 310, y, name, { fontFamily: FONT_FAMILY, fontSize: "11px", color: css(C.paper) }));
    this.layer.add(this.add.text(cx - 310, y + 16, desc, { fontFamily: FONT_FAMILY, fontSize: "7px", color: css(C.paperShade) }));
    this.layer.add(
      this.add.text(cx + 150, y + 8, right, { fontFamily: FONT_FAMILY, fontSize: "10px", color: css(rightColor) }).setOrigin(1, 0),
    );
    const btn = new PixelButton(this, cx + 258, y + 8, btnLabel, {
      width: 100,
      height: 36,
      fontSize: 9,
      fill: enabled ? C.foliageDark : C.inkSoft,
      onClick,
    });
    btn.setEnabled(enabled);
    this.layer.add(btn);
  }

  private renderMejoras(): void {
    let y = 132;
    for (const def of UPGRADE_DEFS) {
      const lvl = upgradeLevel(def.id);
      const cost = upgradeCost(def.id);
      const maxed = cost === null;
      const afford = !maxed && bankCoins() >= cost!;
      this.row(
        y,
        `${def.name}  (${lvl}/${def.max})`,
        def.desc,
        maxed ? "MÁX" : `${cost}`,
        maxed ? C.paperShade : C.gold,
        afford,
        () => {
          if (buyUpgrade(def.id)) {
            Audio.uiConfirm();
            this.render();
          } else Audio.uiBack();
        },
        maxed ? "—" : "COMPRAR",
      );
      y += 74;
    }
  }

  private renderArmas(): void {
    let y = 132;
    for (const wid of WEAPON_ORDER) {
      const w = WEAPONS[wid];
      const owned = isWeaponUnlocked(wid, lifetimeDucks());
      const equipped = equippedWeapon().id === wid;
      const afford = owned || bankCoins() >= w.bankCost;
      this.row(
        y,
        w.label,
        w.desc,
        owned ? "" : `${w.bankCost}`,
        C.gold,
        !equipped && afford,
        () => {
          if (equipped) return;
          if (owned) {
            equipWeapon(wid);
            Audio.uiConfirm();
            this.render();
          } else if (bankSpend(w.bankCost)) {
            unlockWeapon(wid);
            equipWeapon(wid);
            Audio.uiConfirm();
            this.render();
          } else Audio.uiBack();
        },
        equipped ? "EQUIPADA" : owned ? "EQUIPAR" : "COMPRAR",
      );
      y += 74;
    }
  }

  private renderCosmeticos(): void {
    const cx = GAME_WIDTH / 2;
    const slots: Array<[CosmeticSlot, string]> = [
      ["crosshair", "MIRAS"],
      ["hat", "SOMBREROS DEL COCODRILO"],
      ["theme", "TEMAS DEL HUD"],
    ];
    slots.forEach(([slot, title], si) => {
      const y0 = 128 + si * 126;
      this.layer.add(
        this.add.text(cx - 320, y0, title, { fontFamily: FONT_FAMILY, fontSize: "9px", color: css(C.paperShade) }),
      );
      COSMETICS[slot].forEach((def, ii) => {
        const x = cx - 300 + ii * 165;
        const y = y0 + 24;
        const owned = cosmeticOwned(def.id);
        const equipped = equippedCosmetic(slot) === def.id;
        const afford = owned || bankCoins() >= def.price;

        const card = this.add
          .rectangle(x + 72, y + 42, 150, 92, C.ink, 0.5)
          .setStrokeStyle(equipped ? 3 : 2, equipped ? C.gold : C.inkSoft)
          .setInteractive({ useHandCursor: true });
        this.layer.add(card);

        // visual preview
        if (slot === "theme") {
          this.layer.add(this.add.rectangle(x + 72, y + 22, 46, 26, def.accent ?? 0xffffff).setStrokeStyle(1, C.ink));
        } else {
          const tex = slot === "crosshair" ? `xh-${def.id}` : def.id === "none" ? "" : `hat-${def.id}`;
          if (tex && this.textures.exists(tex)) {
            this.layer.add(this.add.image(x + 72, y + 24, tex).setScale(slot === "hat" ? 1.6 : 1.05));
          } else {
            this.layer.add(
              this.add.text(x + 72, y + 20, "∅", { fontFamily: FONT_FAMILY, fontSize: "14px", color: css(C.paperShade) }).setOrigin(0.5),
            );
          }
        }

        this.layer.add(
          this.add
            .text(x + 72, y + 46, def.name, {
              fontFamily: FONT_FAMILY,
              fontSize: "7px",
              color: css(C.paper),
              align: "center",
              wordWrap: { width: 138 },
            })
            .setOrigin(0.5),
        );
        this.layer.add(
          this.add
            .text(x + 72, y + 68, equipped ? "EQUIPADO" : owned ? "EQUIPAR" : `${def.price}`, {
              fontFamily: FONT_FAMILY,
              fontSize: "8px",
              color: css(equipped ? C.foliageLight : owned ? C.paper : afford ? C.gold : C.blood),
            })
            .setOrigin(0.5),
        );

        card.on("pointerup", () => {
          if (equipped) return;
          if (buyCosmetic(slot, def.id)) {
            Audio.uiConfirm();
            this.render();
          } else Audio.uiBack();
        });
      });
    });
  }

  private renderPremium(): void {
    this.layer.add(
      this.add
        .text(GAME_WIDTH / 2, 122, "Compras con dinero real — demostración, no hay pago activo", {
          fontFamily: FONT_FAMILY,
          fontSize: "8px",
          color: css(C.paperShade),
        })
        .setOrigin(0.5),
    );
    let y = 150;
    for (const item of PREMIUM_ITEMS) {
      const owned = premiumOwned(item.id);
      this.row(
        y,
        item.name,
        item.desc,
        item.price,
        C.foliageLight,
        !owned,
        () => {
          const res = requestPurchase(item.id);
          this.showModal(res.message);
        },
        owned ? "TIENES" : "COMPRAR",
      );
      y += 74;
    }
  }

  private showModal(msg: string): void {
    const cx = GAME_WIDTH / 2;
    const c = this.add.container(0, 0).setDepth(400);
    c.add(this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x0a0e24, 0.8).setOrigin(0).setInteractive());
    c.add(this.add.rectangle(cx, GAME_HEIGHT / 2, 560, 220, C.ink).setStrokeStyle(3, C.gold));
    c.add(this.add.text(cx, GAME_HEIGHT / 2 - 70, "PAGO NO DISPONIBLE", { fontFamily: FONT_FAMILY, fontSize: "14px", color: css(C.gold) }).setOrigin(0.5));
    c.add(this.add.text(cx, GAME_HEIGHT / 2 - 6, msg, { fontFamily: FONT_FAMILY, fontSize: "8px", color: css(C.paper), align: "center", lineSpacing: 6 }).setOrigin(0.5));
    c.add(this.add.text(cx, GAME_HEIGHT / 2 + 74, "[ cerrar ]", { fontFamily: FONT_FAMILY, fontSize: "9px", color: css(C.paperShade) }).setOrigin(0.5));
    c.setSize(GAME_WIDTH, GAME_HEIGHT).setInteractive(new Phaser.Geom.Rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT), Phaser.Geom.Rectangle.Contains);
    c.on("pointerup", () => c.destroy());
  }

  update(time: number, delta: number): void {
    this.bg.update(time, delta);
  }
}
