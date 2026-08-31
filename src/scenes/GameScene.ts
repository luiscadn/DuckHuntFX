import Phaser from "phaser";
import {
  FONT_FAMILY,
  GAME_HEIGHT,
  GAME_WIDTH,
  GROUND_Y,
  Power,
  Rules,
  Scenes,
  type PowerId,
} from "../constants";
import { Palette as C, css } from "../art/palette";
import { Parallax } from "../ui/Parallax";
import { Audio } from "../audio/AudioBus";
import { Duck } from "../objects/Duck";
import { Dog } from "../objects/Dog";
import { LAST_LEVEL, LEVELS, PowerConfig, levelAt, unlockedPowers } from "../data/levels";
import { currentUser, recordResult } from "../data/accounts";
import { recordRun } from "../data/scores";

interface PowerState {
  unlocked: boolean;
  active: boolean;
  activeUntil: number;
  cooldownUntil: number;
}

export interface HudSnapshot {
  score: number;
  lives: number;
  level: number;
  levelName: string;
  target: number;
  prevTarget: number;
  ammo: number;
  magazine: number;
  reloading: boolean;
  multiplier: number;
  combo: number;
  powers: Record<PowerId, PowerState & { key: string; label: string; icon: string; durationMs: number; cooldownMs: number }>;
  now: number;
}

export class GameScene extends Phaser.Scene {
  private bg!: Parallax;
  private dog!: Dog;
  private crosshair!: Phaser.GameObjects.Image;
  private ducks!: Phaser.GameObjects.Group;

  private score = 0;
  private lives: number = Rules.startingLives;
  private levelIndex = 1;
  private ammo: number = Rules.baseMagazine;
  private magazine: number = Rules.baseMagazine;
  private combo = 0;
  private multiplier = 1;

  private reloading = false;
  private clearing = false;
  private paused = false;
  private gameEnded = false;

  private spawnEvent?: Phaser.Time.TimerEvent;
  private pauseLayer?: Phaser.GameObjects.Container;

  private powers!: Record<PowerId, PowerState>;

  constructor() {
    super(Scenes.Game);
  }

  create(): void {
    this.resetState();
    const lvl = levelAt(this.levelIndex);

    this.bg = new Parallax(this, lvl.timeOfDay);
    this.ducks = this.add.group();
    this.dog = new Dog(this);

    this.add.image(0, 0, "vignette").setOrigin(0).setDepth(90).setScrollFactor(0);

    this.crosshair = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, "crosshair").setDepth(100);
    this.input.setDefaultCursor("none");

    this.scene.launch(Scenes.Hud);

    this.input.on("pointermove", (p: Phaser.Input.Pointer) => this.crosshair.setPosition(p.x, p.y));
    this.input.on("pointerdown", (p: Phaser.Input.Pointer) => this.shoot(p));

    const kb = this.input.keyboard!;
    kb.on("keydown-R", () => this.reload());
    kb.on("keydown-P", () => this.togglePause());
    kb.on("keydown-ESC", () => this.togglePause());
    kb.on("keydown-ONE", () => this.activatePower(Power.Double));
    kb.on("keydown-TWO", () => this.activatePower(Power.Freeze));
    kb.on("keydown-THREE", () => this.activatePower(Power.Clear));

    this.events.on(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);

    this.dog.sniffAcross(-40, GAME_WIDTH * 0.4, 1400);
    this.time.delayedCall(400, () => this.announce(`NIVEL ${lvl.index}`, lvl.name));
    this.time.delayedCall(1500, () => this.beginWave());

    this.cameras.main.fadeIn(300, 0, 0, 0);
    this.syncHud();

    if (import.meta.env.DEV) {
      (window as unknown as { __dh: unknown }).__dh = {
        ducks: () => this.aliveDucks().map((d) => ({ x: d.x, y: d.y })),
        state: () => ({ score: this.score, lives: this.lives, level: this.levelIndex }),
        addScore: (n: number) => {
          this.score += n;
          this.maybeAdvanceLevel();
        },
        end: (win = false) => this.endGame(win),
      };
    }
  }

  private resetState(): void {
    this.score = 0;
    this.lives = Rules.startingLives;
    this.levelIndex = 1;
    this.magazine = LEVELS[0].magazine;
    this.ammo = this.magazine;
    this.combo = 0;
    this.multiplier = 1;
    this.reloading = false;
    this.clearing = false;
    this.paused = false;
    this.gameEnded = false;
    const mk = (): PowerState => ({ unlocked: false, active: false, activeUntil: 0, cooldownUntil: 0 });
    this.powers = {
      [Power.Double]: mk(),
      [Power.Freeze]: mk(),
      [Power.Clear]: mk(),
    };
  }

  // ── wave / spawning ──────────────────────────────────────────────

  private beginWave(): void {
    if (this.gameEnded) return;
    const lvl = levelAt(this.levelIndex);
    unlockedPowers(this.levelIndex).forEach((p) => (this.powers[p].unlocked = true));
    this.spawnEvent?.remove();
    this.spawnEvent = this.time.addEvent({
      delay: lvl.spawnEveryMs,
      loop: true,
      callback: () => this.trySpawn(),
    });
    this.trySpawn();
    this.syncHud();
  }

  private trySpawn(): void {
    if (this.paused || this.clearing || this.gameEnded) return;
    const lvl = levelAt(this.levelIndex);
    const alive = this.aliveDucks().length;
    if (alive >= lvl.maxAlive) return;

    const speed = Phaser.Math.Between(lvl.speed[0], lvl.speed[1]);
    const duck = new Duck(this, speed);
    this.ducks.add(duck);

    if (this.powers[Power.Freeze].active) duck.setSpeedMul(0.15);

    duck.once("escaped", () => this.onDuckEscaped(duck));
    duck.once("bagged", () => this.onDuckBagged(duck));

    // spawn puff from the grass
    const puff = this.add.image(duck.x, GROUND_Y + 2, "puff").setDepth(18);
    this.tweens.add({ targets: puff, scale: 1.4, alpha: 0, duration: 260, onComplete: () => puff.destroy() });
  }

  private aliveDucks(): Duck[] {
    return (this.ducks.getChildren() as Duck[]).filter((d) => d.state === "alive");
  }

  // ── shooting ─────────────────────────────────────────────────────

  private shoot(p: Phaser.Input.Pointer): void {
    Audio.unlock();
    if (this.paused || this.gameEnded) return;

    this.tweens.add({ targets: this.crosshair, scale: { from: 0.8, to: 1 }, duration: 140, ease: "back.out" });

    if (this.reloading) {
      Audio.dryFire();
      return;
    }
    if (this.ammo <= 0) {
      Audio.dryFire();
      this.reload();
      return;
    }

    this.ammo--;
    Audio.shoot();
    this.muzzleFlash(p.x, p.y);
    this.cameras.main.shake(90, 0.004);

    const target = this.aliveDucks()
      .filter((d) => d.getBounds().contains(p.x, p.y))
      .sort((a, b) => b.bornAt - a.bornAt)[0];

    if (target) this.bagDuck(target);
    else this.onMiss();

    if (this.ammo <= 0) this.reload();
    this.syncHud();
  }

  private bagDuck(duck: Duck): void {
    duck.hit();
    this.combo++;
    this.multiplier = Phaser.Math.Clamp(1 + Math.floor((this.combo - 1) / 2), 1, Rules.maxComboMultiplier);

    const speedBonus = 1 + Phaser.Math.Clamp((duck.speed - 90) / 260, 0, 1.2);
    const doubleMul = this.powers[Power.Double].active ? 2 : 1;
    const gained = Math.round(Rules.duckBasePoints * speedBonus * this.multiplier * doubleMul);
    this.score += gained;

    Audio.hit(this.multiplier);
    this.hitstop();
    this.featherBurst(duck.x, duck.y);
    this.shockwave(duck.x, duck.y);
    this.scorePopup(duck.x, duck.y, gained, this.multiplier * doubleMul);

    if (this.multiplier >= 2) this.game.events.emit("dh:combo", this.multiplier * doubleMul);
    this.maybeAdvanceLevel();
  }

  private onMiss(): void {
    this.combo = 0;
    this.multiplier = 1;
    this.tweens.add({
      targets: this.crosshair,
      angle: { from: -12, to: 0 },
      duration: 180,
      ease: "quad.out",
    });
    this.crosshair.setTint(0xff5555);
    this.time.delayedCall(120, () => this.crosshair.clearTint());
  }

  private reload(): void {
    if (this.reloading || this.ammo >= this.magazine || this.gameEnded) return;
    this.reloading = true;
    Audio.reload();
    this.syncHud();
    this.time.delayedCall(Rules.reloadMs, () => {
      this.reloading = false;
      this.ammo = this.magazine;
      this.syncHud();
    });
  }

  // ── duck outcomes ────────────────────────────────────────────────

  private onDuckBagged(duck: Duck): void {
    Audio.coin();
    this.dog.retrieve(duck.x);
    this.time.delayedCall(60, () => duck.destroy());
    this.refillMagazine();
  }

  private onDuckEscaped(duck: Duck): void {
    duck.destroy();
    if (this.clearing || this.gameEnded) return;

    this.combo = 0;
    this.multiplier = 1;
    this.lives--;
    Audio.dogLaugh();
    this.dog.laugh(Phaser.Math.Between(200, GAME_WIDTH - 200));
    this.cameras.main.shake(220, 0.008);
    this.flash(C.blood, 0.35);
    this.refillMagazine();
    this.syncHud();

    if (this.lives <= 0) this.endGame(false);
  }

  private refillMagazine(): void {
    if (this.reloading) return;
    this.ammo = this.magazine;
    this.syncHud();
  }

  // ── level flow ───────────────────────────────────────────────────

  private maybeAdvanceLevel(): void {
    if (this.clearing || this.gameEnded) return;
    const lvl = levelAt(this.levelIndex);
    if (this.score < lvl.targetScore) return;

    this.clearing = true;
    this.spawnEvent?.remove();
    this.aliveDucks().forEach((d) => d.panic());

    this.time.delayedCall(1300, () => {
      if (this.gameEnded) return;
      this.aliveDucks().forEach((d) => d.destroy());

      if (this.levelIndex >= LAST_LEVEL) {
        this.endGame(true);
        return;
      }

      this.levelIndex++;
      const next = levelAt(this.levelIndex);
      this.lives = Math.min(Rules.startingLives + 1, this.lives + 1);
      this.magazine = next.magazine;
      this.ammo = this.magazine;
      this.combo = 0;
      this.multiplier = 1;

      this.bg.destroy();
      this.bg = new Parallax(this, next.timeOfDay);

      Audio.levelUp();
      this.announce(`NIVEL ${next.index}`, next.name);
      this.flash(C.gold, 0.4);

      this.time.delayedCall(1200, () => {
        this.clearing = false;
        this.beginWave();
      });
      this.syncHud();
    });
  }

  // ── power-ups ────────────────────────────────────────────────────

  private activatePower(id: PowerId): void {
    Audio.unlock();
    const st = this.powers[id];
    const cfg = PowerConfig[id];
    if (!st.unlocked || this.paused || this.gameEnded) return;
    if (st.active || this.time.now < st.cooldownUntil) {
      Audio.dryFire();
      return;
    }

    Audio.powerup();
    this.game.events.emit("dh:banner-mini", cfg.label.toUpperCase() + "!");

    if (id === Power.Clear) {
      st.cooldownUntil = this.time.now + cfg.cooldownMs;
      const targets = this.aliveDucks();
      this.cameras.main.shake(260, 0.01);
      this.flash(0xffffff, 0.6);
      targets.forEach((d, i) => {
        this.time.delayedCall(i * 70, () => {
          if (d.state === "alive") this.bagDuck(d);
        });
      });
      this.syncHud();
      return;
    }

    st.active = true;
    st.activeUntil = this.time.now + cfg.durationMs;

    if (id === Power.Freeze) {
      this.aliveDucks().forEach((d) => d.setSpeedMul(0.15));
    }
    this.syncHud();
  }

  private tickPowers(): void {
    const now = this.time.now;
    for (const id of Object.keys(this.powers) as PowerId[]) {
      const st = this.powers[id];
      if (st.active && now >= st.activeUntil) {
        st.active = false;
        st.cooldownUntil = now + PowerConfig[id].cooldownMs;
        if (id === Power.Freeze) this.aliveDucks().forEach((d) => d.setSpeedMul(1));
      }
    }
  }

  // ── pause / end ──────────────────────────────────────────────────

  private togglePause(): void {
    if (this.gameEnded) return;
    this.paused = !this.paused;

    if (this.paused) {
      this.time.paused = true;
      this.tweens.pauseAll();
      this.anims.pauseAll();
      const c = this.add.container(0, 0).setDepth(300);
      c.add(this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x0a0e24, 0.72).setOrigin(0));
      c.add(
        this.add
          .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 30, "PAUSA", { fontFamily: FONT_FAMILY, fontSize: "40px", color: css(C.gold) })
          .setOrigin(0.5),
      );
      c.add(
        this.add
          .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 30, "P / ESC  reanudar\nM  volver al menú", {
            fontFamily: FONT_FAMILY,
            fontSize: "11px",
            color: css(C.paper),
            align: "center",
            lineSpacing: 8,
          })
          .setOrigin(0.5),
      );
      this.pauseLayer = c;
      this.input.keyboard!.once("keydown-M", () => {
        this.scene.stop(Scenes.Hud);
        this.scene.start(Scenes.Menu);
      });
    } else {
      this.time.paused = false;
      this.tweens.resumeAll();
      this.anims.resumeAll();
      this.pauseLayer?.destroy();
      this.pauseLayer = undefined;
    }
  }

  private endGame(win: boolean): void {
    if (this.gameEnded) return;
    this.gameEnded = true;
    this.spawnEvent?.remove();
    this.aliveDucks().forEach((d) => d.panic());
    this.input.setDefaultCursor("default");

    const user = currentUser();
    if (user) {
      recordResult(user.name, this.score, this.levelIndex);
      recordRun({ name: user.name, score: this.score, level: this.levelIndex, date: Date.now() });
    }

    if (win) Audio.levelUp();
    else Audio.gameOver();
    this.cameras.main.fadeOut(500, 0, 0, 0);
    this.time.delayedCall(560, () => {
      this.scene.stop(Scenes.Hud);
      this.scene.start(Scenes.GameOver, { score: this.score, level: this.levelIndex, win });
    });
  }

  private cleanup(): void {
    this.input.setDefaultCursor("default");
    this.spawnEvent?.remove();
    this.bg?.destroy();
  }

  // ── juice helpers ────────────────────────────────────────────────

  private muzzleFlash(x: number, y: number): void {
    const m = this.add.image(x, y, "muzzle").setDepth(99).setScale(0.4).setAngle(Phaser.Math.Between(0, 360));
    this.tweens.add({ targets: m, scale: 1.1, alpha: 0, duration: 130, onComplete: () => m.destroy() });
  }

  private featherBurst(x: number, y: number): void {
    for (let i = 0; i < 10; i++) {
      const f = this.add.image(x, y, "feather").setDepth(40).setScale(Phaser.Math.FloatBetween(0.7, 1.4));
      const ang = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const dist = Phaser.Math.Between(30, 90);
      this.tweens.add({
        targets: f,
        x: x + Math.cos(ang) * dist,
        y: y + Math.sin(ang) * dist + 40,
        angle: Phaser.Math.Between(-260, 260),
        alpha: 0,
        duration: Phaser.Math.Between(500, 900),
        ease: "quad.out",
        onComplete: () => f.destroy(),
      });
    }
  }

  private shockwave(x: number, y: number): void {
    const r = this.add.image(x, y, "ring").setDepth(38).setScale(0.2);
    this.tweens.add({ targets: r, scale: 1.4, alpha: 0, duration: 260, onComplete: () => r.destroy() });
  }

  private scorePopup(x: number, y: number, amount: number, mul: number): void {
    const label = mul > 1 ? `+${amount}  x${mul}` : `+${amount}`;
    const t = this.add
      .text(x, y - 10, label, {
        fontFamily: FONT_FAMILY,
        fontSize: mul >= 4 ? "18px" : "13px",
        color: css(mul > 1 ? C.gold : C.paper),
        stroke: css(C.ink),
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(60);
    this.tweens.add({
      targets: t,
      y: y - 60,
      alpha: 0,
      scale: { from: 1.2, to: 1 },
      duration: 780,
      ease: "quad.out",
      onComplete: () => t.destroy(),
    });
  }

  private hitstop(): void {
    this.time.timeScale = 0.35;
    this.tweens.timeScale = 0.35;
    this.time.delayedCall(Rules.hitstopMs, () => {
      this.time.timeScale = 1;
      this.tweens.timeScale = 1;
    });
  }

  private flash(color: number, alpha: number): void {
    const r = this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, color, alpha).setOrigin(0).setDepth(95);
    this.tweens.add({ targets: r, alpha: 0, duration: 260, onComplete: () => r.destroy() });
  }

  private announce(big: string, small: string): void {
    this.game.events.emit("dh:banner", { big, small });
  }

  // ── main loop ────────────────────────────────────────────────────

  private syncHud(): void {
    const lvl = levelAt(this.levelIndex);
    const prevTarget = this.levelIndex > 1 ? levelAt(this.levelIndex - 1).targetScore : 0;
    const powers = {} as HudSnapshot["powers"];
    for (const id of Object.keys(this.powers) as PowerId[]) {
      powers[id] = { ...this.powers[id], ...PowerConfig[id] };
    }
    const snap: HudSnapshot = {
      score: this.score,
      lives: this.lives,
      level: this.levelIndex,
      levelName: lvl.name,
      target: lvl.targetScore,
      prevTarget,
      ammo: this.ammo,
      magazine: this.magazine,
      reloading: this.reloading,
      multiplier: this.multiplier * (this.powers[Power.Double].active ? 2 : 1),
      combo: this.combo,
      powers,
      now: this.time.now,
    };
    this.registry.set("dh:hud", snap);
  }

  update(time: number, delta: number): void {
    if (this.paused || this.gameEnded) {
      this.bg?.update(time, delta);
      return;
    }
    this.bg.update(time, delta);
    this.tickPowers();

    (this.ducks.getChildren() as Duck[]).forEach((d) => {
      if (d.state === "done") return;
      d.tick(time, delta);
    });

    // keep the freeze slow-mo applied to ducks that spawned mid-effect
    if (this.powers[Power.Freeze].active) {
      this.aliveDucks().forEach((d) => d.setSpeedMul(0.15));
    }

    this.syncHud();
  }
}
