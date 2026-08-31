import Phaser from "phaser";
import { FONT_FAMILY, GAME_WIDTH, Scenes } from "../constants";
import { Palette as C, css } from "../art/palette";
import { Parallax } from "../ui/Parallax";
import { injectDomStyles } from "../ui/domStyles";
import { Audio } from "../audio/AudioBus";
import { login, register } from "../data/accounts";

export class AuthScene extends Phaser.Scene {
  private bg!: Parallax;

  constructor() {
    super(Scenes.Auth);
  }

  create(): void {
    injectDomStyles();
    this.bg = new Parallax(this, "day");

    // flying duck loop for a bit of life behind the card
    const d = this.add.sprite(-60, 130, "duck", 1).setDepth(1);
    this.anims.exists("duck-flap") ||
      this.anims.create({
        key: "duck-flap",
        frames: this.anims.generateFrameNumbers("duck", { start: 0, end: 3 }),
        frameRate: 12,
        repeat: -1,
      });
    d.play("duck-flap");
    this.tweens.add({
      targets: d,
      x: GAME_WIDTH + 60,
      y: 90,
      duration: 6000,
      repeat: -1,
      yoyo: false,
      onRepeat: () => {
        d.x = -60;
        d.y = Phaser.Math.Between(90, 190);
      },
    });

    this.title();

    const cx = GAME_WIDTH / 2;
    const dom = this.add.dom(cx, 342).createFromHTML(this.formHtml());
    const root = dom.node as HTMLElement;

    const $ = <T extends HTMLElement>(id: string) => root.querySelector<T>(`#${id}`)!;
    const loginPane = $("pane-login");
    const regPane = $("pane-reg");
    const tabLogin = $<HTMLButtonElement>("tab-login");
    const tabReg = $<HTMLButtonElement>("tab-reg");
    const err = $("dh-err");

    const h2 = $("dh-h2");
    const showTab = (which: "login" | "reg") => {
      Audio.uiMove();
      const isLogin = which === "login";
      h2.textContent = isLogin ? "Iniciar sesión" : "Crear cuenta";
      loginPane.classList.toggle("dh-hidden", !isLogin);
      regPane.classList.toggle("dh-hidden", isLogin);
      tabLogin.classList.toggle("active", isLogin);
      tabReg.classList.toggle("active", !isLogin);
      err.textContent = "";
    };
    tabLogin.addEventListener("click", () => showTab("login"));
    tabReg.addEventListener("click", () => showTab("reg"));

    const finish = () => {
      Audio.uiConfirm();
      this.cameras.main.fadeOut(220, 0, 0, 0);
      this.time.delayedCall(240, () => this.scene.start(Scenes.Menu));
    };

    $<HTMLButtonElement>("btn-login").addEventListener("click", () => {
      Audio.unlock();
      const res = login($<HTMLInputElement>("li-name").value, $<HTMLInputElement>("li-pass").value);
      if (res.ok) finish();
      else err.textContent = res.error ?? "No se pudo iniciar sesión.";
    });

    $<HTMLButtonElement>("btn-reg").addEventListener("click", () => {
      Audio.unlock();
      const res = register({
        name: $<HTMLInputElement>("rg-name").value,
        password: $<HTMLInputElement>("rg-pass").value,
      });
      if (res.ok) finish();
      else err.textContent = res.error ?? "No se pudo registrar.";
    });

    $<HTMLButtonElement>("btn-guest").addEventListener("click", () => {
      Audio.unlock();
      register({ name: "Invitado-" + Math.random().toString(36).slice(2, 6), password: "invitado" });
      finish();
    });

    root.querySelectorAll<HTMLInputElement>(".dh-input").forEach((el) =>
      el.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          const btn = el.closest(".dh-hidden") ? null : el.closest("#pane-login") ? $("btn-login") : $("btn-reg");
          (btn as HTMLButtonElement | null)?.click();
        }
      }),
    );

    this.cameras.main.fadeIn(260, 0, 0, 0);
  }

  private title(): void {
    const cx = GAME_WIDTH / 2;
    const shadow = this.add
      .text(cx + 5, 118, "SALPICON", { fontFamily: FONT_FAMILY, fontSize: "46px", color: css(C.rust) })
      .setOrigin(0.5);
    const main = this.add
      .text(cx, 112, "SALPICON", { fontFamily: FONT_FAMILY, fontSize: "46px", color: css(C.gold) })
      .setOrigin(0.5);
    this.add
      .text(cx, 158, "tiro en la marisma", { fontFamily: FONT_FAMILY, fontSize: "12px", color: css(C.paper) })
      .setOrigin(0.5)
      .setAlpha(0.85);
    this.tweens.add({
      targets: [main, shadow],
      y: "-=6",
      duration: 1400,
      yoyo: true,
      repeat: -1,
      ease: "sine.inOut",
    });
  }

  private formHtml(): string {
    return `
    <div class="dh-card">
      <h2 id="dh-h2">Iniciar sesión</h2>
      <div class="dh-tabs">
        <button id="tab-login" class="dh-tab active">ENTRAR</button>
        <button id="tab-reg" class="dh-tab">CREAR CUENTA</button>
      </div>

      <div id="pane-login">
        <div class="dh-field"><label>Nombre</label><input id="li-name" class="dh-input" autocomplete="username" /></div>
        <div class="dh-field"><label>Contraseña</label><input id="li-pass" type="password" class="dh-input" autocomplete="current-password" /></div>
        <button id="btn-login" class="dh-btn">ENTRAR</button>
      </div>

      <div id="pane-reg" class="dh-hidden">
        <div class="dh-field"><label>Nombre</label><input id="rg-name" class="dh-input" autocomplete="username" /></div>
        <div class="dh-field"><label>Contraseña</label><input id="rg-pass" type="password" class="dh-input" autocomplete="new-password" /></div>
        <button id="btn-reg" class="dh-btn">CREAR CUENTA</button>
      </div>

      <div id="dh-err" class="dh-error"></div>
      <button id="btn-guest" class="dh-ghost">entrar como invitado</button>
    </div>`;
  }

  update(time: number, delta: number): void {
    this.bg.update(time, delta);
  }
}
