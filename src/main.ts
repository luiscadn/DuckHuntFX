import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH } from "./constants";
import { Palette, css } from "./art/palette";
import { Audio } from "./audio/AudioBus";
import { BootScene } from "./scenes/BootScene";
import { AuthScene } from "./scenes/AuthScene";
import { MenuScene } from "./scenes/MenuScene";
import { ScoresScene } from "./scenes/ScoresScene";
import { GameScene } from "./scenes/GameScene";
import { HudScene } from "./scenes/HudScene";
import { GameOverScene } from "./scenes/GameOverScene";

// Resume / create the audio context on the first real user gesture.
const unlock = () => Audio.unlock();
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
  scene: [BootScene, AuthScene, MenuScene, ScoresScene, GameScene, HudScene, GameOverScene],
});
