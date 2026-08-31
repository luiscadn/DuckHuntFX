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
import { Weather, pickWeather } from "../ui/Weather";
import { Audio } from "../audio/AudioBus";
import { Duck } from "../objects/Duck";
import { Croc } from "../objects/Croc";
import { Boss } from "../objects/Boss";
import { LAST_LEVEL, PowerConfig, isBossLevel, levelAt, unlockedPowers } from "../data/levels";
import { currentUser, recordResult } from "../data/accounts";
import { recordRun } from "../data/scores";
import { DUCK_KINDS, pickDuckKind, type DuckKind, type DuckKindId } from "../data/ducks";
import { RunTracker, lifetimeDucks } from "../data/achievements";
import { getSettings, mods, type DifficultyMods } from "../data/settings";
import { equippedCosmetic, themeAccent } from "../data/cosmetics";
import { bankDeposit } from "../data/bank";
import { recordRunStats, type RunSummary } from "../data/stats";
import { applyRunToMissions } from "../data/missions";
import { upgradeEffects } from "../data/upgrades";
import { WEAPONS, equippedWeapon, isWeaponUnlocked, type Weapon } from "../data/weapons";

export type GameMode = "campaign" | "timeattack" | "survival";
const TIMEATTACK_MS = 90000;

interface PowerState {
  unlocked: boolean;
  active: boolean;
  activeUntil: number;
  cooldownUntil: number;
}

export interface HudSnapshot {
  score: number;
  lives: number;
  maxLives: number;
  level: number;
  levelName: string;
  target: number;
  prevTarget: number;
  ammo: number;
  magazine: number;
  reloading: boolean;
  multiplier: number;
  combo: number;
  comboTimer: number;
  comboWindow: number;
  coins: number;
  weapon: string;
  boss: { hp: number; maxHp: number; name: string } | null;
  crocMeter: number;
  crocReady: boolean;
  frenzy: boolean;
  theme: number;
  mode: GameMode;
  timeLeftMs: number;
  powers: Record<PowerId, PowerState & { key: string; label: string; icon: string; durationMs: number; cooldownMs: number }>;
  now: number;
}

const WEATHER_LABEL: Record<string, string> = { rain: "LLUVIA", fog: "NIEBLA", wind: "VIENTO" };

export class GameScene extends Phaser.Scene {
  private bg!: Parallax;
  private weather!: Weather;
  private croc!: Croc;
  private crosshair!: Phaser.GameObjects.Image;
  private ducks!: Phaser.GameObjects.Group;
  private boss?: Boss;

  private gunView!: Phaser.GameObjects.Container;
  private gunImg!: Phaser.GameObjects.Image;
  private gunMuzzle!: Phaser.GameObjects.Image;
  private gunBaseX = 0;
  private gunBaseY = 0;
  private recoilTween?: Phaser.Tweens.Tween | Phaser.Tweens.TweenChain;

  private diff!: DifficultyMods;
  private weapon!: Weapon;

  private score = 0;
  private lives = 3;
  private maxLives = 3;
  private levelIndex = 1;
  private ammo = 3;
  private magazine = 3;
  private magBonus = 0;
  private reloadMul = 1;
  private aimPad = 0;
  private combo = 0;
  private multiplier = 1;
  private comboTimer = 0;

  private coins = 0;
  private coinsGranted = 0;

  private crocMeter = 0;
  private crocReady = false;
  private nextFrenzyAt = Rules.frenzyEvery;
  private frenzyUntil = 0;
  private infiniteAmmoUntil = 0;
  private bushCooldownUntil = 0;
  private cloudCooldownUntil = 0;
  private bushes: Phaser.GameObjects.Image[] = [];
  private clouds: Phaser.GameObjects.Image[] = [];

  private shotsFired = 0;
  private shotsHit = 0;
  private runBestCombo = 0;
  private runStart = 0;
  private runFrenzies = 0;
  private runRampages = 0;
  private runDecoysHit = 0;
  private runPinatas = 0;
  private runByKind: Partial<Record<DuckKindId, number>> = {};

  private mode: GameMode = "campaign";
  private endless = false;
  private timeLeftMs = -1;
  private endlessRampAt = 0;

  private reloading = false;
  private clearing = false;
  private paused = false;
  private gameEnded = false;
  private bossFight = false;
  private lastShotAt = 0;

  private timeFactor = 1;
  private hitstopUntil = 0;
  private slowmo?: { ms: number; elapsed: number };

  private spawnEvent?: Phaser.Time.TimerEvent;
  private minionEvent?: Phaser.Time.TimerEvent;
  private pauseLayer?: Phaser.GameObjects.Container;
  private tracker!: RunTracker;
  private shakeOn = true;

  private powers!: Record<PowerId, PowerState>;

  constructor() {
    super(Scenes.Game);
  }

  init(data: { mode?: GameMode }): void {
    this.mode = data?.mode ?? "campaign";
  }

  create(): void {
    this.resetState();
    this.tracker = new RunTracker((def) => {
      Audio.achievement();
      this.game.events.emit("dh:achievement", def);
    });
    const lvl = levelAt(this.levelIndex);

    this.bg = new Parallax(this, lvl.timeOfDay);
    this.weather = new Weather(this, pickWeather(this.levelIndex));
    this.ducks = this.add.group();
    this.croc = new Croc(this);

    this.add.image(0, 0, "vignette").setOrigin(0).setDepth(90).setScrollFactor(0);
    const xhKey = `xh-${equippedCosmetic("crosshair")}`;
    this.crosshair = this.add
      .image(GAME_WIDTH / 2, GAME_HEIGHT / 2, this.textures.exists(xhKey) ? xhKey : "crosshair")
      .setDepth(100);
    this.input.setDefaultCursor("none");

    this.buildInteractiveScenery();
    this.buildGunView();

    this.scene.launch(Scenes.Hud);
    Audio.setBossMode(false);
    Audio.setIntensity(0);

    this.input.on("pointermove", (p: Phaser.Input.Pointer) => this.crosshair.setPosition(p.x, p.y));
    this.input.on("pointerdown", (p: Phaser.Input.Pointer) => this.shoot(p));

    const kb = this.input.keyboard!;
    kb.on("keydown-R", () => this.reload());
    kb.on("keydown-P", () => this.togglePause());
    kb.on("keydown-ESC", () => this.togglePause());
    kb.on("keydown-ONE", () => this.activatePower(Power.Double));
    kb.on("keydown-TWO", () => this.activatePower(Power.Freeze));
    kb.on("keydown-THREE", () => this.activatePower(Power.Clear));
    kb.on("keydown-Q", () => this.releaseCroc());

    // on-screen touch controls (HudScene) route through the game bus
    const ev = this.game.events;
    ev.on("dh:ctrl-reload", this.reload, this);
    ev.on("dh:ctrl-pause", this.togglePause, this);
    ev.on("dh:ctrl-power", this.activatePower, this);
    ev.on("dh:ctrl-croc", this.releaseCroc, this);

    this.events.on(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);

    this.croc.sniffAcross(-40, GAME_WIDTH * 0.4, 1400);
    this.time.delayedCall(400, () => {
      this.announce(`NIVEL ${lvl.index}`, lvl.name);
      if (this.weather.kind !== "clear") {
        this.time.delayedCall(700, () => this.game.events.emit("dh:banner-mini", WEATHER_LABEL[this.weather.kind]));
      }
    });
    this.time.delayedCall(1500, () => this.beginWave());

    this.cameras.main.fadeIn(300, 0, 0, 0);
    this.syncHud();

    if (import.meta.env.DEV) {
      (window as unknown as { __dh: unknown }).__dh = {
        ducks: () => this.aliveDucks().map((d) => ({ x: d.x, y: d.y, kind: d.kind.id })),
        state: () => ({
          score: this.score,
          lives: this.lives,
          level: this.levelIndex,
          combo: this.combo,
          coins: this.coins,
          weather: this.weather.kind,
          boss: this.boss ? this.boss.hp : null,
        }),
        addScore: (n: number) => {
          this.addScore(n);
          this.maybeAdvanceLevel();
        },
        addCoins: (n: number) => (this.coins += n),
        spawn: (id: DuckKindId) => {
          const d = new Duck(this, 120, DUCK_KINDS[id] ?? DUCK_KINDS.normal);
          this.ducks.add(d);
          d.once("escaped", () => this.onDuckEscaped(d));
          d.once("bagged", () => this.onDuckBagged(d));
        },
        bagAll: () => this.aliveDucks().forEach((d) => this.bagDuck(d)),
        hurtBoss: (n = 5) => this.boss?.hit(n),
        croc: (grin = false) => (grin ? this.croc.laugh(480) : this.croc.retrieve(480)),
        frenzy: () => this.triggerFrenzy(),
        fillCroc: () => {
          this.crocMeter = 100;
          this.crocReady = true;
        },
        end: (win = false) => this.endGame(win),
      };
    }
  }

  private resetState(): void {
    this.diff = mods();
    this.shakeOn = getSettings().shake;

    this.weapon = equippedWeapon();
    if (!isWeaponUnlocked(this.weapon.id, lifetimeDucks())) this.weapon = WEAPONS.pistol;

    const up = upgradeEffects();
    this.endless = this.mode !== "campaign";
    this.timeLeftMs = this.mode === "timeattack" ? TIMEATTACK_MS : -1;
    this.endlessRampAt = 0;
    this.score = 0;
    this.maxLives =
      this.mode === "survival"
        ? 1
        : Math.max(1, Rules.startingLives + this.diff.livesBonus + up.extraLives);
    this.lives = this.maxLives;
    this.levelIndex = 1;
    this.magBonus = up.magBonus;
    this.reloadMul = up.reloadMul;
    this.aimPad = up.aimPad;
    this.magazine = this.currentMagazine();
    this.ammo = this.magazine;
    this.combo = 0;
    this.multiplier = 1;
    this.comboTimer = 0;
    this.coins = 0;
    this.coinsGranted = 0;
    this.crocMeter = 0;
    this.crocReady = false;
    this.nextFrenzyAt = Rules.frenzyEvery;
    this.frenzyUntil = 0;
    this.infiniteAmmoUntil = 0;
    this.bushCooldownUntil = 0;
    this.cloudCooldownUntil = 0;
    this.shotsFired = 0;
    this.shotsHit = 0;
    this.runBestCombo = 0;
    this.runStart = this.time.now;
    this.runFrenzies = 0;
    this.runRampages = 0;
    this.runDecoysHit = 0;
    this.runPinatas = 0;
    this.runByKind = {};
    this.reloading = false;
    this.clearing = false;
    this.paused = false;
    this.gameEnded = false;
    this.bossFight = false;
    this.lastShotAt = 0;
    this.timeFactor = 1;
    this.hitstopUntil = 0;
    this.slowmo = undefined;
    this.boss = undefined;
    const mk = (): PowerState => ({ unlocked: false, active: false, activeUntil: 0, cooldownUntil: 0 });
    this.powers = { [Power.Double]: mk(), [Power.Freeze]: mk(), [Power.Clear]: mk() };
  }

  private currentMagazine(): number {
    return this.weapon.magazine + this.magBonus;
  }

  // ── waves / spawning ─────────────────────────────────────────────

  private beginWave(): void {
    if (this.gameEnded) return;
    const lvl = levelAt(this.levelIndex);
    unlockedPowers(this.levelIndex).forEach((p) => (this.powers[p].unlocked = true));
    Audio.setIntensity(Phaser.Math.Clamp(this.levelIndex - 1, 0, 2));
    this.spawnEvent?.remove();
    this.spawnEvent = this.time.addEvent({
      delay: lvl.spawnEveryMs * this.diff.spawnMul,
      loop: true,
      callback: () => this.trySpawn(),
    });
    this.trySpawn();
    if (this.endless) this.endlessRampAt = this.time.now + 22000;
    this.syncHud();
  }

  /** time-attack / survival: keep ramping difficulty without a level-clear ceremony */
  private endlessRamp(): void {
    this.endlessRampAt = this.time.now + 22000;
    if (this.levelIndex >= LAST_LEVEL) return;
    this.levelIndex++;
    while (isBossLevel(this.levelIndex) && this.levelIndex < LAST_LEVEL) this.levelIndex++;
    const lvl = levelAt(this.levelIndex);
    unlockedPowers(this.levelIndex).forEach((p) => (this.powers[p].unlocked = true));
    this.spawnEvent?.remove();
    this.spawnEvent = this.time.addEvent({
      delay: lvl.spawnEveryMs * this.diff.spawnMul,
      loop: true,
      callback: () => this.trySpawn(),
    });
    this.game.events.emit("dh:banner-mini", `OLEADA ${this.levelIndex}`);
  }

  private trySpawn(): void {
    if (this.paused || this.clearing || this.gameEnded) return;
    const lvl = levelAt(this.levelIndex);
    if (this.aliveDucks().length >= lvl.maxAlive + this.diff.maxAliveBonus) return;
    this.spawnDuck(pickDuckKind(this.levelIndex), Phaser.Math.Between(lvl.speed[0], lvl.speed[1]));
  }

  private spawnDuck(kind: DuckKind = DUCK_KINDS.normal, rawSpeed = 130, atX?: number): Duck {
    const duck = new Duck(this, rawSpeed * this.diff.speedMul, kind);
    if (atX !== undefined && !kind.isDecoy) {
      duck.x = Phaser.Math.Clamp(atX, 60, GAME_WIDTH - 60);
      duck.y = GROUND_Y - 10;
    }
    this.ducks.add(duck);
    if (this.powers[Power.Freeze].active && !kind.isDecoy) duck.setSpeedMul(0.15);
    duck.once("escaped", () => this.onDuckEscaped(duck));
    duck.once("bagged", () => this.onDuckBagged(duck));

    if (kind.id === "golden") {
      Audio.golden();
      this.game.events.emit("dh:banner-mini", "¡PATO DORADO!");
    } else if (kind.id === "bomb") {
      this.game.events.emit("dh:banner-mini", "¡BOMBA!");
    } else if (kind.id === "pinata") {
      this.game.events.emit("dh:banner-mini", "¡PIÑATA!");
    } else if (kind.id === "fox") {
      this.game.events.emit("dh:banner-mini", "¡ZORRO!");
    } else if (kind.id === "bear") {
      this.game.events.emit("dh:banner-mini", "¡OSO!");
    }

    if (!kind.isDecoy && !kind.isGround) {
      const puff = this.add.image(duck.x, GROUND_Y + 2, "puff").setDepth(18);
      this.tweens.add({ targets: puff, scale: 1.4, alpha: 0, duration: 260, onComplete: () => puff.destroy() });
    }
    return duck;
  }

  /** first-person view of the equipped weapon, bottom-right, barrel toward the action */
  private buildGunView(): void {
    this.gunBaseX = GAME_WIDTH - 118;
    this.gunBaseY = GAME_HEIGHT + 24;
    const key = `gun-${this.weapon.id}`;
    this.gunImg = this.add
      .image(0, 0, this.textures.exists(key) ? key : "gun-pistol")
      .setOrigin(0.5, 1)
      .setAngle(-14)
      .setScale(0.86);
    this.gunMuzzle = this.add.image(-86, -122, "muzzle").setScale(0.35).setVisible(false);
    this.gunView = this.add
      .container(this.gunBaseX, this.gunBaseY, [this.gunImg, this.gunMuzzle])
      .setDepth(97)
      .setAlpha(0.97);
  }

  private gunRecoil(): void {
    this.recoilTween?.stop();
    this.gunImg.setAngle(-14).setPosition(0, 0);
    this.gunMuzzle.setVisible(true).setScale(0.3).setAlpha(1);
    this.tweens.add({ targets: this.gunMuzzle, scale: 0.9, alpha: 0, duration: 120 });
    this.recoilTween = this.tweens.chain({
      targets: this.gunImg,
      tweens: [
        { x: 10, y: -20, angle: -30, duration: 45, ease: "quad.out" },
        { x: 0, y: 0, angle: -14, duration: 170, ease: "quad.out" },
      ],
    });
  }

  private gunReloadPose(down: boolean): void {
    this.recoilTween?.stop();
    this.tweens.add({
      targets: this.gunImg,
      y: down ? 34 : 0,
      angle: down ? 10 : -14,
      duration: 220,
      ease: "quad.out",
    });
  }

  private buildInteractiveScenery(): void {
    this.bushes = [];
    this.clouds = [];
    for (let i = 0; i < 3; i++) {
      const b = this.add
        .image(GAME_WIDTH * (0.2 + i * 0.3) + Phaser.Math.Between(-30, 30), GROUND_Y + 10, "bush")
        .setOrigin(0.5, 1)
        .setDepth(17)
        .setScale(0.9);
      this.bushes.push(b);
    }
    for (let i = 0; i < 2; i++) {
      const c = this.add
        .image(GAME_WIDTH * (0.3 + i * 0.4), Phaser.Math.Between(80, 150), "cloud0")
        .setDepth(-40)
        .setScale(1.1)
        .setAlpha(0.9);
      this.clouds.push(c);
    }
  }

  private aliveDucks(): Duck[] {
    return (this.ducks.getChildren() as Duck[]).filter((d) => d.state === "alive");
  }

  // ── shooting ─────────────────────────────────────────────────────

  private shoot(p: Phaser.Input.Pointer): void {
    Audio.unlock();
    if (this.paused || this.gameEnded) return;
    // ignore the tap that pressed an on-screen HUD button
    const uiTapAt = (this.registry.get("dh:uiTapAt") as number | undefined) ?? 0;
    if (this.game.loop.now - uiTapAt < 120) return;
    if (this.time.now - this.lastShotAt < this.weapon.fireCooldownMs) return;

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

    this.lastShotAt = this.time.now;
    const infinite = this.time.now < this.infiniteAmmoUntil;
    if (!infinite) this.ammo--;
    this.shotsFired++;
    this.fireSound();
    this.muzzleFlash(p.x, p.y);
    this.gunRecoil();
    this.doShake(90, this.weapon.shake);

    const wob = this.weapon.wobble;
    const ax = p.x + (wob ? Phaser.Math.Between(-wob, wob) : 0);
    const ay = p.y + (wob ? Phaser.Math.Between(-wob, wob) : 0);

    // shooting the crocodile — bad idea
    if (this.croc.visible && this.inflatedBounds(this.croc).contains(ax, ay)) {
      this.shootCroc();
      this.syncHud();
      return;
    }

    const resolved = this.weapon.pellets > 1 ? this.fireSpread(ax, ay) : this.fireSingle(ax, ay);
    if (!resolved) {
      this.onMiss();
      this.tracker.missedShot();
      this.checkScenery(ax, ay);
    }

    if (!infinite) {
      if (this.ammo === 0) this.tracker.ranDry();
      if (this.ammo <= 0) this.reload();
    }
    this.syncHud();
  }

  private fireSound(): void {
    switch (this.weapon.id) {
      case "shotgun": Audio.shotgunBlast(); break;
      case "rifle": Audio.rifleShot(); break;
      case "smg": Audio.smgShot(); break;
      default: Audio.shoot();
    }
  }

  private inflatedBounds(d: Phaser.GameObjects.Sprite): Phaser.Geom.Rectangle {
    const b = d.getBounds();
    if (this.aimPad) {
      b.x -= this.aimPad;
      b.y -= this.aimPad;
      b.width += this.aimPad * 2;
      b.height += this.aimPad * 2;
    }
    return b;
  }

  /** Returns true if the shot resolved on a real target / special; false = clean miss. */
  private fireSingle(x: number, y: number): boolean {
    if (this.boss?.alive && this.inflatedBounds(this.boss).contains(x, y)) {
      this.hitBoss(this.weapon.heavy ? 3 : 1, x, y);
      return true;
    }
    const target = this.aliveDucks()
      .filter((d) => this.inflatedBounds(d).contains(x, y))
      .sort((a, b) => b.bornAt - a.bornAt)[0];
    if (!target) return false;

    if (target.kind.isDecoy) {
      this.shootDecoy(target);
      return true;
    }
    this.shotsHit++;
    if (this.weapon.heavy) {
      target.bag();
      this.bagDuck(target, true);
    } else {
      const killed = target.hit();
      if (killed) this.bagDuck(target);
      else this.woundDuck(target);
    }
    return true;
  }

  private fireSpread(cx: number, cy: number): boolean {
    const rings = [0, 26, 52];
    const points: Array<[number, number]> = [[cx, cy]];
    for (let i = 1; i < this.weapon.pellets; i++) {
      const a = (i / (this.weapon.pellets - 1)) * Math.PI * 2;
      const r = rings[i % rings.length] || 40;
      points.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
    }

    let resolved = false;
    if (this.boss?.alive && points.some(([x, y]) => this.inflatedBounds(this.boss!).contains(x, y))) {
      this.hitBoss(2, cx, cy);
      resolved = true;
    }

    const hit = new Set<Duck>();
    for (const [x, y] of points) {
      for (const d of this.aliveDucks()) {
        if (!hit.has(d) && this.inflatedBounds(d).contains(x, y)) hit.add(d);
      }
    }
    for (const d of hit) {
      if (d.kind.isDecoy) {
        this.shootDecoy(d);
        return true;
      }
    }
    if (hit.size === 0) return resolved;

    this.shotsHit++;
    let i = 0;
    for (const d of hit) {
      this.time.delayedCall(i++ * 45, () => {
        if (d.state !== "alive") return;
        const killed = d.hit();
        if (killed) this.bagDuck(d);
        else this.woundDuck(d);
      });
    }
    return true;
  }

  private bagDuck(duck: Duck, heavy = false): void {
    const kind = duck.kind;
    if (kind.isDecoy) return; // never counts, safety for AOE paths
    duck.bag();

    this.runByKind[kind.id] = (this.runByKind[kind.id] ?? 0) + 1;
    this.combo++;
    this.runBestCombo = Math.max(this.runBestCombo, this.combo);
    this.multiplier = Phaser.Math.Clamp(1 + Math.floor((this.combo - 1) / 2), 1, Rules.maxComboMultiplier);
    this.comboTimer = this.comboWindow();

    // fill the crocodile ultimate meter
    if (!this.crocReady) {
      this.crocMeter = Math.min(100, this.crocMeter + Rules.crocMeterPerBag);
      if (this.crocMeter >= 100) {
        this.crocReady = true;
        Audio.powerup();
        this.game.events.emit("dh:banner-mini", "COCODRILO LISTO · Q");
      }
    }

    const speedBonus = 1 + Phaser.Math.Clamp((duck.speed - 90) / 260, 0, 1.2);
    const doubleMul = this.powers[Power.Double].active ? 2 : 1;
    const heavyMul = heavy ? 1.5 : 1;
    const gained = Math.round(
      Rules.duckBasePoints * speedBonus * this.multiplier * doubleMul * kind.pointsMul * heavyMul * this.diff.scoreMul,
    );
    this.addScore(gained);
    this.tracker.bag(kind.id, this.combo, this.score);

    Audio.hit(this.multiplier);
    if (kind.slowmoOnBag) this.startSlowmo(1400);
    else this.hitstop();
    this.featherBurst(duck.x, duck.y);
    this.shockwave(duck.x, duck.y);
    this.scorePopup(duck.x, duck.y, gained, this.multiplier * doubleMul);

    if (kind.explodeOnBag) this.bombExplode(duck);
    if (kind.id === "golden") this.flash(C.gold, 0.4);
    if (kind.dropsLoot) {
      this.runPinatas++;
      this.dropLoot(duck.x, duck.y);
    }
    if (this.multiplier >= 2) this.game.events.emit("dh:combo", this.multiplier * doubleMul);

    if (this.combo >= this.nextFrenzyAt) {
      this.nextFrenzyAt += Rules.frenzyEvery;
      this.triggerFrenzy();
    }

    this.maybeAdvanceLevel();
  }

  // ── decoy / crocodile / scenery ──────────────────────────────────

  private shootDecoy(d: Duck): void {
    this.runDecoysHit++;
    this.combo = 0;
    this.multiplier = 1;
    this.comboTimer = 0;
    this.nextFrenzyAt = Rules.frenzyEvery;
    this.addScore(-Math.min(this.score, Rules.decoyPenalty));
    this.tracker.missedShot();
    Audio.wrong();
    this.flash(C.blood, 0.32);
    this.doShake(120, 0.006);
    this.game.events.emit("dh:banner-mini", "¡SEÑUELO! -" + Rules.decoyPenalty);
    this.croc.laugh(Phaser.Math.Between(200, GAME_WIDTH - 200));
    const puff = this.add.image(d.x, d.y, "puff").setDepth(30);
    this.tweens.add({ targets: puff, scale: 2, alpha: 0, duration: 260, onComplete: () => puff.destroy() });
    d.destroy();
    this.syncHud();
  }

  private shootCroc(): void {
    this.croc.anger(7000);
    this.combo = 0;
    this.multiplier = 1;
    this.comboTimer = 0;
    this.nextFrenzyAt = Rules.frenzyEvery;
    this.crocMeter = 0;
    this.crocReady = false;
    this.addScore(-Math.min(this.score, 100));
    this.tracker.missedShot();
    Audio.taunt();
    this.doShake(160, 0.008);
    this.game.events.emit("dh:banner-mini", "¡NO LE DISPARES AL COCODRILO!");
  }

  private checkScenery(x: number, y: number): void {
    const now = this.time.now;
    const bush = this.bushes.find((b) => b.getBounds().contains(x, y));
    if (bush && now >= this.bushCooldownUntil) {
      this.bushCooldownUntil = now + 4500;
      this.tweens.add({ targets: bush, angle: { from: -6, to: 0 }, duration: 260, ease: "quad.out" });
      const leaves = this.add.image(bush.x, bush.y - 20, "feather").setTint(C.foliage).setDepth(30);
      this.tweens.add({ targets: leaves, y: leaves.y - 24, alpha: 0, duration: 400, onComplete: () => leaves.destroy() });
      if (Math.random() < 0.6 && !this.clearing && !this.gameEnded) {
        const kind = Math.random() < 0.35 ? DUCK_KINDS.fast : DUCK_KINDS.normal;
        this.spawnDuck(kind, 190, bush.x);
        this.game.events.emit("dh:banner-mini", "¡PATO ESCONDIDO!");
      }
      return;
    }
    const cloud = this.clouds.find((c) => c.getBounds().contains(x, y));
    if (cloud && now >= this.cloudCooldownUntil) {
      this.cloudCooldownUntil = now + 6000;
      this.tweens.add({ targets: cloud, scaleY: 0.7, yoyo: true, duration: 160 });
      if (this.weather.kind === "clear") {
        this.weather.destroy();
        this.weather = new Weather(this, "rain");
        this.game.events.emit("dh:banner-mini", "¡LLUVIA!");
      } else {
        const n = Phaser.Math.Between(2, 4);
        this.coins += n;
        for (let i = 0; i < n; i++) this.coinFly(cloud.x + Phaser.Math.Between(-20, 20), cloud.y);
        Audio.loot();
      }
    }
  }

  private dropLoot(x: number, y: number): void {
    const n = Phaser.Math.Between(3, 7);
    this.coins += n;
    Audio.loot();
    this.scorePopup(x, y - 16, n, 1);
    for (let i = 0; i < n; i++) this.coinFly(x + Phaser.Math.Between(-24, 24), y + Phaser.Math.Between(-12, 12));
    // confetti
    for (let i = 0; i < 8; i++) {
      const s = this.add.image(x, y, "star").setDepth(41).setScale(Phaser.Math.FloatBetween(0.5, 1.1)).setTint(Phaser.Display.Color.RandomRGB().color);
      const a = Math.random() * Math.PI * 2;
      this.tweens.add({
        targets: s,
        x: x + Math.cos(a) * Phaser.Math.Between(40, 90),
        y: y + Math.sin(a) * Phaser.Math.Between(40, 90) + 30,
        alpha: 0,
        angle: Phaser.Math.Between(-200, 200),
        duration: Phaser.Math.Between(500, 800),
        onComplete: () => s.destroy(),
      });
    }
    if (Math.random() < 0.28) {
      const locked = (Object.keys(this.powers) as PowerId[]).filter(
        (p) => this.powers[p].unlocked && this.time.now < this.powers[p].cooldownUntil,
      );
      if (locked.length) {
        this.powers[locked[Phaser.Math.Between(0, locked.length - 1)]].cooldownUntil = 0;
        this.game.events.emit("dh:banner-mini", "¡PODER RECARGADO!");
      }
    }
  }

  private coinFly(x: number, y: number): void {
    const c = this.add.image(x, y, "coin").setDepth(60).setScale(1.1);
    this.tweens.add({
      targets: c,
      x: 60,
      y: GAME_HEIGHT - 20,
      scale: 0.5,
      duration: Phaser.Math.Between(420, 700),
      ease: "quad.in",
      delay: Phaser.Math.Between(0, 160),
      onComplete: () => c.destroy(),
    });
  }

  private triggerFrenzy(): void {
    this.runFrenzies++;
    this.frenzyUntil = this.time.now + Rules.frenzyMs;
    Audio.frenzy();
    this.flash(C.gold, 0.5);
    this.doShake(220, 0.006);
    this.game.events.emit("dh:frenzy");

    const roll = Phaser.Math.Between(0, 2);
    if (roll === 0) {
      this.infiniteAmmoUntil = this.time.now + Rules.frenzyMs;
      this.ammo = this.magazine;
      this.reloading = false;
      this.game.events.emit("dh:banner", { big: "¡FRENESÍ!", small: "BALA INFINITA" });
    } else if (roll === 1) {
      this.startSlowmo(Rules.frenzyMs);
      this.game.events.emit("dh:banner", { big: "¡FRENESÍ!", small: "CÁMARA LENTA" });
    } else {
      this.game.events.emit("dh:banner", { big: "¡FRENESÍ!", small: "LLUVIA DE PATOS" });
      for (let i = 0; i < 5; i++) {
        this.time.delayedCall(i * 160, () => {
          if (!this.clearing && !this.gameEnded) {
            this.spawnDuck(Math.random() < 0.4 ? DUCK_KINDS.pinata : DUCK_KINDS.normal, 150);
          }
        });
      }
    }
    this.syncHud();
  }

  private releaseCroc(): void {
    Audio.unlock();
    if (!this.crocReady || this.paused || this.gameEnded || this.croc.isAngry()) {
      Audio.dryFire();
      return;
    }
    this.crocReady = false;
    this.crocMeter = 0;
    this.runRampages++;
    Audio.rampage();
    this.flash(0xffffff, 0.5);
    this.doShake(500, 0.014);
    this.game.events.emit("dh:banner", { big: "¡COCODRILO!", small: "arrasa el estanque" });
    this.croc.rampage(
      (cx) => this.crocSweepAt(cx),
      () => this.syncHud(),
    );
  }

  private crocSweepAt(cx: number): void {
    this.aliveDucks().forEach((d) => {
      if (d.kind.isDecoy) return;
      if (Math.abs(d.x - cx) < 130 && d.y > GROUND_Y - 220) this.bagDuck(d);
    });
    if (this.boss?.alive && Math.abs(this.boss.x - cx) < 170) this.boss.hit(0.6);
  }

  private woundDuck(duck: Duck): void {
    this.comboTimer = Math.max(this.comboTimer, this.comboWindow() * 0.6);
    Audio.clank();
    this.hitstop();
    this.shockwave(duck.x, duck.y);
    this.doShake(60, 0.003);
  }

  private hitBoss(dmg: number, x: number, y: number): void {
    if (!this.boss) return;
    this.shotsHit++;
    this.boss.hit(dmg);
    this.combo++;
    this.runBestCombo = Math.max(this.runBestCombo, this.combo);
    this.multiplier = Phaser.Math.Clamp(1 + Math.floor((this.combo - 1) / 2), 1, Rules.maxComboMultiplier);
    this.comboTimer = this.comboWindow();
    const gained = Math.round(45 * dmg * this.multiplier * this.diff.scoreMul);
    this.addScore(gained);
    Audio.hit(this.multiplier);
    this.hitstop();
    this.featherBurst(x, y);
    this.scorePopup(x, y, gained, this.multiplier);
  }

  private bombExplode(bomb: Duck): void {
    Audio.explode();
    this.flash(C.rust, 0.5);
    this.doShake(300, 0.012);
    const ring = this.add.image(bomb.x, bomb.y, "ring").setDepth(45).setScale(0.3).setTint(C.rust);
    this.tweens.add({ targets: ring, scale: 5.5, alpha: 0, duration: 420, onComplete: () => ring.destroy() });
    this.aliveDucks().forEach((d) => {
      if (d === bomb) return;
      if (Phaser.Math.Distance.Between(d.x, d.y, bomb.x, bomb.y) <= 155) {
        this.time.delayedCall(Phaser.Math.Between(20, 130), () => {
          if (d.state === "alive") this.bagDuck(d);
        });
      }
    });
  }

  private comboWindow(): number {
    return Math.max(
      Rules.comboWindowMinMs,
      (Rules.comboWindowMs - (this.multiplier - 1) * 400) * this.diff.comboWindowMul,
    );
  }

  private addScore(n: number): void {
    this.score += n;
    const want = Math.floor(this.score / 120);
    if (want > this.coinsGranted) {
      this.coins += want - this.coinsGranted;
      this.coinsGranted = want;
    }
  }

  private onMiss(): void {
    this.combo = 0;
    this.multiplier = 1;
    this.comboTimer = 0;
    this.nextFrenzyAt = Rules.frenzyEvery;
    this.tweens.add({ targets: this.crosshair, angle: { from: -12, to: 0 }, duration: 180, ease: "quad.out" });
    this.crosshair.setTint(0xff5555);
    this.time.delayedCall(120, () => this.crosshair.clearTint());
  }

  private reload(): void {
    if (this.reloading || this.ammo >= this.magazine || this.gameEnded) return;
    this.reloading = true;
    Audio.reload();
    this.gunReloadPose(true);
    this.syncHud();
    this.time.delayedCall(this.weapon.reloadMs * this.reloadMul, () => {
      this.reloading = false;
      this.ammo = this.magazine;
      this.gunReloadPose(false);
      this.syncHud();
    });
  }

  // ── duck outcomes ────────────────────────────────────────────────

  private onDuckBagged(duck: Duck): void {
    Audio.coin();
    if (!duck.kind.isGround) this.croc.retrieve(duck.x, () => Audio.chomp());
    this.time.delayedCall(60, () => duck.destroy());
    this.refillMagazine();
  }

  private onDuckEscaped(duck: Duck): void {
    const kind = duck.kind;
    duck.destroy();
    if (kind.isDecoy || this.clearing || this.gameEnded) return; // a decoy leaving is correct play

    this.combo = 0;
    this.multiplier = 1;
    this.comboTimer = 0;
    this.nextFrenzyAt = Rules.frenzyEvery;
    const penalty = this.mode === "timeattack" || !this.diff.escapeCostsLife ? 0 : kind.escapePenalty;
    this.lives -= penalty;
    if (penalty > 0) this.tracker.lostLife();

    if (kind.id === "bomb" && penalty > 0) {
      Audio.explode();
      this.flash(C.rust, 0.55);
      this.doShake(340, 0.015);
    } else {
      Audio.taunt();
      this.doShake(220, 0.008);
      if (penalty > 0) this.flash(C.blood, 0.35);
    }
    this.croc.laugh(Phaser.Math.Between(200, GAME_WIDTH - 200));
    this.refillMagazine();
    this.syncHud();

    if (this.lives <= 0) this.endGame(false);
  }

  private refillMagazine(): void {
    if (this.reloading) return;
    this.magazine = this.currentMagazine();
    this.ammo = this.magazine;
    this.syncHud();
  }

  // ── level flow ───────────────────────────────────────────────────

  private maybeAdvanceLevel(): void {
    if (this.clearing || this.gameEnded || this.bossFight) return;
    if (this.endless) return; // time-attack / survival never "clear"
    if (this.score < levelAt(this.levelIndex).targetScore) return;

    this.clearing = true;
    this.tracker.levelCleared();
    this.spawnEvent?.remove();
    this.aliveDucks().forEach((d) => d.panic());

    this.time.delayedCall(1300, () => {
      if (this.gameEnded) return;
      this.aliveDucks().forEach((d) => d.destroy());
      if (this.levelIndex >= LAST_LEVEL) {
        this.endGame(true);
        return;
      }
      this.advanceToNextLevel();
    });
  }

  private advanceToNextLevel(): void {
    this.levelIndex++;
    const next = levelAt(this.levelIndex);
    this.lives = Math.min(this.maxLives, this.lives + 1);
    this.magazine = this.currentMagazine();
    this.ammo = this.magazine;
    this.combo = 0;
    this.multiplier = 1;
    this.comboTimer = 0;
    this.nextFrenzyAt = Rules.frenzyEvery;

    this.bg.destroy();
    this.bg = new Parallax(this, next.timeOfDay);
    this.weather.destroy();
    this.weather = new Weather(this, pickWeather(this.levelIndex));

    Audio.levelUp();
    this.announce(`NIVEL ${next.index}`, next.name);
    this.flash(C.gold, 0.4);
    this.syncHud();

    this.time.delayedCall(1100, () => {
      if (this.gameEnded) return;
      this.clearing = false;
      if (this.weather.kind !== "clear") this.game.events.emit("dh:banner-mini", WEATHER_LABEL[this.weather.kind]);
      if (isBossLevel(this.levelIndex)) this.beginBoss();
      else this.beginWave();
    });
  }

  // ── bosses ───────────────────────────────────────────────────────

  private beginBoss(): void {
    if (this.gameEnded) return;
    const variant = levelAt(this.levelIndex).boss ?? "rey";
    const final = variant === "rey";
    this.bossFight = true;
    unlockedPowers(this.levelIndex).forEach((p) => (this.powers[p].unlocked = true));
    Audio.setBossMode(true);
    Audio.setIntensity(3);

    const diffMul = this.diff.label === "DURA" ? 1.35 : this.diff.label === "RELAX" ? 0.7 : 1;
    const base = variant === "rey" ? 34 : variant === "garza" ? 22 : 26;
    const hp = Math.max(8, Math.round(base * diffMul * (1 + this.levelIndex / 70)));

    this.boss = new Boss(this, variant, hp);
    this.announce(final ? "JEFE FINAL" : "JEFE", this.boss.displayName);
    this.flash(C.blood, 0.4);

    this.boss.on("spawnMinions", (n: number, kindId: DuckKindId) => {
      for (let i = 0; i < n; i++) this.spawnDuck(DUCK_KINDS[kindId] ?? DUCK_KINDS.normal, Phaser.Math.Between(150, 220));
    });
    this.boss.once("defeated", () => this.onBossDefeated());

    this.minionEvent?.remove();
    this.minionEvent = this.time.addEvent({
      delay: 3600 * this.diff.spawnMul,
      loop: true,
      callback: () => {
        if (this.aliveDucks().length < 3 && this.boss?.alive) this.spawnDuck(DUCK_KINDS.normal, 170);
      },
    });
    this.syncHud();
  }

  private onBossDefeated(): void {
    if (!this.scene.isActive() || this.gameEnded) return;
    this.minionEvent?.remove();
    Audio.setBossMode(false);
    this.flash(0xffffff, 0.7);
    this.doShake(600, 0.02);
    this.aliveDucks().forEach((d) => d.panic());
    const final = this.levelIndex >= LAST_LEVEL;
    this.time.delayedCall(1600, () => {
      if (this.gameEnded) return;
      this.boss?.destroy();
      this.boss = undefined;
      this.bossFight = false;
      if (final) this.endGame(true);
      else this.advanceToNextLevel();
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
      this.doShake(260, 0.01);
      this.flash(0xffffff, 0.6);
      if (this.boss?.alive) this.boss.hit(4);
      this.aliveDucks().forEach((d, i) =>
        this.time.delayedCall(i * 70, () => {
          if (d.state === "alive") this.bagDuck(d);
        }),
      );
      this.syncHud();
      return;
    }

    st.active = true;
    st.activeUntil = this.time.now + cfg.durationMs;
    if (id === Power.Freeze) this.aliveDucks().forEach((d) => d.setSpeedMul(0.15));
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
    if (this.gameEnded || this.scene.isPaused()) return;
    this.paused = !this.paused;

    if (this.paused) {
      this.time.paused = true;
      this.tweens.pauseAll();
      this.anims.pauseAll();
      const c = this.add.container(0, 0).setDepth(300);
      c.add(this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x0a0e24, 0.72).setOrigin(0));
      c.add(this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 30, "PAUSA", { fontFamily: FONT_FAMILY, fontSize: "40px", color: css(C.gold) }).setOrigin(0.5));
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
    this.tracker.gameEnded(win, this.levelIndex);
    this.spawnEvent?.remove();
    this.minionEvent?.remove();
    this.aliveDucks().forEach((d) => d.panic());
    this.input.setDefaultCursor("default");
    Audio.setBossMode(false);
    Audio.setIntensity(0);

    const user = currentUser();
    if (user) {
      recordResult(user.name, this.score, this.levelIndex);
      recordRun({ name: user.name, score: this.score, level: this.levelIndex, date: Date.now() });
    }

    const summary: RunSummary = {
      score: this.score,
      win,
      level: this.levelIndex,
      maxCombo: this.runBestCombo,
      shots: this.shotsFired,
      hits: this.shotsHit,
      playtimeMs: this.time.now - this.runStart,
      decoysHit: this.runDecoysHit,
      pinatas: this.runPinatas,
      frenzies: this.runFrenzies,
      rampages: this.runRampages,
      ducksByKind: this.runByKind,
      weapon: this.weapon.id,
    };
    recordRunStats(summary);
    const missionsDone = applyRunToMissions(summary);
    const banked = this.coins;
    bankDeposit(this.coins);

    if (win) Audio.levelUp();
    else Audio.gameOver();
    this.cameras.main.fadeOut(500, 0, 0, 0);
    const acc = this.shotsFired ? Math.round((this.shotsHit / this.shotsFired) * 100) : 0;
    const newAchievements = this.tracker.earned.map((a) => a.title);
    this.time.delayedCall(560, () => {
      this.scene.stop(Scenes.Hud);
      this.scene.start(Scenes.GameOver, {
        score: this.score,
        level: this.levelIndex,
        win,
        newAchievements,
        accuracy: acc,
        bestCombo: this.runBestCombo,
        banked,
        missionsDone,
      });
    });
  }

  private cleanup(): void {
    this.input.setDefaultCursor("default");
    const ev = this.game.events;
    ev.off("dh:ctrl-reload", this.reload, this);
    ev.off("dh:ctrl-pause", this.togglePause, this);
    ev.off("dh:ctrl-power", this.activatePower, this);
    ev.off("dh:ctrl-croc", this.releaseCroc, this);
    this.spawnEvent?.remove();
    this.minionEvent?.remove();
    this.weather?.destroy();
    this.bg?.destroy();
    Audio.setBossMode(false);
    Audio.setIntensity(0);
  }

  // ── juice helpers ────────────────────────────────────────────────

  private doShake(duration: number, intensity: number): void {
    // guard against a delayedCall / tween callback landing after scene shutdown
    if (this.shakeOn && this.scene.isActive() && this.cameras?.main) {
      this.cameras.main.shake(duration, intensity);
    }
  }

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
    if (this.slowmo) return;
    this.timeFactor = 0.3;
    this.tweens.timeScale = 0.4;
    this.hitstopUntil = this.time.now + Rules.hitstopMs;
  }

  private startSlowmo(ms: number): void {
    this.slowmo = { ms, elapsed: 0 };
    this.hitstopUntil = 0;
  }

  private updateTimeDistortion(deltaMs: number): void {
    if (this.slowmo) {
      this.slowmo.elapsed += deltaMs;
      const k = Phaser.Math.Clamp(this.slowmo.elapsed / this.slowmo.ms, 0, 1);
      const v = 0.35 + 0.65 * (k * k);
      this.timeFactor = v;
      this.tweens.timeScale = v;
      if (k >= 1) {
        this.slowmo = undefined;
        this.timeFactor = 1;
        this.tweens.timeScale = 1;
      }
    } else if (this.hitstopUntil && this.time.now >= this.hitstopUntil) {
      this.hitstopUntil = 0;
      this.timeFactor = 1;
      this.tweens.timeScale = 1;
    }
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
      maxLives: this.maxLives,
      level: this.levelIndex,
      levelName: this.bossFight
        ? "JEFE"
        : this.mode === "timeattack"
          ? "CONTRARRELOJ"
          : this.mode === "survival"
            ? "SUPERVIVENCIA"
            : lvl.name,
      target: lvl.targetScore,
      prevTarget,
      ammo: this.ammo,
      magazine: this.magazine,
      reloading: this.reloading,
      multiplier: this.multiplier * (this.powers[Power.Double].active ? 2 : 1),
      combo: this.combo,
      comboTimer: Math.max(0, this.comboTimer),
      comboWindow: this.comboWindow(),
      coins: this.coins,
      weapon: this.weapon.label,
      boss: this.boss ? { hp: this.boss.hp, maxHp: this.boss.maxHp, name: this.boss.displayName } : null,
      crocMeter: this.crocMeter,
      crocReady: this.crocReady,
      frenzy: this.time.now < this.frenzyUntil,
      theme: themeAccent(),
      mode: this.mode,
      timeLeftMs: this.timeLeftMs,
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

    if (this.timeLeftMs >= 0) {
      this.timeLeftMs -= delta;
      if (this.timeLeftMs <= 0) {
        this.timeLeftMs = 0;
        this.endGame(true);
        return;
      }
    }
    if (this.endless && this.time.now >= this.endlessRampAt) this.endlessRamp();

    this.updateTimeDistortion(delta);
    const scaled = delta * this.timeFactor;

    this.bg.update(time, scaled);
    this.weather.update(scaled);
    this.tickPowers();

    (this.ducks.getChildren() as Duck[]).forEach((d) => {
      if (d.state === "done") return;
      d.tick(time, scaled);
    });

    const wind = this.weather.windForce();
    if (wind) {
      const dx = (wind * scaled) / 1000;
      this.aliveDucks().forEach((d) => (d.x = Phaser.Math.Clamp(d.x - dx, 30, GAME_WIDTH - 30)));
    }

    if (this.boss?.alive) this.boss.tick(scaled, this.crosshair.x);

    if (this.powers[Power.Freeze].active) {
      this.aliveDucks().forEach((d) => d.setSpeedMul(0.15));
    }

    Audio.setIntensity(this.bossFight ? 3 : Phaser.Math.Clamp(this.levelIndex - 1 + (this.multiplier >= 3 ? 1 : 0), 0, 3));

    if (this.combo > 0) {
      this.comboTimer -= delta;
      if (this.comboTimer <= 0) {
        if (this.multiplier >= 2) {
          Audio.comboLost();
          this.game.events.emit("dh:combo-lost");
        }
        this.combo = 0;
        this.multiplier = 1;
        this.nextFrenzyAt = Rules.frenzyEvery;
      }
    }

    // drifting shootable clouds
    for (const c of this.clouds) {
      c.x -= 8 * (scaled / 1000);
      if (c.x < -c.displayWidth) c.x = GAME_WIDTH + c.displayWidth * 0.5;
    }

    // weapon viewmodel idle sway
    this.gunView.setPosition(
      this.gunBaseX + Math.sin(time / 620) * 3,
      this.gunBaseY + Math.sin(time / 430) * 5,
    );

    this.syncHud();
  }
}
