import Phaser from "phaser";
import { FONT_FAMILY, GAME_HEIGHT, GAME_WIDTH, Scenes } from "../constants";
import { Palette as C, css } from "../art/palette";
import { PixelButton } from "../ui/Button";
import { Audio } from "../audio/AudioBus";
import { WEAPONS, WEAPON_ORDER } from "../data/weapons";
import type { GameScene } from "./GameScene";

interface ShopItem {
  id: string;
  name: string;
  desc: string;
}

const ITEMS: ShopItem[] = [
  { id: "life", name: "Vida extra", desc: "+1 vida y sube el máximo" },
  { id: "mag", name: "Cargador +1", desc: "Una bala más por cargador" },
  { id: "reload", name: "Recarga rápida", desc: "-30% tiempo de recarga" },
  { id: "aim", name: "Mira ancha", desc: "Hitbox de disparo más grande" },
];

interface Row {
  btn: PixelButton;
  label: Phaser.GameObjects.Text;
  cost: () => number | null;
}

export class ShopScene extends Phaser.Scene {
  private owner!: GameScene;
  private coinText!: Phaser.GameObjects.Text;
  private rows: Row[] = [];

  constructor() {
    super(Scenes.Shop);
  }

  init(data: { game: GameScene }): void {
    this.owner = data.game;
  }

  create(): void {
    this.rows = [];
    const cx = GAME_WIDTH / 2;
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x0a0e24, 0.88).setOrigin(0);
    this.add.rectangle(cx, GAME_HEIGHT / 2, 660, 504, C.ink, 0.97).setStrokeStyle(4, C.gold);

    this.add
      .text(cx, 52, "TIENDA", { fontFamily: FONT_FAMILY, fontSize: "24px", color: css(C.gold) })
      .setOrigin(0.5);
    this.coinText = this.add
      .text(cx, 84, "", { fontFamily: FONT_FAMILY, fontSize: "11px", color: css(C.paper) })
      .setOrigin(0.5);

    let y = 122;
    for (const item of ITEMS) {
      this.itemRow(cx, y, item.name, item.desc, () => this.owner.shopCost(item.id), () => this.owner.shopBuy(item.id));
      y += 46;
    }

    this.add
      .text(cx, y + 2, "ARMAS", { fontFamily: FONT_FAMILY, fontSize: "10px", color: css(C.paperShade) })
      .setOrigin(0.5);
    y += 28;
    for (const wid of WEAPON_ORDER) {
      if (wid === "pistol") continue;
      const w = WEAPONS[wid];
      this.itemRow(cx, y, w.label, w.desc, () => this.owner.shopCost(`w_${wid}`), () => this.owner.shopBuy(`w_${wid}`));
      y += 46;
    }

    new PixelButton(this, cx, GAME_HEIGHT - 44, "SEGUIR  ▶", {
      width: 300,
      height: 46,
      fill: C.rust,
      onClick: () => {
        Audio.uiConfirm();
        this.owner.resumeFromShop();
        this.scene.stop();
      },
    });

    this.refresh();
  }

  private itemRow(
    cx: number,
    y: number,
    name: string,
    desc: string,
    cost: () => number | null,
    buy: () => boolean,
  ): void {
    this.add.text(cx - 290, y - 8, name, { fontFamily: FONT_FAMILY, fontSize: "10px", color: css(C.paper) });
    this.add.text(cx - 290, y + 7, desc, { fontFamily: FONT_FAMILY, fontSize: "7px", color: css(C.paperShade) });
    const label = this.add
      .text(cx + 150, y, "", { fontFamily: FONT_FAMILY, fontSize: "9px", color: css(C.gold) })
      .setOrigin(0.5);
    const btn = new PixelButton(this, cx + 248, y, "", {
      width: 96,
      height: 36,
      fontSize: 9,
      fill: C.foliageDark,
      onClick: () => {
        if (buy()) {
          Audio.coin();
          this.refresh();
        } else {
          Audio.uiBack();
        }
      },
    });
    this.rows.push({ btn, label, cost });
  }

  private refresh(): void {
    this.coinText.setText(`Monedas: ${this.owner.coinCount}`);
    for (const row of this.rows) {
      const cost = row.cost();
      if (cost === null) {
        row.label.setText("—");
        row.btn.setLabel("MÁX").setEnabled(false);
      } else if (cost === 0) {
        row.label.setText("");
        row.btn.setLabel("EQUIPAR").setEnabled(true);
      } else {
        row.label.setText(`${cost}`);
        const afford = this.owner.coinCount >= cost;
        row.btn.setLabel(afford ? "COMPRAR" : "CARO").setEnabled(afford);
      }
    }
  }
}
