import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import * as CANNON from 'cannon-es';
import { LEVELS } from './levels';
import {
  BIRD_CONFIGS,
  BirdType,
  BlockMaterial,
  GameHudState,
  GamePhase,
  LevelDefinition,
} from './types';
import { createProceduralTextures, ProceduralTextureSet } from './textures';
import {
  createBirdModel,
  createEnvironmentScenery,
  createFpvBeakRig,
  createPigModel,
  createSlingshotModel,
  FpvBeakRigHandle,
  SlingshotRig,
} from './models';
import { SoundEngine } from './sound';

interface BlockEntity {
  id: number;
  materialType: BlockMaterial;
  mesh: THREE.Mesh;
  body: CANNON.Body;
  hp: number;
  maxHp: number;
  destroyed: boolean;
  lastDamageAt: number;
  halfExtents: [number, number, number];
}

interface PigEntity {
  id: number;
  mesh: THREE.Group;
  body: CANNON.Body;
  hp: number;
  maxHp: number;
  isKing: boolean;
  destroyed: boolean;
  lastDamageAt: number;
}

interface Particle {
  mesh: THREE.Mesh;
  vel: THREE.Vector3;
  rotVel: THREE.Vector3;
  life: number;
  maxLife: number;
  gravityScale: number;
}

const SLINGSHOT_ANCHOR = new THREE.Vector3(-16, 3.45, 0);
const CLASSIC_CAM_POS = new THREE.Vector3(-0.5, 6.2, 26.5);
const CLASSIC_CAM_LOOK = new THREE.Vector3(2.2, 3.6, 0);
const GRAVITY_Y = -14;
const MIN_LAUNCH_SPEED = 11.5;
const MAX_LAUNCH_SPEED = 31.5;

const STORAGE_KEY = 'feather_flight_fpv_progress_v1';

// Pre-allocated math helpers to avoid per-frame GC
const _vecA = new THREE.Vector3();
const _vecB = new THREE.Vector3();
const _vecC = new THREE.Vector3();
const _lookTarget = new THREE.Vector3();
const _desiredCamPos = new THREE.Vector3();

export class GameEngine {
  private container: HTMLElement;
  private onHudUpdate: (state: GameHudState) => void;
  private onWebGLContextLost?: () => void;

  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private textures!: ProceduralTextureSet;
  private slingshot!: SlingshotRig;
  private fpvBeakRig!: FpvBeakRigHandle;
  private sound = new SoundEngine();

  private isSoftwareGl = false;
  private frameId = 0;
  private disposed = false;
  private lastTimeMs = 0;

  // Physics world & contact materials
  private world!: CANNON.World;
  private defaultPhysMat!: CANNON.Material;
  private birdPhysMat!: CANNON.Material;
  private groundBody!: CANNON.Body;

  // Level & entities
  private levelIndex = 0;
  private currentLevel!: LevelDefinition;
  private blocks: BlockEntity[] = [];
  private pigs: PigEntity[] = [];
  private particles: Particle[] = [];
  private waitingBirdMeshes: THREE.Group[] = [];
  private activeBirdMesh: THREE.Group | null = null;
  private activeBirdBody: CANNON.Body | null = null;
  private extraFlightBirds: { mesh: THREE.Group; body: CANNON.Body; type: BirdType }[] = [];
  private nextEntityId = 1;
  private levelLoadedAt = 0;

  // Trajectory preview dots
  private trajectoryDots: THREE.Mesh[] = [];
  private trajectoryGroup = new THREE.Group();

  // Wind streak particles for FPV speed sensation
  private windStreaks: THREE.Mesh[] = [];

  // Deferred physics queues (never mutate world inside world.step collide callbacks)
  private pendingBlockHits: { block: BlockEntity; damage: number; impactVel: number }[] = [];
  private pendingPigHits: { pig: PigEntity; damage: number }[] = [];
  private pendingImpact: { pos: THREE.Vector3; relVel: number } | null = null;

  // Gameplay state
  private phase: GamePhase = 'aiming';
  private power = 0.65;
  private chargeDir = 1;
  private chargeTime = 0;
  private isCharging = false;
  private pitchDeg = 28;
  private yawDeg = 0;
  private birdQueue: BirdType[] = ['red', 'red'];
  private currentBirdType: BirdType = 'red';
  private activeFlightBirdType: BirdType = 'red';
  private blackBombDetonated = false;
  private score = 0;
  private starsEarned = 0;
  private boostAvailable = true;
  private flightElapsed = 0;
  private impactElapsed = 0;
  private cameraShake = 0;
  private impactAnchor = new THREE.Vector3(16, 2, 0);
  private currentLookAt = CLASSIC_CAM_LOOK.clone();

  // Progress persistence
  private unlockedLevels = 1;
  private bestScores: Record<number, number> = {};

  // Input tracking
  private keysPressed = new Set<string>();
  private isPointerDragging = false;
  private lastPointerX = 0;
  private lastPointerY = 0;
  private lastHudPush = 0;

  // Cached block materials
  private blockMaterials!: Record<BlockMaterial, THREE.MeshStandardMaterial>;
  private particleGeo = new THREE.BoxGeometry(0.28, 0.28, 0.28);

  constructor(
    container: HTMLElement,
    onHudUpdate: (state: GameHudState) => void,
    onWebGLContextLost?: () => void,
  ) {
    this.container = container;
    this.onHudUpdate = onHudUpdate;
    this.onWebGLContextLost = onWebGLContextLost;

    this.loadProgress();
    this.initRenderer();
    this.initScene();
    this.initPhysics();
    this.initTrajectoryAndWind();
    this.bindEvents();
    this.loadLevel(0);

    this.lastTimeMs = performance.now();
    this.loop();
  }

  private loadProgress() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (typeof parsed.unlockedLevels === 'number') {
          this.unlockedLevels = Math.max(1, Math.min(LEVELS.length, parsed.unlockedLevels));
        }
        if (parsed.bestScores && typeof parsed.bestScores === 'object') {
          this.bestScores = parsed.bestScores;
        }
      }
    } catch {
      // Ignore storage failures
    }
  }

  private saveProgress() {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          unlockedLevels: this.unlockedLevels,
          bestScores: this.bestScores,
        }),
      );
    } catch {
      // Ignore storage failures
    }
  }

  private initRenderer() {
    this.isSoftwareGl = (() => {
      const probe = document.createElement('canvas').getContext('webgl2');
      if (!probe) return true;
      const ext = probe.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : probe.RENDERER;
      const gpu = String(probe.getParameter(param));
      probe.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.renderer.setPixelRatio(
      this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2),
    );
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setSize(this.container.clientWidth || 1280, this.container.clientHeight || 720);

    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';

    this.renderer.domElement.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      this.onWebGLContextLost?.();
    });

    this.container.appendChild(this.renderer.domElement);
  }

  private initScene() {
    this.scene = new THREE.Scene();
    const skyColor = new THREE.Color(0x8fd3f4);
    this.scene.background = skyColor;
    this.scene.fog = new THREE.FogExp2(0x9be0fb, 0.0085);

    const w = this.container.clientWidth || 1280;
    const h = this.container.clientHeight || 720;
    this.camera = new THREE.PerspectiveCamera(48, w / h, 0.08, 280);
    this.camera.position.copy(CLASSIC_CAM_POS);
    this.camera.lookAt(CLASSIC_CAM_LOOK);

    // Attach FPV beak rig to camera so it's visible only during 1st-person flight
    this.fpvBeakRig = createFpvBeakRig();
    this.camera.add(this.fpvBeakRig.group);
    this.scene.add(this.camera);

    // Mandatory studio environment map for PBR reflections
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    // Warm/cool outdoor daylight rig
    const hemi = new THREE.HemisphereLight(0xbbe6ff, 0x4d7c2b, 0.85);
    hemi.position.set(0, 40, 0);
    this.scene.add(hemi);

    const sun = new THREE.DirectionalLight(0xfff4d6, 1.85);
    sun.position.set(12, 34, 22);
    sun.castShadow = !this.isSoftwareGl;
    sun.shadow.mapSize.width = 2048;
    sun.shadow.mapSize.height = 2048;
    sun.shadow.camera.near = 2;
    sun.shadow.camera.far = 95;
    sun.shadow.camera.left = -35;
    sun.shadow.camera.right = 38;
    sun.shadow.camera.top = 24;
    sun.shadow.camera.bottom = -16;
    sun.shadow.bias = -0.0005;
    sun.shadow.normalBias = 0.02;
    this.scene.add(sun);

    const rim = new THREE.DirectionalLight(0xdbeafe, 0.45);
    rim.position.set(-18, 14, -20);
    this.scene.add(rim);

    // Procedural textures & shared block materials
    this.textures = createProceduralTextures(
      this.renderer.capabilities.getMaxAnisotropy(),
    );

    this.blockMaterials = {
      wood: new THREE.MeshStandardMaterial({
        map: this.textures.wood,
        roughness: 0.72,
        metalness: 0.04,
      }),
      ice: new THREE.MeshPhysicalMaterial({
        map: this.textures.ice,
        color: 0xe0f2fe,
        roughness: 0.14,
        metalness: 0.05,
        transparent: true,
        opacity: 0.78,
        clearcoat: 0.9,
        clearcoatRoughness: 0.1,
      }),
      stone: new THREE.MeshStandardMaterial({
        map: this.textures.stone,
        roughness: 0.88,
        metalness: 0.08,
      }),
    };

    createEnvironmentScenery(this.scene, this.textures);
    this.slingshot = createSlingshotModel(this.textures);
    this.scene.add(this.slingshot.group);

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }
  }

  private initPhysics() {
    this.world = new CANNON.World({
      gravity: new CANNON.Vec3(0, GRAVITY_Y, 0),
    });
    this.world.allowSleep = true;
    (this.world.solver as CANNON.GSSolver).iterations = 10;

    this.defaultPhysMat = new CANNON.Material('default');
    this.birdPhysMat = new CANNON.Material('bird');

    this.world.addContactMaterial(
      new CANNON.ContactMaterial(this.defaultPhysMat, this.defaultPhysMat, {
        friction: 0.68,
        restitution: 0.08,
      }),
    );
    this.world.addContactMaterial(
      new CANNON.ContactMaterial(this.birdPhysMat, this.defaultPhysMat, {
        friction: 0.45,
        restitution: 0.36,
      }),
    );

    // Static infinite ground plane at y = 0
    this.groundBody = new CANNON.Body({
      type: CANNON.Body.STATIC,
      material: this.defaultPhysMat,
    });
    this.groundBody.addShape(new CANNON.Plane());
    this.groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
    this.world.addBody(this.groundBody);
  }

  private initTrajectoryAndWind() {
    const dotGeo = new THREE.SphereGeometry(0.16, 10, 8);
    const dotMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.85,
    });
    for (let i = 0; i < 18; i++) {
      const dot = new THREE.Mesh(dotGeo, dotMat.clone());
      (dot.material as THREE.MeshBasicMaterial).opacity = Math.max(0.22, 0.92 - i * 0.042);
      const s = Math.max(0.42, 1.0 - i * 0.03);
      dot.scale.setScalar(s);
      this.trajectoryDots.push(dot);
      this.trajectoryGroup.add(dot);
    }
    this.scene.add(this.trajectoryGroup);

    // Subtle wind streaks in camera space for FPV velocity sensation
    const streakGeo = new THREE.BoxGeometry(0.014, 0.014, 0.9);
    const streakMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.35,
    });
    for (let i = 0; i < 14; i++) {
      const streak = new THREE.Mesh(streakGeo, streakMat);
      const angle = (i / 14) * Math.PI * 2;
      const rad = 0.55 + (i % 3) * 0.22;
      streak.position.set(
        Math.cos(angle) * rad,
        Math.sin(angle) * rad * 0.72,
        -1.2 - (i % 4) * 0.65,
      );
      streak.visible = false;
      this.camera.add(streak);
      this.windStreaks.push(streak);
    }
  }

  private bindEvents() {
    window.addEventListener('resize', this.handleResize);
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);

    const dom = this.renderer.domElement;
    dom.addEventListener('pointerdown', this.handlePointerDown);
    window.addEventListener('pointermove', this.handlePointerMove);
    window.addEventListener('pointerup', this.handlePointerUp);
  }

  private handleResize = () => {
    if (this.disposed) return;
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  };

  private handleKeyDown = (e: KeyboardEvent) => {
    if (this.disposed) return;
    this.sound.unlock();
    this.keysPressed.add(e.code);

    if (e.code === 'Space' || e.code === 'Enter') {
      e.preventDefault();
      if (this.phase === 'aiming' && !this.isCharging) {
        this.startCharging();
      } else if (this.phase === 'flight' && !e.repeat) {
        this.triggerMidAirBoost();
      } else if (this.phase === 'impact' && !e.repeat && this.impactElapsed > 0.45) {
        this.skipImpactWait();
      }
    } else if (e.code === 'KeyR' && !e.repeat) {
      this.restartLevel();
    }
  };

  private handleKeyUp = (e: KeyboardEvent) => {
    if (this.disposed) return;
    this.keysPressed.delete(e.code);

    if ((e.code === 'Space' || e.code === 'Enter') && this.isCharging) {
      e.preventDefault();
      this.releaseLaunch();
    }
  };

  private handlePointerDown = (e: PointerEvent) => {
    this.sound.unlock();
    if (this.phase !== 'aiming' && this.phase !== 'charging') return;
    this.isPointerDragging = true;
    this.lastPointerX = e.clientX;
    this.lastPointerY = e.clientY;
  };

  private handlePointerMove = (e: PointerEvent) => {
    if (!this.isPointerDragging) return;
    const dx = e.clientX - this.lastPointerX;
    const dy = e.clientY - this.lastPointerY;
    this.lastPointerX = e.clientX;
    this.lastPointerY = e.clientY;

    this.pitchDeg = THREE.MathUtils.clamp(this.pitchDeg - dy * 0.22, 5, 68);
    this.yawDeg = THREE.MathUtils.clamp(this.yawDeg + dx * 0.18, -22, 22);
    this.updateTrajectoryPreview();
    this.emitHud(true);
  };

  private handlePointerUp = () => {
    this.isPointerDragging = false;
  };

  // Public API for React HUD
  public startCharging() {
    this.sound.unlock();
    if (this.phase !== 'aiming') return;
    this.isCharging = true;
    this.phase = 'charging';
    this.power = 0.15;
    this.chargeDir = 1;
    this.chargeTime = 0;
    this.emitHud(true);
  }

  public releaseLaunch() {
    if (!this.isCharging || this.phase !== 'charging') return;
    this.isCharging = false;
    this.launchActiveBird();
  }

  public setAim(pitchDeg: number, yawDeg: number) {
    if (this.phase !== 'aiming' && this.phase !== 'charging') return;
    this.pitchDeg = THREE.MathUtils.clamp(pitchDeg, 5, 68);
    this.yawDeg = THREE.MathUtils.clamp(yawDeg, -22, 22);
    this.updateTrajectoryPreview();
    this.emitHud(true);
  }

  public triggerMidAirBoost() {
    if (this.phase !== 'flight' || !this.boostAvailable || !this.activeBirdBody) return;
    this.boostAvailable = false;
    const bBody = this.activeBirdBody;
    const v = bBody.velocity;
    const pos = new THREE.Vector3(bBody.position.x, bBody.position.y, bBody.position.z);
    const dir = new THREE.Vector3(v.x, v.y, v.z);
    if (dir.lengthSq() < 0.1) dir.set(1, 0, 0);
    dir.normalize();

    const type = this.activeFlightBirdType;
    if (!BIRD_CONFIGS[type].abilityName) {
      this.emitHud(true);
      return;
    }

    if (type === 'yellow') {
      // Chuck: Supersonic Turbo Dash straight toward target!
      bBody.velocity.set(dir.x * 42, dir.y * 42 - 1.2, dir.z * 42);
      this.cameraShake = Math.max(this.cameraShake, 0.35);
      this.spawnBurst(pos, 0xfacc15, 22, 9.0);
      this.sound.playBoostChirp();
    } else if (type === 'blue') {
      // The Blues: Triple Split into 3 birds fanning out in Z & Y!
      const speed = Math.max(18, Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z));
      const baseYaw = Math.atan2(v.z, v.x);
      const basePitch = Math.asin(THREE.MathUtils.clamp(v.y / speed, -0.95, 0.95));
      for (const offset of [-1, 1]) {
        const cloneYaw = baseYaw + offset * 0.15;
        const clonePitch = basePitch + offset * 0.04;
        const cloneBody = new CANNON.Body({
          mass: BIRD_CONFIGS.blue.mass,
          material: this.birdPhysMat,
          linearDamping: 0.02,
          angularDamping: 0.25,
        });
        cloneBody.addShape(new CANNON.Sphere(BIRD_CONFIGS.blue.radius));
        cloneBody.position.set(pos.x, pos.y, pos.z + offset * 0.85);
        const cosP = Math.cos(clonePitch);
        cloneBody.velocity.set(
          Math.cos(cloneYaw) * cosP * speed * 1.05,
          Math.sin(clonePitch) * speed * 1.05,
          Math.sin(cloneYaw) * cosP * speed * 1.05,
        );
        this.world.addBody(cloneBody);

        const cloneMesh = createBirdModel('blue');
        cloneMesh.position.set(cloneBody.position.x, cloneBody.position.y, cloneBody.position.z);
        this.scene.add(cloneMesh);
        this.extraFlightBirds.push({ mesh: cloneMesh, body: cloneBody, type: 'blue' });
      }
      this.spawnBurst(pos, 0x38bdf8, 18, 7.5);
      this.sound.playBoostChirp();
    } else if (type === 'black') {
      // Bomb: Massive Mega Blast right on demand & switch to 3rd-person to watch collapse!
      this.blackBombDetonated = true;
      this.wakeAllFortressBodies();
      this.detonateExplosion(pos, 9.2, 36);
      this.enterImpactPhase(pos, 18);
      return;
    } else if (type === 'big') {
      // Terence: Heavy downward & forward ground slam!
      bBody.velocity.set(v.x + dir.x * 9.5, Math.min(v.y - 12, -14), v.z + dir.z * 9.5);
      this.cameraShake = Math.max(this.cameraShake, 0.42);
      this.spawnBurst(pos, 0x991b1b, 20, 8.0);
      this.sound.playBoostChirp();
    }

    this.emitHud(true);
  }

  public skipImpactWait() {
    if (this.phase !== 'impact') return;
    if (
      this.activeFlightBirdType === 'black' &&
      !this.blackBombDetonated &&
      this.activeBirdBody
    ) {
      this.blackBombDetonated = true;
      this.boostAvailable = false;
      const bp = this.activeBirdBody.position;
      this.detonateExplosion(new THREE.Vector3(bp.x, bp.y, bp.z), 9.2, 36);
      this.impactElapsed = 0.5;
      return;
    }
    this.checkWinOrNextTurn();
  }

  public toggleMute(): boolean {
    this.sound.muted = !this.sound.muted;
    this.emitHud(true);
    return this.sound.muted;
  }

  public restartLevel() {
    this.loadLevel(this.levelIndex);
  }

  public nextLevel() {
    const nextIdx = (this.levelIndex + 1) % LEVELS.length;
    this.loadLevel(nextIdx);
  }

  public loadLevel(index: number) {
    const safeIdx = Math.max(0, Math.min(LEVELS.length - 1, index));
    this.levelIndex = safeIdx;
    this.currentLevel = LEVELS[safeIdx];
    this.clearLevelEntities();

    this.score = 0;
    this.starsEarned = 0;
    this.birdQueue = [...this.currentLevel.birds];
    this.currentBirdType = this.birdQueue[0] ?? 'red';
    this.activeFlightBirdType = this.currentBirdType;
    this.blackBombDetonated = false;
    this.pitchDeg = 28;
    this.yawDeg = 0;
    this.power = 0.65;
    this.isCharging = false;
    this.phase = 'aiming';
    this.boostAvailable = BIRD_CONFIGS[this.currentBirdType].abilityName !== null;
    this.levelLoadedAt = performance.now();

    // Reset camera immediately to classic side-view Angry Birds vista
    this.camera.fov = 48;
    this.camera.updateProjectionMatrix();
    this.camera.position.copy(CLASSIC_CAM_POS);
    this.currentLookAt.copy(CLASSIC_CAM_LOOK);
    this.camera.lookAt(this.currentLookAt);
    this.fpvBeakRig.group.visible = false;
    this.setWindStreaksVisible(false);

    // Spawn destructible blocks
    for (const spec of this.currentLevel.blocks) {
      this.spawnBlock(spec);
    }

    // Spawn pigs
    for (const pigSpec of this.currentLevel.pigs) {
      this.spawnPig(pigSpec.x, pigSpec.y, pigSpec.z, pigSpec.radius ?? 0.72, Boolean(pigSpec.isKing));
    }

    this.prepareNextBirdInSlingshot();
    this.emitHud(true);
  }

  private clearLevelEntities() {
    this.pendingBlockHits = [];
    this.pendingPigHits = [];
    this.pendingImpact = null;

    for (const b of this.blocks) {
      this.scene.remove(b.mesh);
      b.mesh.geometry.dispose();
      this.world.removeBody(b.body);
    }
    this.blocks = [];

    for (const p of this.pigs) {
      this.scene.remove(p.mesh);
      this.world.removeBody(p.body);
    }
    this.pigs = [];

    for (const pt of this.particles) {
      this.scene.remove(pt.mesh);
      (pt.mesh.material as THREE.Material).dispose();
    }
    this.particles = [];

    for (const w of this.waitingBirdMeshes) {
      this.scene.remove(w);
    }
    this.waitingBirdMeshes = [];

    for (const extra of this.extraFlightBirds) {
      this.scene.remove(extra.mesh);
      this.world.removeBody(extra.body);
    }
    this.extraFlightBirds = [];

    if (this.activeBirdMesh) {
      this.scene.remove(this.activeBirdMesh);
      this.activeBirdMesh = null;
    }
    if (this.activeBirdBody) {
      this.world.removeBody(this.activeBirdBody);
      this.activeBirdBody = null;
    }
  }

  private spawnBlock(spec: LevelDefinition['blocks'][number]) {
    const { x, y, z, w, h, d, material, rotY = 0 } = spec;
    const centerY = y + h / 2;

    const geo = new THREE.BoxGeometry(w, h, d);
    const mat = this.blockMaterials[material];
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, centerY, z);
    mesh.rotation.y = rotY;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.scene.add(mesh);

    const densityMap: Record<BlockMaterial, number> = {
      ice: 0.75,
      wood: 1.0,
      stone: 2.2,
    };
    const hpMap: Record<BlockMaterial, number> = {
      ice: 14,
      wood: 30,
      stone: 68,
    };

    const volume = w * h * d;
    const mass = Math.max(0.6, volume * densityMap[material]);
    const body = new CANNON.Body({
      mass,
      material: this.defaultPhysMat,
      linearDamping: 0.05,
      angularDamping: 0.1,
      sleepSpeedLimit: 0.06,
      sleepTimeLimit: 1.4,
    });
    body.addShape(new CANNON.Box(new CANNON.Vec3(w / 2, h / 2, d / 2)));
    body.position.set(x, centerY, z);
    if (rotY) body.quaternion.setFromEuler(0, rotY, 0);
    body.sleep();
    this.world.addBody(body);

    const entity: BlockEntity = {
      id: this.nextEntityId++,
      materialType: material,
      mesh,
      body,
      hp: hpMap[material],
      maxHp: hpMap[material],
      destroyed: false,
      lastDamageAt: 0,
      halfExtents: [w / 2, h / 2, d / 2],
    };

    body.addEventListener('collide', (ev: { contact: CANNON.ContactEquation; body: CANNON.Body }) => {
      if (entity.destroyed) return;
      if (performance.now() - this.levelLoadedAt < 750) return;
      const impactVel = Math.abs(ev.contact.getImpactVelocityAlongNormal());
      if (impactVel < 1.8) return;

      const hitByBird =
        ev.body === this.activeBirdBody ||
        this.extraFlightBirds.some((eb) => eb.body === ev.body);
      let mult = hitByBird ? 4.4 : 1.75;
      if (hitByBird) {
        const cfg = BIRD_CONFIGS[this.activeFlightBirdType];
        if (entity.materialType === 'wood') mult *= cfg.woodMultiplier;
        else if (entity.materialType === 'ice') mult *= cfg.iceMultiplier;
        else if (entity.materialType === 'stone') mult *= cfg.stoneMultiplier;
      }
      const dmg = impactVel * mult;
      this.pendingBlockHits.push({ block: entity, damage: dmg, impactVel });
    });

    this.blocks.push(entity);
  }

  private spawnPig(x: number, y: number, z: number, radius: number, isKing: boolean) {
    const centerY = y + radius;
    const mesh = createPigModel(radius, isKing);
    mesh.position.set(x, centerY, z);
    this.scene.add(mesh);

    const body = new CANNON.Body({
      mass: isKing ? 3.2 : 1.8,
      material: this.defaultPhysMat,
      linearDamping: 0.08,
      angularDamping: 0.18,
      sleepSpeedLimit: 0.06,
      sleepTimeLimit: 1.4,
    });
    body.addShape(new CANNON.Sphere(radius));
    body.position.set(x, centerY, z);
    body.sleep();
    this.world.addBody(body);

    const maxHp = isKing ? 24 : 13;
    const pig: PigEntity = {
      id: this.nextEntityId++,
      mesh,
      body,
      hp: maxHp,
      maxHp,
      isKing,
      destroyed: false,
      lastDamageAt: 0,
    };

    body.addEventListener('collide', (ev: { contact: CANNON.ContactEquation; body: CANNON.Body }) => {
      if (pig.destroyed) return;
      if (performance.now() - this.levelLoadedAt < 850) return;
      const impactVel = Math.abs(ev.contact.getImpactVelocityAlongNormal());
      if (impactVel < 1.7) return;

      const isBirdHit =
        ev.body === this.activeBirdBody ||
        this.extraFlightBirds.some((eb) => eb.body === ev.body);
      const dmg = impactVel * (isBirdHit ? 5.2 : 2.35);
      this.pendingPigHits.push({ pig, damage: dmg });
    });

    this.pigs.push(pig);
  }

  private wakeAllFortressBodies() {
    for (const b of this.blocks) {
      if (!b.destroyed) {
        b.body.wakeUp();
      }
    }
    for (const p of this.pigs) {
      if (!p.destroyed) {
        p.body.wakeUp();
      }
    }
  }

  private flushPendingPhysicsEvents() {
    if (this.pendingImpact) {
      const { pos, relVel } = this.pendingImpact;
      this.pendingImpact = null;
      this.wakeAllFortressBodies();
      this.enterImpactPhase(pos, relVel);
    }

    if (this.pendingBlockHits.length > 0) {
      const hits = this.pendingBlockHits.splice(0, this.pendingBlockHits.length);
      for (const hit of hits) {
        this.damageBlock(hit.block, hit.damage, hit.impactVel);
      }
    }

    if (this.pendingPigHits.length > 0) {
      const hits = this.pendingPigHits.splice(0, this.pendingPigHits.length);
      for (const hit of hits) {
        this.damagePig(hit.pig, hit.damage);
      }
    }
  }

  private damageBlock(
    block: BlockEntity,
    damage: number,
    impactVel: number,
    bypassCooldown = false,
  ) {
    if (block.destroyed) return;
    const now = performance.now();
    if (!bypassCooldown && now - block.lastDamageAt < 80) return;
    block.lastDamageAt = now;

    this.wakeAllFortressBodies();
    block.hp -= damage;
    if (impactVel > 3.0) {
      this.sound.playImpact(block.materialType, impactVel);
    }

    if (block.hp <= 0) {
      block.destroyed = true;
      const pos = new THREE.Vector3(block.body.position.x, block.body.position.y, block.body.position.z);
      this.scene.remove(block.mesh);
      block.mesh.geometry.dispose();
      this.world.removeBody(block.body);

      const colorMap: Record<BlockMaterial, number> = {
        wood: 0xc4813b,
        ice: 0x7dd3fc,
        stone: 0x94a3b8,
      };
      this.spawnBurst(pos, colorMap[block.materialType], 12, 6.2);
      this.score += block.materialType === 'stone' ? 800 : 500;
      this.emitHud(true);
    } else if (block.hp < block.maxHp * 0.55) {
      block.mesh.scale.setScalar(0.96);
    }
  }

  private detonateExplosion(center: THREE.Vector3, blastRadius: number, blastImpulse: number) {
    this.sound.playExplosion();
    this.cameraShake = Math.max(this.cameraShake, 0.8);
    this.score += 1200;

    // Fiery burst + smoke
    this.spawnBurst(center, 0xf97316, 22, 12.5);
    this.spawnBurst(center, 0x334155, 16, 7.8);

    // Apply blast to blocks
    for (const b of this.blocks) {
      if (b.destroyed) continue;
      const dx = b.body.position.x - center.x;
      const dy = b.body.position.y - center.y;
      const dz = b.body.position.z - center.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (dist < blastRadius && dist > 0.01) {
        const falloff = 1 - dist / blastRadius;
        b.body.wakeUp();
        b.body.applyImpulse(
          new CANNON.Vec3(
            (dx / dist) * blastImpulse * falloff,
            ((dy / dist) + 0.45) * blastImpulse * falloff,
            (dz / dist) * blastImpulse * falloff,
          ),
        );
        this.damageBlock(b, 64 * falloff, 10, true);
      }
    }

    // Apply blast to pigs
    for (const p of this.pigs) {
      if (p.destroyed) continue;
      const dx = p.body.position.x - center.x;
      const dy = p.body.position.y - center.y;
      const dz = p.body.position.z - center.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (dist < blastRadius) {
        const falloff = 1 - dist / blastRadius;
        p.body.wakeUp();
        this.damagePig(p, 46 * falloff, true);
      }
    }
  }

  private damagePig(pig: PigEntity, damage: number, bypassCooldown = false) {
    if (pig.destroyed) return;
    const now = performance.now();
    if (!bypassCooldown && now - pig.lastDamageAt < 80) return;
    pig.lastDamageAt = now;

    pig.hp -= damage;
    if (pig.hp <= 0) {
      pig.destroyed = true;
      const pos = new THREE.Vector3(pig.body.position.x, pig.body.position.y, pig.body.position.z);
      this.scene.remove(pig.mesh);
      this.world.removeBody(pig.body);

      this.sound.playPigPop();
      this.spawnBurst(pos, 0x84cc16, 16, 6.5);
      this.spawnBurst(pos, 0xf8fafc, 10, 4.5);
      this.score += pig.isKing ? 8000 : 5000;
      this.emitHud(true);
    }
  }

  private spawnBurst(origin: THREE.Vector3, colorHex: number, count: number, speed: number) {
    for (let i = 0; i < count; i++) {
      const mat = new THREE.MeshStandardMaterial({
        color: colorHex,
        roughness: 0.7,
        transparent: true,
        opacity: 1,
      });
      const mesh = new THREE.Mesh(this.particleGeo, mat);
      mesh.position.copy(origin);
      const s = 0.5 + Math.random() * 0.9;
      mesh.scale.set(s, s * 0.65, s);
      this.scene.add(mesh);

      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI * 0.75;
      const spd = speed * (0.4 + Math.random() * 0.8);
      this.particles.push({
        mesh,
        vel: new THREE.Vector3(
          Math.cos(theta) * Math.sin(phi) * spd,
          Math.cos(phi) * spd + 1.5,
          Math.sin(theta) * Math.sin(phi) * spd,
        ),
        rotVel: new THREE.Vector3(
          (Math.random() - 0.5) * 10,
          (Math.random() - 0.5) * 10,
          (Math.random() - 0.5) * 10,
        ),
        life: 0,
        maxLife: 0.65 + Math.random() * 0.45,
        gravityScale: 0.75,
      });
    }
  }

  private prepareNextBirdInSlingshot() {
    if (this.activeBirdMesh) {
      this.scene.remove(this.activeBirdMesh);
      this.activeBirdMesh = null;
    }
    if (this.activeBirdBody) {
      this.world.removeBody(this.activeBirdBody);
      this.activeBirdBody = null;
    }

    for (const extra of this.extraFlightBirds) {
      this.scene.remove(extra.mesh);
      this.world.removeBody(extra.body);
    }
    this.extraFlightBirds = [];

    for (const w of this.waitingBirdMeshes) {
      this.scene.remove(w);
    }
    this.waitingBirdMeshes = [];

    if (this.birdQueue.length === 0) return;

    this.currentBirdType = this.birdQueue[0];
    this.fpvBeakRig.setBirdType(this.currentBirdType);

    this.activeBirdMesh = createBirdModel(this.currentBirdType);
    this.activeBirdMesh.position.copy(SLINGSHOT_ANCHOR);
    this.scene.add(this.activeBirdMesh);
    this.slingshot.updateBands(SLINGSHOT_ANCHOR);

    // Line up remaining waiting birds behind the slingshot with their distinct 3D models!
    for (let i = 1; i < this.birdQueue.length; i++) {
      const waitType = this.birdQueue[i];
      const waitR = BIRD_CONFIGS[waitType].radius;
      const waitBird = createBirdModel(waitType);
      waitBird.scale.setScalar(0.88);
      waitBird.position.set(
        -18.8 - (i - 1) * 1.9,
        waitR * 0.88,
        i % 2 === 0 ? 0.55 : -0.45,
      );
      this.scene.add(waitBird);
      this.waitingBirdMeshes.push(waitBird);
    }

    this.trajectoryGroup.visible = true;
    this.updateTrajectoryPreview();
  }

  private computeLaunchVelocity(out: THREE.Vector3): THREE.Vector3 {
    const speed = MIN_LAUNCH_SPEED + this.power * (MAX_LAUNCH_SPEED - MIN_LAUNCH_SPEED);
    const pitch = THREE.MathUtils.degToRad(this.pitchDeg);
    const yaw = THREE.MathUtils.degToRad(this.yawDeg);

    const cosP = Math.cos(pitch);
    out.set(
      Math.cos(yaw) * cosP * speed,
      Math.sin(pitch) * speed,
      Math.sin(yaw) * cosP * speed,
    );
    return out;
  }

  private computePullbackPosition(out: THREE.Vector3): THREE.Vector3 {
    const pitch = THREE.MathUtils.degToRad(this.pitchDeg);
    const yaw = THREE.MathUtils.degToRad(this.yawDeg);
    const pullDist = this.phase === 'charging' ? 0.55 + this.power * 2.25 : 0.45;
    const cosP = Math.cos(pitch);
    out.set(
      SLINGSHOT_ANCHOR.x - Math.cos(yaw) * cosP * pullDist,
      Math.max(0.85, SLINGSHOT_ANCHOR.y - Math.sin(pitch) * pullDist),
      SLINGSHOT_ANCHOR.z - Math.sin(yaw) * cosP * pullDist,
    );
    return out;
  }

  private updateTrajectoryPreview() {
    if (this.phase !== 'aiming' && this.phase !== 'charging') {
      this.trajectoryGroup.visible = false;
      return;
    }
    this.trajectoryGroup.visible = true;
    const start = this.computePullbackPosition(_vecA);
    const vel = this.computeLaunchVelocity(_vecB);

    const stepDt = 0.085;
    for (let i = 0; i < this.trajectoryDots.length; i++) {
      const t = (i + 1) * stepDt;
      const x = start.x + vel.x * t;
      const y = start.y + vel.y * t + 0.5 * GRAVITY_Y * t * t;
      const z = start.z + vel.z * t;
      const dot = this.trajectoryDots[i];
      if (y < 0.1) {
        dot.visible = false;
      } else {
        dot.visible = true;
        dot.position.set(x, y, z);
      }
    }
  }

  private launchActiveBird() {
    if (!this.activeBirdMesh) return;

    const launchPos = this.computePullbackPosition(_vecA).clone();
    const launchVel = this.computeLaunchVelocity(_vecB).clone();

    const firedType = this.birdQueue.shift() ?? 'red';
    this.activeFlightBirdType = firedType;
    this.blackBombDetonated = false;
    const cfg = BIRD_CONFIGS[firedType];
    this.fpvBeakRig.setBirdType(firedType);

    this.sound.playLaunch(this.power);

    // Create physics body for the launched bird with its bird-specific mass & radius
    const birdBody = new CANNON.Body({
      mass: cfg.mass,
      material: this.birdPhysMat,
      linearDamping: 0.02,
      angularDamping: 0.25,
    });
    birdBody.addShape(new CANNON.Sphere(cfg.radius));
    birdBody.position.set(launchPos.x, launchPos.y, launchPos.z);
    birdBody.velocity.set(launchVel.x, launchVel.y, launchVel.z);

    this.activeBirdBody = birdBody;
    this.world.addBody(birdBody);

    this.phase = 'flight';
    this.flightElapsed = 0;
    this.boostAvailable = cfg.abilityName !== null;
    this.trajectoryGroup.visible = false;

    // Snap slingshot pouch back to center
    this.slingshot.updateBands(SLINGSHOT_ANCHOR);

    // Queue collision transition safely (never mutate world inside collide)
    birdBody.addEventListener('collide', (ev: { contact: CANNON.ContactEquation; body: CANNON.Body }) => {
      if (this.phase !== 'flight') return;
      const relVel = Math.abs(ev.contact.getImpactVelocityAlongNormal());
      if (relVel < 1.1) return;

      if (ev.body === this.groundBody) {
        this.sound.playImpact('ground', relVel);
      }
      if (!this.pendingImpact) {
        this.pendingImpact = {
          pos: new THREE.Vector3(birdBody.position.x, birdBody.position.y, birdBody.position.z),
          relVel,
        };
      }
    });

    this.emitHud(true);
  }

  private enterImpactPhase(pos: THREE.Vector3, impactIntensity: number) {
    if (this.phase !== 'flight') return;
    this.phase = 'impact';
    this.impactElapsed = 0;
    this.impactAnchor.copy(pos);
    this.cameraShake = Math.max(this.cameraShake, Math.min(0.6, impactIntensity * 0.032));

    // Switch back to 3rd-person bird mesh immediately
    if (this.activeBirdMesh) this.activeBirdMesh.visible = true;
    this.fpvBeakRig.group.visible = false;
    this.setWindStreaksVisible(false);

    const burstColor = parseInt(
      BIRD_CONFIGS[this.activeFlightBirdType].accentHex.slice(1),
      16,
    );
    this.spawnBurst(pos, burstColor, 10, 5.5);
    this.emitHud(true);
  }

  private setWindStreaksVisible(visible: boolean) {
    for (const streak of this.windStreaks) {
      streak.visible = visible;
    }
  }

  private updateAimKeys(dt: number) {
    if (this.phase !== 'aiming' && this.phase !== 'charging') return;
    let changed = false;
    if (this.keysPressed.has('ArrowUp') || this.keysPressed.has('KeyW')) {
      this.pitchDeg = THREE.MathUtils.clamp(this.pitchDeg + 38 * dt, 5, 68);
      changed = true;
    }
    if (this.keysPressed.has('ArrowDown') || this.keysPressed.has('KeyS')) {
      this.pitchDeg = THREE.MathUtils.clamp(this.pitchDeg - 38 * dt, 5, 68);
      changed = true;
    }
    if (this.keysPressed.has('ArrowLeft') || this.keysPressed.has('KeyA')) {
      this.yawDeg = THREE.MathUtils.clamp(this.yawDeg - 28 * dt, -22, 22);
      changed = true;
    }
    if (this.keysPressed.has('ArrowRight') || this.keysPressed.has('KeyD')) {
      this.yawDeg = THREE.MathUtils.clamp(this.yawDeg + 28 * dt, -22, 22);
      changed = true;
    }
    if (changed) {
      this.updateTrajectoryPreview();
    }
  }

  private updateCharging(dt: number) {
    if (!this.isCharging || this.phase !== 'charging') return;
    this.chargeTime += dt;
    // Ramp 15% -> 100% smoothly over ~1.05s, then cycle back down/up so player can time exact power
    const chargeSpeed = 0.82;
    this.power += this.chargeDir * chargeSpeed * dt;
    if (this.power >= 1) {
      this.power = 1;
      this.chargeDir = -1;
    } else if (this.power <= 0.18) {
      this.power = 0.18;
      this.chargeDir = 1;
    }
    this.sound.playStretch(this.power);
    this.updateTrajectoryPreview();
  }

  private checkWinOrNextTurn() {
    const alivePigs = this.pigs.filter((p) => !p.destroyed).length;
    if (alivePigs === 0) {
      this.phase = 'won';
      // Unused bird bonus: +10,000 per bird remaining
      this.score += this.birdQueue.length * 10000;
      const par = this.currentLevel.parScore;
      this.starsEarned =
        this.score >= par * 1.4 ? 3 : this.score >= par * 0.9 ? 2 : 1;

      const lvlId = this.currentLevel.id;
      this.bestScores[lvlId] = Math.max(this.bestScores[lvlId] ?? 0, this.score);
      if (this.levelIndex + 2 > this.unlockedLevels) {
        this.unlockedLevels = Math.min(LEVELS.length, this.levelIndex + 2);
      }
      this.saveProgress();
      this.sound.playWinFanfare();
      this.emitHud(true);
      return;
    }

    if (this.birdQueue.length > 0) {
      this.phase = 'aiming';
      this.power = 0.65;
      this.boostAvailable = BIRD_CONFIGS[this.birdQueue[0]].abilityName !== null;
      this.prepareNextBirdInSlingshot();
      this.emitHud(true);
    } else {
      this.phase = 'lost';
      this.sound.playLoseTone();
      this.emitHud(true);
    }
  }

  private updateCamera(dt: number, elapsedSec: number) {
    if (this.phase === 'aiming' || this.phase === 'charging') {
      // Classic Angry Birds side view; subtle pull-in when charging power
      const chargeZoom = this.phase === 'charging' ? this.power * 3.2 : 0;
      _desiredCamPos.set(
        CLASSIC_CAM_POS.x - chargeZoom * 0.6,
        CLASSIC_CAM_POS.y - chargeZoom * 0.15,
        CLASSIC_CAM_POS.z - chargeZoom,
      );
      this.camera.position.lerp(_desiredCamPos, 1 - Math.exp(-6.5 * dt));

      _lookTarget.copy(CLASSIC_CAM_LOOK);
      if (this.phase === 'charging') {
        _lookTarget.x -= this.power * 2.4;
      }
      this.currentLookAt.lerp(_lookTarget, 1 - Math.exp(-7.0 * dt));
      this.camera.lookAt(this.currentLookAt);

      const targetFov = 48;
      if (Math.abs(this.camera.fov - targetFov) > 0.05) {
        this.camera.fov = THREE.MathUtils.damp(this.camera.fov, targetFov, 7, dt);
        this.camera.updateProjectionMatrix();
      }
    } else if (this.phase === 'flight' && this.activeBirdBody) {
      const bp = this.activeBirdBody.position;
      const bv = this.activeBirdBody.velocity;

      _vecA.set(bp.x, bp.y, bp.z);
      _vecB.set(bv.x, bv.y, bv.z);
      const speed = _vecB.length();
      if (speed > 0.2) {
        _vecB.divideScalar(speed);
      } else {
        _vecB.set(1, 0, 0);
      }

      // Smooth swoop from classic side-view into 1st-person bird POV over the first ~0.24s
      const swoopBlend = THREE.MathUtils.clamp(this.flightElapsed / 0.24, 0, 1);
      const smoothSwoop = swoopBlend * swoopBlend * (3 - 2 * swoopBlend);

      // Desired FPV eye position right at the bird's forward crest
      _desiredCamPos.copy(_vecA).addScaledVector(_vecB, 0.36);
      _desiredCamPos.y += 0.14;

      if (smoothSwoop < 0.99) {
        this.camera.position.lerp(_desiredCamPos, 1 - Math.exp(-(12 + smoothSwoop * 18) * dt));
      } else {
        this.camera.position.copy(_desiredCamPos);
      }

      // Look straight down the bird's real-time velocity vector
      _lookTarget.copy(_vecA).addScaledVector(_vecB, 14);
      this.currentLookAt.lerp(_lookTarget, 1 - Math.exp(-16 * dt));
      this.camera.lookAt(this.currentLookAt);

      // Once camera is inside the bird, switch from external sphere to FPV beak framing
      if (smoothSwoop > 0.72) {
        if (this.activeBirdMesh) this.activeBirdMesh.visible = false;
        this.fpvBeakRig.group.visible = true;
        this.setWindStreaksVisible(true);
      }

      // Dynamic FOV widening with speed for intense first-person flight rush
      const targetFov = THREE.MathUtils.clamp(58 + speed * 0.75, 58, 82);
      this.camera.fov = THREE.MathUtils.damp(this.camera.fov, targetFov, 8, dt);
      this.camera.updateProjectionMatrix();

      // Animate wind streaks zooming backward past the bird
      for (let i = 0; i < this.windStreaks.length; i++) {
        const s = this.windStreaks[i];
        s.position.z += (14 + speed * 0.85) * dt;
        if (s.position.z > 0.2) {
          s.position.z = -3.8 - (i % 3) * 0.7;
        }
      }
    } else if (this.phase === 'impact') {
      // Switch clearly back to 3rd-person view framing the falling building and bouncing bird
      const tx = this.currentLevel.targetCenter[0];
      const ty = this.currentLevel.targetCenter[1];
      const tz = this.currentLevel.targetCenter[2];
      _desiredCamPos.set(tx - 6.5, Math.max(7.2, ty + 4.2), tz + 22.5);
      this.camera.position.lerp(_desiredCamPos, 1 - Math.exp(-5.8 * dt));

      _lookTarget.set(tx, Math.max(2.4, ty * 0.85), tz);
      this.currentLookAt.lerp(_lookTarget, 1 - Math.exp(-6.5 * dt));
      this.camera.lookAt(this.currentLookAt);

      this.camera.fov = THREE.MathUtils.damp(this.camera.fov, 48, 6, dt);
      this.camera.updateProjectionMatrix();
    } else if (this.phase === 'won' || this.phase === 'lost') {
      // Gentle scenic orbit around the fortress aftermath
      const angle = elapsedSec * 0.22;
      const cx = this.currentLevel.targetCenter[0];
      const cz = this.currentLevel.targetCenter[2];
      _desiredCamPos.set(
        cx - Math.cos(angle) * 14,
        7.8,
        cz + Math.sin(angle) * 14,
      );
      this.camera.position.lerp(_desiredCamPos, 1 - Math.exp(-2.5 * dt));
      this.currentLookAt.lerp(
        _lookTarget.set(cx, 2.4, cz),
        1 - Math.exp(-3.5 * dt),
      );
      this.camera.lookAt(this.currentLookAt);
    }

    // Apply decaying camera shake
    if (this.cameraShake > 0.005) {
      this.camera.position.x += (Math.random() - 0.5) * this.cameraShake;
      this.camera.position.y += (Math.random() - 0.5) * this.cameraShake;
      this.cameraShake = THREE.MathUtils.damp(this.cameraShake, 0, 10, dt);
    }
  }

  private areFortressBodiesSettled(): boolean {
    const thresholdSq = 0.28;
    for (const b of this.blocks) {
      if (!b.destroyed && b.body.velocity.lengthSquared() > thresholdSq) {
        return false;
      }
    }
    for (const p of this.pigs) {
      if (!p.destroyed && p.body.velocity.lengthSquared() > thresholdSq) {
        return false;
      }
    }
    return true;
  }

  private loop = () => {
    if (this.disposed) return;

    const nowMs = performance.now();
    const rawDt = (nowMs - this.lastTimeMs) / 1000;
    this.lastTimeMs = nowMs;
    const dt = Math.min(0.05, Math.max(0.001, rawDt));
    const realDt = Math.min(0.15, Math.max(0.001, rawDt));
    const elapsedSec = nowMs * 0.001;

    this.updateAimKeys(dt);
    this.updateCharging(dt);

    // Step physics world and flush queued collision destructions safely afterwards
    this.world.step(1 / 60, dt, 4);
    this.flushPendingPhysicsEvents();

    // Sync active bird in slingshot or physics flight
    if ((this.phase === 'aiming' || this.phase === 'charging') && this.activeBirdMesh) {
      const pullPos = this.computePullbackPosition(_vecA);
      this.activeBirdMesh.position.copy(pullPos);
      // Point bird along launch direction
      const vel = this.computeLaunchVelocity(_vecB);
      this.activeBirdMesh.lookAt(
        pullPos.x + vel.x,
        pullPos.y + vel.y,
        pullPos.z + vel.z,
      );
      // Since createBirdModel faces +X, rotate Y by -PI/2 after lookAt (+Z forward)
      this.activeBirdMesh.rotateY(-Math.PI / 2);
      this.slingshot.updateBands(pullPos);

      // Gentle hop animation on waiting birds
      for (let i = 0; i < this.waitingBirdMeshes.length; i++) {
        const w = this.waitingBirdMeshes[i];
        const waitType = this.birdQueue[i + 1] ?? 'red';
        const waitR = BIRD_CONFIGS[waitType].radius;
        w.position.y = waitR * 0.88 + Math.abs(Math.sin(elapsedSec * 3.2 + i * 1.4)) * 0.16;
      }
    } else if ((this.phase === 'flight' || this.phase === 'impact') && this.activeBirdBody && this.activeBirdMesh) {
      const bp = this.activeBirdBody.position;
      const bv = this.activeBirdBody.velocity;
      this.activeBirdMesh.position.set(bp.x, bp.y, bp.z);
      this.activeBirdMesh.quaternion.set(
        this.activeBirdBody.quaternion.x,
        this.activeBirdBody.quaternion.y,
        this.activeBirdBody.quaternion.z,
        this.activeBirdBody.quaternion.w,
      );

      // Sync any split clone birds (The Blues)
      for (const extra of this.extraFlightBirds) {
        extra.mesh.position.set(extra.body.position.x, extra.body.position.y, extra.body.position.z);
        extra.mesh.quaternion.set(
          extra.body.quaternion.x,
          extra.body.quaternion.y,
          extra.body.quaternion.z,
          extra.body.quaternion.w,
        );
      }

      if (this.phase === 'flight') {
        this.flightElapsed += realDt;
        const speedSq = bv.x * bv.x + bv.y * bv.y + bv.z * bv.z;
        // Safety fallback: switch to 3rd-person impact if bird stalls, lands, or leaves arena
        if (
          bp.y < -4 ||
          bp.x > 65 ||
          bp.x < -45 ||
          Math.abs(bp.z) > 45 ||
          this.flightElapsed > 6.0 ||
          (this.flightElapsed > 0.42 && speedSq < 16)
        ) {
          this.wakeAllFortressBodies();
          this.enterImpactPhase(new THREE.Vector3(bp.x, Math.max(0.5, bp.y), bp.z), 4.5);
        }
      } else if (this.phase === 'impact') {
        this.impactElapsed += realDt;
        // Black Bomb bird auto-detonates shortly after impact if not already detonated!
        if (
          this.activeFlightBirdType === 'black' &&
          !this.blackBombDetonated &&
          this.impactElapsed > 0.45
        ) {
          this.blackBombDetonated = true;
          this.boostAvailable = false;
          this.detonateExplosion(new THREE.Vector3(bp.x, bp.y, bp.z), 9.2, 36);
        }
        const settled = this.impactElapsed > 1.45 && this.areFortressBodiesSettled();
        if (settled || this.impactElapsed > 3.1) {
          this.checkWinOrNextTurn();
        }
      }
    }

    // Sync blocks
    for (const b of this.blocks) {
      if (b.destroyed) continue;
      b.mesh.position.set(b.body.position.x, b.body.position.y, b.body.position.z);
      b.mesh.quaternion.set(
        b.body.quaternion.x,
        b.body.quaternion.y,
        b.body.quaternion.z,
        b.body.quaternion.w,
      );
    }

    // Sync pigs & out-of-bounds defeat
    for (const p of this.pigs) {
      if (p.destroyed) continue;
      p.mesh.position.set(p.body.position.x, p.body.position.y, p.body.position.z);
      p.mesh.quaternion.set(
        p.body.quaternion.x,
        p.body.quaternion.y,
        p.body.quaternion.z,
        p.body.quaternion.w,
      );
      if (p.body.position.y < -3 || Math.abs(p.body.position.x) > 55 || Math.abs(p.body.position.z) > 45) {
        this.damagePig(p, 999);
      }
    }

    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const pt = this.particles[i];
      pt.life += dt;
      if (pt.life >= pt.maxLife) {
        this.scene.remove(pt.mesh);
        (pt.mesh.material as THREE.Material).dispose();
        this.particles.splice(i, 1);
        continue;
      }
      pt.vel.y += GRAVITY_Y * pt.gravityScale * dt;
      pt.mesh.position.addScaledVector(pt.vel, dt);
      pt.mesh.rotation.x += pt.rotVel.x * dt;
      pt.mesh.rotation.y += pt.rotVel.y * dt;
      const alpha = 1 - pt.life / pt.maxLife;
      (pt.mesh.material as THREE.MeshStandardMaterial).opacity = alpha;
    }

    this.updateCamera(dt, elapsedSec);

    if (nowMs - this.lastHudPush > 48) {
      this.emitHud(false);
      this.lastHudPush = nowMs;
    }

    this.renderer.render(this.scene, this.camera);

    if (this.isSoftwareGl) {
      this.afterDraw(this.loop);
    } else {
      this.frameId = requestAnimationFrame(this.loop);
    }
  };

  private afterDraw(cb: () => void) {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (this.disposed) return;
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 80);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }

  private emitHud(force: boolean) {
    if (!force && this.disposed) return;
    let speedMps = 0;
    let altitudeM = 0;
    let distanceToTargetM = 0;

    const tx = this.currentLevel.targetCenter[0];
    const ty = this.currentLevel.targetCenter[1];
    const tz = this.currentLevel.targetCenter[2];

    if (this.activeBirdBody) {
      const v = this.activeBirdBody.velocity;
      const p = this.activeBirdBody.position;
      speedMps = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
      altitudeM = Math.max(0, p.y);
      distanceToTargetM = Math.sqrt(
        (tx - p.x) * (tx - p.x) + (ty - p.y) * (ty - p.y) + (tz - p.z) * (tz - p.z),
      );
    } else {
      altitudeM = SLINGSHOT_ANCHOR.y;
      distanceToTargetM = Math.sqrt(
        (tx - SLINGSHOT_ANCHOR.x) * (tx - SLINGSHOT_ANCHOR.x) +
          (tz - SLINGSHOT_ANCHOR.z) * (tz - SLINGSHOT_ANCHOR.z),
      );
    }

    const activeBird =
      this.phase === 'flight' || this.phase === 'impact'
        ? this.activeFlightBirdType
        : this.currentBirdType;

    this.onHudUpdate({
      levelIndex: this.levelIndex,
      levelName: this.currentLevel.name,
      levelSubtitle: this.currentLevel.subtitle,
      phase: this.phase,
      power: this.power,
      pitchDeg: Math.round(this.pitchDeg),
      yawDeg: Math.round(this.yawDeg),
      currentBird: activeBird,
      birdQueue: [...this.birdQueue],
      birdsLeft: this.birdQueue.length,
      totalBirds: this.currentLevel.birds.length,
      pigsLeft: this.pigs.filter((p) => !p.destroyed).length,
      totalPigs: this.currentLevel.pigs.length,
      score: this.score,
      speedMps: Number(speedMps.toFixed(1)),
      altitudeM: Number(altitudeM.toFixed(1)),
      distanceToTargetM: Number(distanceToTargetM.toFixed(1)),
      boostAvailable: this.boostAvailable,
      starsEarned: this.starsEarned,
      unlockedLevels: this.unlockedLevels,
      bestScores: { ...this.bestScores },
      isMuted: this.sound.muted,
    });
  }

  public dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);

    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    this.renderer.domElement.removeEventListener('pointerdown', this.handlePointerDown);
    window.removeEventListener('pointermove', this.handlePointerMove);
    window.removeEventListener('pointerup', this.handlePointerUp);

    this.clearLevelEntities();
    this.textures.dispose();
    this.particleGeo.dispose();
    Object.values(this.blockMaterials).forEach((m) => m.dispose());

    this.renderer.dispose();
    if (this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
