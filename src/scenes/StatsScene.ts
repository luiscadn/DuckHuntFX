import Phaser from "phaser";
import { FONT_FAMILY, GAME_HEIGHT, GAME_WIDTH, Scenes } from "../constants";
import { Palette as C, css } from "../art/palette";
import { Parallax } from "../ui/Parallax";
import { PixelButton } from "../ui/Button";
import { accuracyPct, favouriteWeapon, getStats } from "../data/stats";
import { WEAPONS } from "../data/weapons";
import { bankCoins, bankLifetimeEarned } from "../data/bank";

export class StatsScene extends Phaser.Scene {
  private bg!: Parallax;

  constructor() {
    super(Scenes.Stats);
  }

  create(): void {
    this.bg = new Parallax(this, "dusk");
    const cx = GAME_WIDTH / 2;
    const s = getStats();

    this.add.text(cx, 46, "ESTADÍSTICAS", { fontFamily: FONT_FAMILY, fontSize: "30px", color: css(C.gold) }).setOrigin(0.5);

    const fav = favouriteWeapon();
    const mins = Math.round(s.playtimeMs / 60000);
    const rows: Array<[string, string]> = [
      ["Partidas jugadas", `${s.runs}`],
      ["Victorias", `${s.wins}`],
      ["Patos cazados", `${s.ducks}`],
      ["Puntería media", `${accuracyPct()}%`],
      ["Mejor puntuación", s.bestScore.toLocaleString("es")],
      ["Mejor combo", `x${s.bestCombo}`],
      ["Arma favorita", fav ? WEAPONS[fav].label : "—"],
      ["Tiempo jugado", mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins} min`],
      ["Piñatas reventadas", `${s.pinatas}`],
      ["Señuelos disparados", `${s.decoysHit}`],
      ["Frenesíes activados", `${s.frenzies}`],
      ["Cocodrilo desatado", `${s.rampages}`],
      ["Monedas en el banco", `${bankCoins()}`],
      ["Monedas ganadas (total)", `${bankLifetimeEarned()}`],
    ];

    const colX = [cx - 260, cx + 20];
    rows.forEach((r, i) => {
      const col = i < 7 ? 0 : 1;
      const y = 108 + (i % 7) * 44;
      this.add.text(colX[col], y, r[0], { fontFamily: FONT_FAMILY, fontSize: "9px", color: css(C.paperShade) });
      this.add.text(colX[col], y + 16, r[1], { fontFamily: FONT_FAMILY, fontSize: "13px", color: css(C.paper) });
    });

    new PixelButton(this, cx, GAME_HEIGHT - 44, "VOLVER", {
      width: 240,
      height: 48,
      fill: C.inkSoft,
      onClick: () => this.scene.start(Scenes.Menu),
    });
    this.input.keyboard?.on("keydown-ESC", () => this.scene.start(Scenes.Menu));
    this.cameras.main.fadeIn(200, 0, 0, 0);
  }

  update(time: number, delta: number): void {
    this.bg.update(time, delta);
  }
}
