import Phaser from "phaser";
import { FONT_FAMILY, GAME_HEIGHT, GAME_WIDTH, Scenes } from "../constants";
import { Palette as C, css } from "../art/palette";
import { Parallax } from "../ui/Parallax";
import { PixelButton } from "../ui/Button";
import { currentUser } from "../data/accounts";
import { leaderboard, recentRuns } from "../data/scores";

export class ScoresScene extends Phaser.Scene {
  private bg!: Parallax;

  constructor() {
    super(Scenes.Scores);
  }

  create(): void {
    this.bg = new Parallax(this, "dusk");
    const cx = GAME_WIDTH / 2;
    const me = currentUser()?.name.toLowerCase();

    this.add
      .text(cx, 56, "PUNTAJES", { fontFamily: FONT_FAMILY, fontSize: "34px", color: css(C.gold) })
      .setOrigin(0.5);

    // leaderboard
    this.add.text(150, 110, "MEJORES JUGADORES", { fontFamily: FONT_FAMILY, fontSize: "12px", color: css(C.paper) });
    const board = leaderboard(10);
    if (board.length === 0) {
      this.add.text(150, 150, "Aún no hay partidas.", { fontFamily: FONT_FAMILY, fontSize: "10px", color: css(C.paperShade) });
    }
    board.forEach((row, i) => {
      const y = 150 + i * 30;
      const mine = row.name.toLowerCase() === me;
      const color = css(mine ? C.gold : C.paper);
      this.add.text(150, y, `${String(i + 1).padStart(2, "0")}`, { fontFamily: FONT_FAMILY, fontSize: "11px", color: css(C.paperShade) });
      this.add.text(200, y, row.name.slice(0, 12) + (mine ? "  (tú)" : ""), { fontFamily: FONT_FAMILY, fontSize: "11px", color });
      this.add.text(520, y, String(row.score).padStart(6, " "), { fontFamily: FONT_FAMILY, fontSize: "11px", color }).setOrigin(1, 0);
      this.add.text(600, y, `N${row.level}`, { fontFamily: FONT_FAMILY, fontSize: "10px", color: css(C.paperShade) });
    });

    // recent runs
    this.add.text(660, 110, "PARTIDAS RECIENTES", { fontFamily: FONT_FAMILY, fontSize: "12px", color: css(C.paper) });
    const runs = recentRuns(8);
    if (runs.length === 0) {
      this.add.text(660, 150, "—", { fontFamily: FONT_FAMILY, fontSize: "10px", color: css(C.paperShade) });
    }
    runs.forEach((r, i) => {
      const y = 150 + i * 26;
      this.add.text(660, y, `${r.name.slice(0, 8)}`, { fontFamily: FONT_FAMILY, fontSize: "9px", color: css(C.paper) });
      this.add.text(GAME_WIDTH - 40, y, `${r.score}`, { fontFamily: FONT_FAMILY, fontSize: "9px", color: css(C.gold) }).setOrigin(1, 0);
    });

    new PixelButton(this, cx, GAME_HEIGHT - 48, "VOLVER", {
      width: 260,
      height: 50,
      fill: C.inkSoft,
      onClick: () => this.scene.start(Scenes.Menu),
    });

    this.input.keyboard?.on("keydown-ESC", () => this.scene.start(Scenes.Menu));
    this.cameras.main.fadeIn(220, 0, 0, 0);
  }

  update(time: number, delta: number): void {
    this.bg.update(time, delta);
  }
}
