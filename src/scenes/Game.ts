import Phaser from 'phaser';
import { M } from '../physics/matter';
import { HOUSE_X, VIEW_W } from '../config/game';
import { ZombieTypeId } from '../config/zombies';
import { Zombie, ZombieHost } from '../entities/Zombie';
import { RagdollPart } from '../entities/Ragdoll';
import { RENDER_SCALE } from '../config/display';
import { Damage } from '../systems/Damage';
import { FlickInput } from '../systems/FlickInput';
import { Fx } from '../systems/Fx';
import { PerfBudget } from '../systems/PerfBudget';
import { Backdrop } from '../world/Backdrop';
import { CameraController } from '../world/CameraController';
import { DecalLayer } from '../world/DecalLayer';
import { Ground } from '../world/Ground';
import { House } from '../world/House';

const STEP_MS = 1000 / 60;

/** Milestone (a): scene, walkers, flick physics, ragdoll, dismemberment, camera. */
export class Game extends Phaser.Scene implements ZombieHost {
  private zombies: Zombie[] = [];
  private backdrop!: Backdrop;
  private house!: House;
  private ground!: Ground;
  private hint!: Phaser.GameObjects.Text;
  private decals!: DecalLayer;
  private fx!: Fx;
  private camCtl!: CameraController;
  private flick!: FlickInput;
  private perf!: PerfBudget;
  private kills = 0;
  private houseDamage = 0;
  private spawnTimer = 0;
  private spawnSide: 1 | -1 = 1;
  private info!: Phaser.GameObjects.Text;
  private debug = new URLSearchParams(location.search).has('debug');

  constructor() {
    super('Game');
  }

  create(): void {
    this.zombies = [];
    this.backdrop = new Backdrop(this);
    this.house = new House(this);
    this.ground = new Ground(this);
    this.decals = new DecalLayer(this);
    this.fx = new Fx(this, this.decals);
    this.camCtl = new CameraController(this);
    this.perf = new PerfBudget(this);
    new Damage(this, this);

    this.flick = new FlickInput({
      scene: this,
      zombies: () => this.zombies,
      onPanStart: (p) => this.camCtl.panStartAt(p.x),
      onPanMove: (p) => this.camCtl.panMoveTo(p.x),
      onPanEnd: () => this.camCtl.panEnd(),
      onNudge: (z, v) => {
        const cap = 2;
        const sp = Math.hypot(v.x, v.y) || 1;
        const k = Math.min(1, cap / sp);
        M.Body.setVelocity(z.rag.torso, { x: z.rag.torso.velocity.x + v.x * k, y: z.rag.torso.velocity.y + v.y * k });
      },
    });

    // Zombie controllers run at the fixed physics rate, before each Matter step.
    this.matter.world.on('beforeupdate', () => {
      for (const z of this.zombies) z.physicsStep(STEP_MS);
    });

    this.info = this.add.text(12, 10, '', { fontFamily: 'monospace', fontSize: '14px', color: '#e8f0ff', resolution: RENDER_SCALE })
      .setScrollFactor(0).setDepth(100).setShadow(1, 1, '#000', 2);
    this.hint = this.add.text(VIEW_W / 2, 606, 'Drag a zombie and let go to fling it  ·  Drag empty space to look around', {
      fontFamily: 'Trebuchet MS, sans-serif', fontSize: '16px', color: '#dfe9f7', resolution: RENDER_SCALE,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(100).setAlpha(0.85).setShadow(0, 2, '#000', 4);

    // Milestone (a) test spawner: a couple of walkers at a time from both sides.
    for (const side of [1, -1] as const) this.spawn('walker', side);
  }

  spawn(type: ZombieTypeId, side: 1 | -1): Zombie {
    // side +1 = enters from the left and walks right.
    const x = side > 0 ? HOUSE_X - 700 : HOUSE_X + 700;
    const z = new Zombie(this, this, type, x, side);
    this.zombies.push(z);
    return z;
  }

  update(_time: number, delta: number): void {
    this.flick.update();
    this.camCtl.hold = this.flick.grabbing;
    if (this.flick.grabbing && this.hint.alpha > 0.84) {
      this.tweens.add({ targets: this.hint, alpha: 0, duration: 600, delay: 1200 });
    }
    this.ground.update(delta);
    this.backdrop.update(delta);
    this.house.update(delta);
    for (const z of this.zombies) z.render(delta);
    this.zombies = this.perf.update(this.zombies);
    this.camCtl.update(delta, this.zombies);

    this.spawnTimer -= delta;
    const alive = this.zombies.filter((z) => z.alive).length;
    if (alive < 3 && this.spawnTimer <= 0) {
      this.spawn('walker', this.spawnSide);
      this.spawnSide = this.spawnSide > 0 ? -1 : 1;
      this.spawnTimer = 2500;
    }

    const fps = this.debug ? `  fps ${this.game.loop.actualFps.toFixed(0)}  bodies ${M.Composite.allBodies(this.matter.world.localWorld as unknown as MatterJS.CompositeType).length}` : '';
    this.info.setText(`kills ${this.kills}   house dmg ${this.houseDamage.toFixed(0)}${fps}`);
  }

  // ---------------------------------------------------------------- ZombieHost

  bloodBurst(x: number, y: number, amount?: number): void {
    this.fx.bloodBurst(x, y, amount);
  }

  shake(intensity?: number, ms?: number): void {
    this.fx.shake(intensity, ms);
  }

  bloodSpurt(z: Zombie, part: RagdollPart): void {
    this.fx.bloodSpurt(z.rag, part);
  }

  hitStop(ms: number): void {
    this.fx.hitStop(ms);
  }

  onZombieKilled(): void {
    this.kills++;
    this.fx.hitStop(55);
    this.fx.shake(0.006, 140);
  }

  onHouseDamage(_z: Zombie, amount: number): void {
    this.houseDamage += amount;
  }
}
