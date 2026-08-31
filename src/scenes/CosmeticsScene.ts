import Phaser from "phaser";
import { FONT_FAMILY, GAME_HEIGHT, GAME_WIDTH, Scenes } from "../constants";
import { Palette as C, css } from "../art/palette";
import { Parallax } from "../ui/Parallax";
import { PixelButton } from "../ui/Button";
import { Audio } from "../audio/AudioBus";
import {
  COSMETICS,
  buyCosmetic,
  cosmeticOwned,
  equippedCosmetic,
  type CosmeticSlot,
} from "../data/cosmetics";
import { bankCoins } from "../data/bank";

const SLOTS: Array<[CosmeticSlot, string]> = [
  ["crosshair", "MIRAS"],
  ["hat", "SOMBREROS DEL COCODRILO"],
  ["theme", "TEMAS DEL HUD"],
];

export class CosmeticsScene extends Phaser.Scene {
  private bg!: Parallax;
  private layer!: Phaser.GameObjects.Container;
  private coinLabel!: Phaser.GameObjects.Text;

  constructor() {
    super(Scenes.Cosmetics);
  }

  create(): void {
    this.bg = new Parallax(this, "night");
    const cx = GAME_WIDTH / 2;
    this.add.text(cx, 40, "COSMÉTICOS", { fontFamily: FONT_FAMILY, fontSize: "28px", color: css(C.gold) }).setOrigin(0.5);
    this.coinLabel = this.add
      .text(cx, 72, "", { fontFamily: FONT_FAMILY, fontSize: "11px", color: css(C.paper) })
      .setOrigin(0.5);

    this.layer = this.add.container(0, 0);
    this.render();

    new PixelButton(this, cx, GAME_HEIGHT - 40, "VOLVER", {
      width: 240,
      height: 46,
      fill: C.inkSoft,
      onClick: () => this.scene.start(Scenes.Menu),
    });
    this.input.keyboard?.on("keydown-ESC", () => this.scene.start(Scenes.Menu));
    this.cameras.main.fadeIn(200, 0, 0, 0);
  }

  private render(): void {
    this.layer.removeAll(true);
    this.coinLabel.setText(`Banco: ${bankCoins()} monedas`);
    const cx = GAME_WIDTH / 2;

    SLOTS.forEach(([slot, title], si) => {
      const y0 = 108 + si * 128;
      this.layer.add(
        this.add.text(cx - 320, y0, title, { fontFamily: FONT_FAMILY, fontSize: "10px", color: css(C.paperShade) }),
      );
      COSMETICS[slot].forEach((def, ii) => {
        const x = cx - 300 + ii * 168;
        const y = y0 + 26;
        const owned = cosmeticOwned(def.id);
        const equipped = equippedCosmetic(slot) === def.id;

        const card = this.add
          .rectangle(x + 70, y + 40, 150, 96, C.ink, 0.5)
          .setStrokeStyle(2, equipped ? C.gold : C.inkSoft)
          .setInteractive({ useHandCursor: true });
        this.layer.add(card);

        // preview
        if (slot === "theme") {
          this.layer.add(this.add.rectangle(x + 70, y + 22, 40, 24, def.accent ?? 0xffffff));
        } else {
          const tex = slot === "crosshair" ? `xh-${def.id}` : def.id === "none" ? "" : `hat-${def.id}`;
          if (tex && this.textures.exists(tex)) {
            this.layer.add(this.add.image(x + 70, y + 24, tex).setScale(slot === "hat" ? 1.4 : 1).setOrigin(0.5));
          } else {
            this.layer.add(this.add.text(x + 70, y + 18, "—", { fontFamily: FONT_FAMILY, fontSize: "12px", color: css(C.paperShade) }).setOrigin(0.5));
          }
        }

        this.layer.add(
          this.add.text(x + 70, y + 46, def.name, { fontFamily: FONT_FAMILY, fontSize: "7px", color: css(C.paper), align: "center", wordWrap: { width: 140 } }).setOrigin(0.5),
        );

        const state = equipped ? "EQUIPADO" : owned ? "EQUIPAR" : `${def.price}`;
        this.layer.add(
          this.add
            .text(x + 70, y + 68, state, {
              fontFamily: FONT_FAMILY,
              fontSize: "8px",
              color: css(equipped ? C.foliageLight : owned ? C.paper : C.gold),
            })
            .setOrigin(0.5),
        );

        card.on("pointerup", () => {
          if (equipped) return;
          if (buyCosmetic(slot, def.id)) {
            Audio.uiConfirm();
            this.render();
          } else {
            Audio.uiBack();
          }
        });
      });
    });
  }

  update(time: number, delta: number): void {
    this.bg.update(time, delta);
  }
}
