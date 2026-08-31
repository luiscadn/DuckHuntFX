import Phaser from "phaser";
import { FONT_FAMILY, GAME_HEIGHT, GAME_WIDTH, Scenes } from "../constants";
import { Palette as C, css } from "../art/palette";
import { Parallax } from "../ui/Parallax";
import { PixelButton } from "../ui/Button";
import { Audio } from "../audio/AudioBus";
import { DIFFICULTY, getSettings, patchSettings, type Difficulty } from "../data/settings";

const DIFFS: Difficulty[] = ["relax", "normal", "dura"];

export class SettingsScene extends Phaser.Scene {
  private bg!: Parallax;
  private diffButtons: PixelButton[] = [];
  private blurb!: Phaser.GameObjects.Text;

  constructor() {
    super(Scenes.Settings);
  }

  create(): void {
    this.bg = new Parallax(this, "dusk");
    this.diffButtons = [];
    const cx = GAME_WIDTH / 2;
    const s = getSettings();

    this.add.text(cx, 48, "AJUSTES", { fontFamily: FONT_FAMILY, fontSize: "32px", color: css(C.gold) }).setOrigin(0.5);

    // difficulty
    this.add
      .text(cx, 118, "DIFICULTAD", { fontFamily: FONT_FAMILY, fontSize: "12px", color: css(C.paper) })
      .setOrigin(0.5);
    DIFFS.forEach((d, i) => {
      const btn = new PixelButton(this, cx - 220 + i * 220, 162, DIFFICULTY[d].label, {
        width: 200,
        height: 50,
        fontSize: 13,
        fill: C.inkSoft,
        onClick: () => this.setDiff(d),
      });
      this.diffButtons.push(btn);
    });
    this.blurb = this.add
      .text(cx, 210, "", { fontFamily: FONT_FAMILY, fontSize: "9px", color: css(C.paperShade), align: "center" })
      .setOrigin(0.5);
    this.refreshDiff(s.difficulty);

    // toggles
    this.toggleRow(cx, 268, "VIBRACIÓN DE PANTALLA", () => getSettings().shake, (v) => {
      patchSettings({ shake: v });
    });
    this.toggleRow(cx, 312, "MÚSICA", () => getSettings().music, (v) => {
      patchSettings({ music: v });
      Audio.setMusic(v);
    });
    this.toggleRow(cx, 356, "EFECTOS DE SONIDO", () => getSettings().sfx, (v) => {
      patchSettings({ sfx: v });
      Audio.setSfx(v);
    });

    new PixelButton(this, cx, GAME_HEIGHT - 44, "VOLVER", {
      width: 240,
      height: 48,
      fill: C.inkSoft,
      onClick: () => this.scene.start(Scenes.Menu),
    });
    this.input.keyboard?.on("keydown-ESC", () => this.scene.start(Scenes.Menu));
    this.cameras.main.fadeIn(220, 0, 0, 0);
  }

  private setDiff(d: Difficulty): void {
    patchSettings({ difficulty: d });
    this.refreshDiff(d);
  }

  private refreshDiff(active: Difficulty): void {
    DIFFS.forEach((d, i) => {
      const on = d === active;
      this.diffButtons[i].setEnabled(true);
      this.diffButtons[i].setAlpha(on ? 1 : 0.55);
      // recolour by redrawing label with a marker
      this.diffButtons[i].setLabel(on ? `> ${DIFFICULTY[d].label} <` : DIFFICULTY[d].label);
    });
    this.blurb.setText(DIFFICULTY[active].blurb);
  }

  private toggleRow(
    cx: number,
    y: number,
    label: string,
    get: () => boolean,
    set: (v: boolean) => void,
  ): void {
    this.add
      .text(cx - 200, y, label, { fontFamily: FONT_FAMILY, fontSize: "10px", color: css(C.paper) })
      .setOrigin(0, 0.5);
    const btn = new PixelButton(this, cx + 180, y, get() ? "SÍ" : "NO", {
      width: 110,
      height: 40,
      fontSize: 12,
      fill: get() ? C.foliageDark : C.inkSoft,
      onClick: () => {
        const v = !get();
        set(v);
        btn.setLabel(v ? "SÍ" : "NO");
      },
    });
  }

  update(time: number, delta: number): void {
    this.bg.update(time, delta);
  }
}
