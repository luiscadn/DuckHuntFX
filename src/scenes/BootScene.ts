import Phaser from "phaser";
import { Scenes } from "../constants";
import { generateAllTextures } from "../art/generateTextures";
import { isLoggedIn } from "../data/accounts";

export class BootScene extends Phaser.Scene {
  constructor() {
    super(Scenes.Boot);
  }

  async create(): Promise<void> {
    generateAllTextures(this.textures);

    // Make sure the pixel font is ready before any scene draws text with it.
    try {
      await Promise.race([
        (document as Document & { fonts: FontFaceSet }).fonts.load('16px "Press Start 2P"'),
        new Promise((r) => setTimeout(r, 1500)),
      ]);
      await (document as Document & { fonts: FontFaceSet }).fonts.ready;
    } catch {
      /* font optional */
    }

    document.getElementById("splash")?.classList.add("hidden");
    setTimeout(() => document.getElementById("splash")?.remove(), 500);

    this.scene.start(isLoggedIn() ? Scenes.Menu : Scenes.Auth);
  }
}
