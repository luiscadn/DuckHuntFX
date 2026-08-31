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
import { Dog } from "../objects/Dog";
import { BossDuck } from "../objects/BossDuck";
import { LAST_LEVEL, PowerConfig, levelAt, unlockedPowers } from "../data/levels";
import { currentUser, recordResult } from "../data/accounts";
import { recordRun } from "../data/scores";
import { DUCK_KINDS, pickDuckKind, type DuckKindId } from "../data/ducks";
import { RunTracker, lifetimeDucks } from "../data/achievements";
import { getSettings, mods, type DifficultyMods } from "../data/settings";
import {
  WEAPONS,
  equipWeapon,
  equippedWeapon,
  isWeaponUnlocked,
  unlockWeapon,
  type Weapon,
  type WeaponId,
} from "../data/weapons";

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
  boss: { hp: number; maxHp: number } | null;
  powers: Record<PowerId, PowerState & { key: string; label: string; icon: string; durationMs: number; cooldownMs: number }>;
  now: number;
}

const WEATHER_LABEL: Record<string, string> = { rain: "LLUVIA", fog: "NIEBLA", wind: "VIENTO" };

export class GameScene extends Phaser.Scene {
  private bg!: Parallax;
  private weather!: Weather;
  private dog!: Dog;
  private crosshair!: Phaser.GameObjects.Image;
  private ducks!: Phaser.GameObjects.Group;
  private boss?: BossDuck;

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
  private upgradeCounts: Record<string, number> = {};

  private shotsFired = 0;
  private shotsHit = 0;
  private runBestCombo = 0;

  private reloading = false;
  private clearing = false;
  private paused = false;
  private gameEnded = false;
  private bossFight = false;
  private pendingStart: "wave" | "boss" = "wave";
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
    this.dog = new Dog(this);

    this.add.image(0, 0, "vignette").setOrigin(0).setDepth(90).setScrollFactor(0);
    this.crosshair = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, "crosshair").setDepth(100);
    this.input.setDefaultCursor("none");

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

    this.events.on(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);

    this.dog.sniffAcross(-40, GAME_WIDTH * 0.4, 1400);
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
        end: (win = false) => this.endGame(win),
      };
    }
  }

  private resetState(): void {
    this.diff = mods();
    this.shakeOn = getSettings().shake;

    this.weapon = equippedWeapon();
    if (!isWeaponUnlocked(this.weapon.id, lifetimeDucks())) this.weapon = WEAPONS.pistol;

    this.score = 0;
    this.maxLives = Math.max(1, Rules.startingLives + this.diff.livesBonus);
    this.lives = this.maxLives;
    this.levelIndex = 1;
    this.magBonus = 0;
    this.reloadMul = 1;
    this.aimPad = 0;
    this.magazine = this.weapon.magazine;
    this.ammo = this.magazine;
    this.combo = 0;
    this.multiplier = 1;
    this.comboTimer = 0;
    this.coins = 0;
    this.coinsGranted = 0;
    this.upgradeCounts = {};
    this.shotsFired = 0;
    this.shotsHit = 0;
    this.runBestCombo = 0;
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
    this.syncHud();
  }

  private trySpawn(): void {
    if (this.paused || this.clearing || this.gameEnded) return;
    const lvl = levelAt(this.levelIndex);
    if (this.aliveDucks().length >= lvl.maxAlive + this.diff.maxAliveBonus) return;
    this.spawnDuck(pickDuckKind(this.levelIndex), Phaser.Math.Between(lvl.speed[0], lvl.speed[1]));
  }

  private spawnDuck(kind = DUCK_KINDS.normal, rawSpeed = 130): Duck {
    const duck = new Duck(this, rawSpeed * this.diff.speedMul, kind);
    this.ducks.add(duck);
    if (this.powers[Power.Freeze].active) duck.setSpeedMul(0.15);
    duck.once("escaped", () => this.onDuckEscaped(duck));
    duck.once("bagged", () => this.onDuckBagged(duck));

    if (kind.id === "golden") {
      Audio.golden();
      this.game.events.emit("dh:banner-mini", "¡PATO DORADO!");
    } else if (kind.id === "bomb") {
      this.game.events.emit("dh:banner-mini", "¡BOMBA!");
    }
    const puff = this.add.image(duck.x, GROUND_Y + 2, "puff").setDepth(18);
    this.tweens.add({ targets: puff, scale: 1.4, alpha: 0, duration: 260, onComplete: () => puff.destroy() });
    return duck;
  }

  private aliveDucks(): Duck[] {
    return (this.ducks.getChildren() as Duck[]).filter((d) => d.state === "alive");
  }

  // ── shooting ─────────────────────────────────────────────────────

  private shoot(p: Phaser.Input.Pointer): void {
    Audio.unlock();
    if (this.paused || this.gameEnded) return;
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
    this.ammo--;
    this.shotsFired++;
    this.fireSound();
    this.muzzleFlash(p.x, p.y);
    this.doShake(90, this.weapon.shake);

    const wob = this.weapon.wobble;
    const ax = p.x + (wob ? Phaser.Math.Between(-wob, wob) : 0);
    const ay = p.y + (wob ? Phaser.Math.Between(-wob, wob) : 0);

    if (this.weapon.pellets > 1) this.fireSpread(ax, ay);
    else this.fireSingle(ax, ay);

    if (this.ammo === 0) this.tracker.ranDry();
    if (this.ammo <= 0) this.reload();
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

  private fireSingle(x: number, y: number): void {
    if (this.boss?.alive && this.inflatedBounds(this.boss).contains(x, y)) {
      this.hitBoss(this.weapon.heavy ? 3 : 1, x, y);
      return;
    }
    const target = this.aliveDucks()
      .filter((d) => this.inflatedBounds(d).contains(x, y))
      .sort((a, b) => b.bornAt - a.bornAt)[0];

    if (target) {
      this.shotsHit++;
      if (this.weapon.heavy) {
        target.bag();
        this.bagDuck(target, true);
      } else {
        const killed = target.hit();
        if (killed) this.bagDuck(target);
        else this.woundDuck(target);
      }
    } else {
      this.onMiss();
      this.tracker.missedShot();
    }
  }

  private fireSpread(cx: number, cy: number): void {
    const rings = [0, 26, 52];
    const points: Array<[number, number]> = [[cx, cy]];
    for (let i = 1; i < this.weapon.pellets; i++) {
      const a = (i / (this.weapon.pellets - 1)) * Math.PI * 2;
      const r = rings[i % rings.length] || 40;
      points.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
    }

    if (this.boss?.alive && points.some(([x, y]) => this.inflatedBounds(this.boss!).contains(x, y))) {
      this.hitBoss(2, cx, cy);
    }

    const hit = new Set<Duck>();
    for (const [x, y] of points) {
      for (const d of this.aliveDucks()) {
        if (!hit.has(d) && this.inflatedBounds(d).contains(x, y)) hit.add(d);
      }
    }
    if (hit.size === 0) {
      this.onMiss();
      this.tracker.missedShot();
      return;
    }
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
  }

  private bagDuck(duck: Duck, heavy = false): void {
    const kind = duck.kind;
    duck.bag();

    this.combo++;
    this.runBestCombo = Math.max(this.runBestCombo, this.combo);
    this.multiplier = Phaser.Math.Clamp(1 + Math.floor((this.combo - 1) / 2), 1, Rules.maxComboMultiplier);
    this.comboTimer = this.comboWindow();

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
    if (this.multiplier >= 2) this.game.events.emit("dh:combo", this.multiplier * doubleMul);

    this.maybeAdvanceLevel();
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
    this.tweens.add({ targets: this.crosshair, angle: { from: -12, to: 0 }, duration: 180, ease: "quad.out" });
    this.crosshair.setTint(0xff5555);
    this.time.delayedCall(120, () => this.crosshair.clearTint());
  }

  private reload(): void {
    if (this.reloading || this.ammo >= this.magazine || this.gameEnded) return;
    this.reloading = true;
    Audio.reload();
    this.syncHud();
    this.time.delayedCall(this.weapon.reloadMs * this.reloadMul, () => {
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
    const kind = duck.kind;
    duck.destroy();
    if (this.clearing || this.gameEnded) return;

    this.combo = 0;
    this.multiplier = 1;
    this.comboTimer = 0;
    const penalty = this.diff.escapeCostsLife ? kind.escapePenalty : 0;
    this.lives -= penalty;
    if (penalty > 0) this.tracker.lostLife();

    if (kind.id === "bomb" && penalty > 0) {
      Audio.explode();
      this.flash(C.rust, 0.55);
      this.doShake(340, 0.015);
    } else {
      Audio.dogLaugh();
      this.doShake(220, 0.008);
      if (penalty > 0) this.flash(C.blood, 0.35);
    }
    this.dog.laugh(Phaser.Math.Between(200, GAME_WIDTH - 200));
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

      this.levelIndex++;
      const next = levelAt(this.levelIndex);
      this.lives = Math.min(this.maxLives, this.lives + 1);
      this.magazine = this.currentMagazine();
      this.ammo = this.magazine;
      this.combo = 0;
      this.multiplier = 1;
      this.comboTimer = 0;

      this.bg.destroy();
      this.bg = new Parallax(this, next.timeOfDay);
      this.weather.destroy();
      this.weather = new Weather(this, pickWeather(this.levelIndex));

      Audio.levelUp();
      this.announce(`NIVEL ${next.index}`, next.name);
      this.flash(C.gold, 0.4);
      this.syncHud();

      this.pendingStart = this.levelIndex === LAST_LEVEL ? "boss" : "wave";
      this.time.delayedCall(1100, () => this.openShop());
    });
  }

  private openShop(): void {
    if (this.gameEnded) return;
    this.scene.pause();
    this.scene.launch(Scenes.Shop, { game: this });
  }

  resumeFromShop(): void {
    this.scene.resume();
    this.clearing = false;
    if (this.weather.kind !== "clear") this.game.events.emit("dh:banner-mini", WEATHER_LABEL[this.weather.kind]);
    if (this.pendingStart === "boss") this.beginBoss();
    else this.beginWave();
    this.syncHud();
  }

  // ── final boss ───────────────────────────────────────────────────

  private beginBoss(): void {
    if (this.gameEnded) return;
    this.bossFight = true;
    unlockedPowers(this.levelIndex).forEach((p) => (this.powers[p].unlocked = true));
    Audio.setBossMode(true);
    Audio.setIntensity(3);
    this.announce("JEFE FINAL", "El Rey Pato");
    this.flash(C.blood, 0.4);

    const hp = 30 + (this.diff.label === "DURA" ? 14 : this.diff.label === "RELAX" ? -8 : 0);
    this.boss = new BossDuck(this, hp);
    this.boss.on("spawnMinions", (n: number) => {
      for (let i = 0; i < n; i++) {
        const kind = Math.random() < 0.5 ? DUCK_KINDS.fast : DUCK_KINDS.normal;
        this.spawnDuck(kind, Phaser.Math.Between(150, 210));
      }
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
    this.minionEvent?.remove();
    Audio.setBossMode(false);
    this.flash(0xffffff, 0.7);
    this.doShake(600, 0.02);
    this.aliveDucks().forEach((d) => d.panic());
    this.time.delayedCall(1600, () => this.endGame(true));
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

  // ── shop API (called by ShopScene) ───────────────────────────────

  get coinCount(): number {
    return this.coins;
  }

  shopCost(id: string): number | null {
    const n = this.upgradeCounts[id] ?? 0;
    switch (id) {
      case "life":
        return this.maxLives >= 6 ? null : 4 + n * 3;
      case "mag":
        return this.magBonus >= 4 ? null : 3 + n * 2;
      case "reload":
        return n >= 2 ? null : 6;
      case "aim":
        return n >= 2 ? null : 5;
      default: {
        if (id.startsWith("w_")) {
          const wid = id.slice(2) as WeaponId;
          if (this.weapon.id === wid) return null;
          if (isWeaponUnlocked(wid, lifetimeDucks())) return 0;
          return WEAPONS[wid].shopCost;
        }
        return null;
      }
    }
  }

  shopBuy(id: string): boolean {
    const cost = this.shopCost(id);
    if (cost === null || this.coins < cost) return false;
    this.coins -= cost;
    this.upgradeCounts[id] = (this.upgradeCounts[id] ?? 0) + 1;

    switch (id) {
      case "life":
        this.maxLives++;
        this.lives++;
        break;
      case "mag":
        this.magBonus++;
        break;
      case "reload":
        this.reloadMul *= 0.7;
        break;
      case "aim":
        this.aimPad += 10;
        break;
      default:
        if (id.startsWith("w_")) {
          const wid = id.slice(2) as WeaponId;
          unlockWeapon(wid);
          equipWeapon(wid);
          this.weapon = WEAPONS[wid];
          this.magazine = this.currentMagazine();
          this.ammo = this.magazine;
        }
    }
    this.syncHud();
    return true;
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
      });
    });
  }

  private cleanup(): void {
    this.input.setDefaultCursor("default");
    this.spawnEvent?.remove();
    this.minionEvent?.remove();
    this.weather?.destroy();
    this.bg?.destroy();
    Audio.setBossMode(false);
    Audio.setIntensity(0);
  }

  // ── juice helpers ────────────────────────────────────────────────

  private doShake(duration: number, intensity: number): void {
    if (this.shakeOn) this.cameras.main.shake(duration, intensity);
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
      levelName: this.bossFight ? "JEFE" : lvl.name,
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
      boss: this.boss ? { hp: this.boss.hp, maxHp: this.boss.maxHp } : null,
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
      }
    }

    this.syncHud();
  }
}
