import * as THREE from 'three';
import { BIRD_CONFIGS, BirdType } from './types';
import { ProceduralTextureSet } from './textures';

export interface SlingshotRig {
  group: THREE.Group;
  leftBand: THREE.Mesh;
  rightBand: THREE.Mesh;
  pouch: THREE.Mesh;
  leftTipLocal: THREE.Vector3;
  rightTipLocal: THREE.Vector3;
  updateBands: (pouchWorldPos: THREE.Vector3) => void;
}

export function createBirdModel(type: BirdType = 'red'): THREE.Group {
  const group = new THREE.Group();
  const radius = BIRD_CONFIGS[type].radius;

  const bodyColorMap: Record<BirdType, number> = {
    red: 0xdc2626,
    yellow: 0xfacc15,
    blue: 0x38bdf8,
    black: 0x1f2937,
    big: 0x991b1b,
  };
  const bellyColorMap: Record<BirdType, number> = {
    red: 0xfef3c7,
    yellow: 0xfef9c3,
    blue: 0xe0f2fe,
    black: 0x6b7280,
    big: 0xfde68a,
  };

  const bodyMat = new THREE.MeshStandardMaterial({
    color: bodyColorMap[type],
    roughness: type === 'black' ? 0.56 : 0.44,
    metalness: type === 'black' ? 0.12 : 0.05,
  });
  const bellyMat = new THREE.MeshStandardMaterial({
    color: bellyColorMap[type],
    roughness: 0.72,
    metalness: 0.0,
  });
  const blackMat = new THREE.MeshStandardMaterial({
    color: 0x111827,
    roughness: 0.35,
    metalness: 0.1,
  });
  const whiteMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.2,
    metalness: 0.0,
  });
  const beakMat = new THREE.MeshStandardMaterial({
    color: type === 'yellow' ? 0xea580c : 0xf59e0b,
    roughness: 0.32,
    metalness: 0.08,
  });

  // 1. Primary body hull (Yellow Chuck has a sleek triangular cone-like profile!)
  if (type === 'yellow') {
    const body = new THREE.Mesh(
      new THREE.ConeGeometry(radius * 1.05, radius * 2.1, 4),
      bodyMat,
    );
    body.rotation.y = Math.PI / 4;
    body.scale.set(1.1, 1.0, 0.92);
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);
  } else {
    const body = new THREE.Mesh(new THREE.SphereGeometry(radius, 24, 20), bodyMat);
    if (type === 'big') {
      body.scale.set(1.06, 1.02, 1.08);
    }
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);
  }

  // 2. Belly patch (lower front)
  const belly = new THREE.Mesh(
    new THREE.SphereGeometry(radius * 0.7, 16, 12),
    bellyMat,
  );
  belly.position.set(radius * 0.24, -radius * 0.32, 0);
  belly.scale.set(0.82, 0.75, 0.88);
  group.add(belly);

  // 3-4. Eyes (left & right facing +X)
  const eyeScale = type === 'blue' ? 1.15 : type === 'big' ? 0.88 : 1.0;
  const eyeGeo = new THREE.SphereGeometry(radius * 0.22 * eyeScale, 14, 12);
  const pupilGeo = new THREE.SphereGeometry(radius * 0.1 * eyeScale, 10, 8);
  const eyeForwardX = type === 'yellow' ? radius * 0.56 : radius * 0.78;
  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(eyeGeo, whiteMat);
    eye.position.set(eyeForwardX, radius * 0.14, side * radius * 0.28);
    group.add(eye);

    const pupil = new THREE.Mesh(pupilGeo, blackMat);
    pupil.position.set(eyeForwardX + radius * 0.18, radius * 0.14, side * radius * 0.29);
    group.add(pupil);

    // 5-6. Expressive eyebrows (extra thick on Big Terence, arched on Black)
    const browThickness = type === 'big' ? 0.18 : type === 'blue' ? 0.08 : 0.12;
    const brow = new THREE.Mesh(
      new THREE.BoxGeometry(radius * 0.16, radius * browThickness, radius * 0.42),
      type === 'yellow' ? new THREE.MeshStandardMaterial({ color: 0x713f12, roughness: 0.5 }) : blackMat,
    );
    brow.position.set(eyeForwardX + radius * 0.1, radius * 0.37, side * radius * 0.26);
    brow.rotation.x = side * (type === 'big' ? -0.45 : -0.35);
    group.add(brow);
  }

  // 7-8. Upper & lower orange beak pointing +X
  const beakX = type === 'yellow' ? radius * 0.92 : radius * 1.1;
  const upperBeak = new THREE.Mesh(
    new THREE.ConeGeometry(radius * 0.22, radius * 0.52, 8),
    beakMat,
  );
  upperBeak.rotation.z = -Math.PI / 2;
  upperBeak.position.set(beakX, radius * 0.02, 0);
  upperBeak.castShadow = true;
  group.add(upperBeak);

  const lowerBeak = new THREE.Mesh(
    new THREE.ConeGeometry(radius * 0.16, radius * 0.38, 8),
    beakMat,
  );
  lowerBeak.rotation.z = -Math.PI / 2 - 0.18;
  lowerBeak.position.set(beakX - radius * 0.06, -radius * 0.12, 0);
  group.add(lowerBeak);

  // 9. Variant-specific Top Crest or Bomb Fuse!
  if (type === 'black') {
    // Forehead orange spot
    const spot = new THREE.Mesh(
      new THREE.SphereGeometry(radius * 0.14, 10, 8),
      new THREE.MeshStandardMaterial({ color: 0x9ca3af, roughness: 0.6 }),
    );
    spot.position.set(radius * 0.72, radius * 0.54, 0);
    spot.scale.set(0.6, 0.9, 1.1);
    group.add(spot);

    // Fuse stem + glowing spark tip
    const fuse = new THREE.Mesh(
      new THREE.CylinderGeometry(radius * 0.06, radius * 0.07, radius * 0.42, 8),
      new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.8 }),
    );
    fuse.position.set(-radius * 0.05, radius * 1.12, 0);
    fuse.rotation.z = 0.2;
    group.add(fuse);

    const spark = new THREE.Mesh(
      new THREE.OctahedronGeometry(radius * 0.15, 0),
      new THREE.MeshStandardMaterial({
        color: 0xf97316,
        emissive: 0xfb923c,
        emissiveIntensity: 1.4,
        roughness: 0.2,
      }),
    );
    spark.position.set(-radius * 0.1, radius * 1.36, 0);
    group.add(spark);
  } else {
    const crestMat = type === 'yellow' ? blackMat : bodyMat;
    const crest1 = new THREE.Mesh(
      new THREE.CapsuleGeometry(radius * 0.09, radius * 0.28, 4, 8),
      crestMat,
    );
    crest1.position.set(-radius * 0.05, radius * 1.02, 0);
    crest1.rotation.z = 0.35;
    group.add(crest1);

    const crest2 = new THREE.Mesh(
      new THREE.CapsuleGeometry(radius * 0.07, radius * 0.2, 4, 8),
      crestMat,
    );
    crest2.position.set(-radius * 0.22, radius * 0.94, 0);
    crest2.rotation.z = 0.65;
    group.add(crest2);
  }

  // 10. Black tail feathers at -X
  for (let i = -1; i <= 1; i++) {
    const tail = new THREE.Mesh(
      new THREE.BoxGeometry(radius * 0.48, radius * 0.09, radius * 0.14),
      blackMat,
    );
    tail.position.set(-radius * 1.02, i * radius * 0.12, 0);
    tail.rotation.z = i * 0.24;
    group.add(tail);
  }

  return group;
}

export interface FpvBeakRigHandle {
  group: THREE.Group;
  setBirdType: (type: BirdType) => void;
}

export function createFpvBeakRig(): FpvBeakRigHandle {
  const rig = new THREE.Group();

  const beakMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    roughness: 0.3,
    metalness: 0.08,
  });
  const crestMat = new THREE.MeshStandardMaterial({
    color: 0xb91c1c,
    roughness: 0.5,
  });
  const browMat = new THREE.MeshStandardMaterial({
    color: 0x111827,
    roughness: 0.4,
  });

  // Lower-center forward-pointing beak visible in first-person flight
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.42, 8), beakMat);
  beak.rotation.x = -Math.PI / 2 + 0.14;
  beak.position.set(0, -0.34, -0.58);
  rig.add(beak);

  // Subtle furrowed brow edge at top corners for bird embodiment
  for (const side of [-1, 1]) {
    const brow = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.045, 0.08), browMat);
    brow.position.set(side * 0.26, 0.32, -0.56);
    brow.rotation.z = side * 0.25;
    rig.add(brow);
  }

  const crestTip = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.18, 6), crestMat);
  crestTip.position.set(0, 0.38, -0.52);
  crestTip.rotation.x = -0.5;
  rig.add(crestTip);

  rig.visible = false;

  const setBirdType = (type: BirdType) => {
    const colorMap: Record<BirdType, number> = {
      red: 0xb91c1c,
      yellow: 0xfacc15,
      blue: 0x38bdf8,
      black: 0x1f2937,
      big: 0x7f1d1d,
    };
    crestMat.color.setHex(colorMap[type]);
    beakMat.color.setHex(type === 'yellow' ? 0xea580c : 0xf59e0b);
    const scale = type === 'big' ? 1.25 : type === 'blue' ? 0.85 : 1.0;
    beak.scale.setScalar(scale);
  };

  return { group: rig, setBirdType };
}

export function createPigModel(radius = 0.7, isKing = false): THREE.Group {
  const group = new THREE.Group();

  const skinMat = new THREE.MeshStandardMaterial({
    color: 0x65a30d,
    roughness: 0.38,
    metalness: 0.06,
  });
  const snoutMat = new THREE.MeshStandardMaterial({
    color: 0xa3e635,
    roughness: 0.35,
    metalness: 0.04,
  });
  const darkMat = new THREE.MeshStandardMaterial({
    color: 0x14532d,
    roughness: 0.4,
  });
  const whiteMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.2,
  });
  const pupilMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.2,
  });

  // 1. Spherical pig body
  const body = new THREE.Mesh(new THREE.SphereGeometry(radius, 22, 18), skinMat);
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  // Pig faces -X (toward incoming player bird!)
  // 2. Protruding snout
  const snout = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.36, radius * 0.4, radius * 0.34, 16),
    snoutMat,
  );
  snout.rotation.z = Math.PI / 2;
  snout.position.set(-radius * 0.92, -radius * 0.04, 0);
  snout.scale.set(1, 1, 1.25);
  group.add(snout);

  // 3-4. Nostrils
  const nostrilGeo = new THREE.SphereGeometry(radius * 0.085, 8, 8);
  for (const side of [-1, 1]) {
    const nostril = new THREE.Mesh(nostrilGeo, darkMat);
    nostril.position.set(-radius * 1.1, -radius * 0.04, side * radius * 0.16);
    group.add(nostril);

    // 5-6. Goofy wide eyes
    const eye = new THREE.Mesh(
      new THREE.SphereGeometry(radius * 0.2, 12, 10),
      whiteMat,
    );
    eye.position.set(-radius * 0.78, radius * 0.22, side * radius * 0.42);
    group.add(eye);

    const pupil = new THREE.Mesh(
      new THREE.SphereGeometry(radius * 0.08, 10, 8),
      pupilMat,
    );
    pupil.position.set(-radius * 0.95, radius * 0.22, side * radius * 0.44);
    group.add(pupil);

    // 7-8. Ears
    const ear = new THREE.Mesh(
      new THREE.SphereGeometry(radius * 0.2, 10, 10),
      skinMat,
    );
    ear.position.set(-radius * 0.1, radius * 0.82, side * radius * 0.56);
    ear.scale.set(0.65, 1.1, 0.9);
    group.add(ear);
  }

  // 9. Grinning mouth
  const mouth = new THREE.Mesh(
    new THREE.TorusGeometry(radius * 0.2, radius * 0.04, 6, 12, Math.PI),
    darkMat,
  );
  mouth.position.set(-radius * 0.85, -radius * 0.34, 0);
  mouth.rotation.y = -Math.PI / 2;
  mouth.rotation.z = Math.PI;
  group.add(mouth);

  // 10. Optional Golden Crown for King Pig (Level 5)
  if (isKing) {
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      roughness: 0.22,
      metalness: 0.88,
    });
    const rubyMat = new THREE.MeshStandardMaterial({
      color: 0xe11d48,
      roughness: 0.18,
      metalness: 0.2,
    });

    const crownGroup = new THREE.Group();
    crownGroup.position.set(0, radius * 0.98, 0);

    const band = new THREE.Mesh(
      new THREE.CylinderGeometry(radius * 0.46, radius * 0.42, radius * 0.34, 16),
      goldMat,
    );
    crownGroup.add(band);

    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2;
      const spike = new THREE.Mesh(
        new THREE.ConeGeometry(radius * 0.12, radius * 0.32, 6),
        goldMat,
      );
      spike.position.set(
        Math.cos(angle) * radius * 0.36,
        radius * 0.28,
        Math.sin(angle) * radius * 0.36,
      );
      crownGroup.add(spike);
    }

    const jewel = new THREE.Mesh(
      new THREE.OctahedronGeometry(radius * 0.12, 0),
      rubyMat,
    );
    jewel.position.set(-radius * 0.46, 0, 0);
    crownGroup.add(jewel);

    group.add(crownGroup);
  }

  return group;
}

export function createSlingshotModel(textures: ProceduralTextureSet): SlingshotRig {
  const group = new THREE.Group();
  const basePos = new THREE.Vector3(-16, 0, 0);
  group.position.copy(basePos);

  const barkMat = new THREE.MeshStandardMaterial({
    map: textures.bark,
    roughness: 0.82,
    metalness: 0.02,
  });
  const bandMat = new THREE.MeshStandardMaterial({
    color: 0x3b1d0a,
    roughness: 0.55,
    metalness: 0.05,
  });
  const pouchMat = new THREE.MeshStandardMaterial({
    color: 0x451a03,
    roughness: 0.72,
  });

  // 1. Grounded stone plinth / root mount
  const mound = new THREE.Mesh(
    new THREE.CylinderGeometry(0.85, 1.15, 0.35, 16),
    new THREE.MeshStandardMaterial({ color: 0x57534e, roughness: 0.9 }),
  );
  mound.position.set(0, 0.175, 0);
  mound.receiveShadow = true;
  group.add(mound);

  // 2. Main vertical trunk
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.38, 2.0, 14), barkMat);
  trunk.position.set(0, 1.15, 0);
  trunk.castShadow = true;
  trunk.receiveShadow = true;
  group.add(trunk);

  // 3-4. Left & right angled Y-fork branches
  const leftTipLocal = new THREE.Vector3(0, 3.45, -0.78);
  const rightTipLocal = new THREE.Vector3(0, 3.45, 0.78);

  const makeBranch = (target: THREE.Vector3) => {
    const start = new THREE.Vector3(0, 1.95, 0);
    const dir = target.clone().sub(start);
    const len = dir.length();
    const branch = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.24, len, 12), barkMat);
    branch.position.copy(start).addScaledVector(dir, 0.5);
    branch.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
    branch.castShadow = true;
    return branch;
  };
  group.add(makeBranch(leftTipLocal));
  group.add(makeBranch(rightTipLocal));

  // 5. Leather pouch & elastic rubber bands
  const bandGeo = new THREE.CylinderGeometry(0.065, 0.065, 1, 8);
  const leftBand = new THREE.Mesh(bandGeo, bandMat);
  const rightBand = new THREE.Mesh(bandGeo, bandMat);
  leftBand.castShadow = true;
  rightBand.castShadow = true;
  group.add(leftBand, rightBand);

  const pouch = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.42, 0.48), pouchMat);
  pouch.castShadow = true;
  group.add(pouch);

  const _up = new THREE.Vector3(0, 1, 0);
  const _diff = new THREE.Vector3();
  const _pouchLocal = new THREE.Vector3();

  const updateBands = (pouchWorldPos: THREE.Vector3) => {
    _pouchLocal.copy(pouchWorldPos).sub(basePos);
    pouch.position.copy(_pouchLocal);

    const updateOne = (band: THREE.Mesh, tip: THREE.Vector3) => {
      _diff.copy(_pouchLocal).sub(tip);
      const len = Math.max(0.05, _diff.length());
      band.position.copy(tip).addScaledVector(_diff, 0.5);
      band.scale.set(1, len, 1);
      band.quaternion.setFromUnitVectors(_up, _diff.normalize());
    };
    updateOne(leftBand, leftTipLocal);
    updateOne(rightBand, rightTipLocal);
  };

  updateBands(new THREE.Vector3(-16, 3.45, 0));

  return {
    group,
    leftBand,
    rightBand,
    pouch,
    leftTipLocal,
    rightTipLocal,
    updateBands,
  };
}

export function createEnvironmentScenery(
  scene: THREE.Scene,
  textures: ProceduralTextureSet,
): THREE.Group {
  const envGroup = new THREE.Group();

  // Expansive meadow ground extending well into the horizon fog
  const groundGeo = new THREE.PlaneGeometry(360, 360);
  const groundMat = new THREE.MeshStandardMaterial({
    map: textures.grass,
    roughness: 0.92,
    metalness: 0.0,
  });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  envGroup.add(ground);

  // Subtle dirt launch lane strip so player sees the trajectory corridor
  const lane = new THREE.Mesh(
    new THREE.PlaneGeometry(58, 12),
    new THREE.MeshStandardMaterial({
      color: 0x8d6e4c,
      roughness: 0.95,
      metalness: 0.0,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    }),
  );
  lane.rotation.x = -Math.PI / 2;
  lane.position.set(2, 0.015, 0);
  lane.receiveShadow = true;
  envGroup.add(lane);

  // Natural rolling perimeter hills framing the valley (no indoor box walls!)
  const hillMat = new THREE.MeshStandardMaterial({
    color: 0x4d8b31,
    roughness: 0.9,
    metalness: 0.0,
  });
  const hillSpecs: [number, number, number, number][] = [
    [-42, -38, 18, 8],
    [0, -48, 24, 10],
    [44, -42, 22, 11],
    [68, -12, 24, 12],
    [66, 26, 20, 9],
    [-46, 34, 16, 7],
    [16, 52, 26, 9],
  ];
  for (const [hx, hz, radius, height] of hillSpecs) {
    const hill = new THREE.Mesh(new THREE.SphereGeometry(radius, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), hillMat);
    hill.position.set(hx, -0.2, hz);
    hill.scale.set(1.25, height / radius, 1.0);
    hill.receiveShadow = true;
    envGroup.add(hill);
  }

  // Stylized multi-part perimeter trees (grounded at y = 0)
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6d4528, roughness: 0.88 });
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x2f7d32, roughness: 0.78 });
  const treeCoords: [number, number, number][] = [
    [-28, -16, 1.0],
    [-22, -22, 1.25],
    [-8, -24, 0.95],
    [8, -26, 1.15],
    [28, -24, 1.3],
    [36, -15, 1.05],
    [38, 14, 1.2],
    [26, 24, 0.95],
    [-12, 25, 1.1],
    [-29, 18, 1.15],
  ];
  for (const [tx, tz, sc] of treeCoords) {
    const tree = new THREE.Group();
    tree.position.set(tx, 0, tz);
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.32 * sc, 0.45 * sc, 2.6 * sc, 8), trunkMat);
    trunk.position.y = 1.3 * sc;
    trunk.castShadow = true;
    tree.add(trunk);

    const tier1 = new THREE.Mesh(new THREE.ConeGeometry(1.9 * sc, 3.2 * sc, 10), leafMat);
    tier1.position.y = 3.6 * sc;
    tier1.castShadow = true;
    tree.add(tier1);

    const tier2 = new THREE.Mesh(new THREE.ConeGeometry(1.35 * sc, 2.5 * sc, 10), leafMat);
    tier2.position.y = 5.3 * sc;
    tier2.castShadow = true;
    tree.add(tier2);

    envGroup.add(tree);
  }

  // Fluffy low-poly cloud clusters high in the sky
  const cloudMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.95,
    metalness: 0.0,
  });
  const cloudCoords: [number, number, number, number][] = [
    [-14, 21, -28, 1.2],
    [12, 24, -34, 1.5],
    [36, 19, -22, 1.1],
    [45, 23, 18, 1.3],
    [-24, 22, 22, 1.1],
  ];
  for (const [cx, cy, cz, sc] of cloudCoords) {
    const cloud = new THREE.Group();
    cloud.position.set(cx, cy, cz);
    const puffs = [
      [0, 0, 0, 2.1],
      [1.8, -0.3, 0.2, 1.55],
      [-1.7, -0.35, -0.1, 1.6],
      [0.4, 0.9, 0.1, 1.4],
    ];
    for (const [px, py, pz, pr] of puffs) {
      const puff = new THREE.Mesh(new THREE.SphereGeometry(pr * sc, 12, 10), cloudMat);
      puff.position.set(px * sc, py * sc, pz * sc);
      cloud.add(puff);
    }
    envGroup.add(cloud);
  }

  scene.add(envGroup);
  return envGroup;
}
