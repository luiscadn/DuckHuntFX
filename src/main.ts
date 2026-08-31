import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH } from "./constants";
import { Palette, css } from "./art/palette";
import { Audio } from "./audio/AudioBus";
import { BootScene } from "./scenes/BootScene";
import { AuthScene } from "./scenes/AuthScene";
import { MenuScene } from "./scenes/MenuScene";
import { ScoresScene } from "./scenes/ScoresScene";
import { AchievementsScene } from "./scenes/AchievementsScene";
import { SettingsScene } from "./scenes/SettingsScene";
import { StatsScene } from "./scenes/StatsScene";
import { MissionsScene } from "./scenes/MissionsScene";
import { ShopScene } from "./scenes/ShopScene";
import { GameScene } from "./scenes/GameScene";
import { HudScene } from "./scenes/HudScene";
import { GameOverScene } from "./scenes/GameOverScene";
import { getSettings } from "./data/settings";

// Resume / create the audio context on the first real user gesture, then apply saved audio prefs.
const unlock = () => {
  Audio.unlock();
  const s = getSettings();
  Audio.applySettings({ music: s.music, sfx: s.sfx });
};
window.addEventListener("pointerdown", unlock, { once: true });
window.addEventListener("keydown", unlock, { once: true });

new Phaser.Game({
  type: Phaser.AUTO,
  parent: "app",
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: css(Palette.sky1Night),
  pixelArt: true,
  roundPixels: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  dom: { createContainer: true },
  render: { antialias: false },
  scene: [
    BootScene,
    AuthScene,
    MenuScene,
    ScoresScene,
    AchievementsScene,
    SettingsScene,
    StatsScene,
    MissionsScene,
    GameScene,
    HudScene,
    ShopScene,
    GameOverScene,
  ],
});
