export type BlockMaterial = 'wood' | 'ice' | 'stone';

export type BirdType = 'red' | 'yellow' | 'blue' | 'black' | 'big';

export interface BirdConfig {
  type: BirdType;
  name: string;
  abilityName: string | null;
  abilityHint: string;
  radius: number;
  mass: number;
  woodMultiplier: number;
  iceMultiplier: number;
  stoneMultiplier: number;
  accentHex: string;
}

export const BIRD_CONFIGS: Record<BirdType, BirdConfig> = {
  red: {
    type: 'red',
    name: 'Red',
    abilityName: null,
    abilityHint: 'Classic balanced striker—no mid-air ability.',
    radius: 0.56,
    mass: 7.2,
    woodMultiplier: 1.0,
    iceMultiplier: 1.0,
    stoneMultiplier: 1.0,
    accentHex: '#ef4444',
  },
  yellow: {
    type: 'yellow',
    name: 'Chuck (Speed)',
    abilityName: 'Turbo Dash',
    abilityHint: 'Press Space mid-air to rocket forward & shred wood.',
    radius: 0.52,
    mass: 6.4,
    woodMultiplier: 2.2,
    iceMultiplier: 1.1,
    stoneMultiplier: 0.9,
    accentHex: '#facc15',
  },
  blue: {
    type: 'blue',
    name: 'The Blues (Split)',
    abilityName: 'Triple Split',
    abilityHint: 'Press Space mid-air to split into 3 birds & shatter glass.',
    radius: 0.44,
    mass: 4.8,
    woodMultiplier: 0.85,
    iceMultiplier: 2.6,
    stoneMultiplier: 0.75,
    accentHex: '#38bdf8',
  },
  black: {
    type: 'black',
    name: 'Bomb',
    abilityName: 'Mega Blast',
    abilityHint: 'Press Space mid-air (or hit target) for a huge explosion.',
    radius: 0.66,
    mass: 9.2,
    woodMultiplier: 1.2,
    iceMultiplier: 1.2,
    stoneMultiplier: 1.8,
    accentHex: '#f97316',
  },
  big: {
    type: 'big',
    name: 'Terence (Heavy)',
    abilityName: 'Heavy Smash',
    abilityHint: 'Massive weight crushes stone; press Space to slam down.',
    radius: 0.88,
    mass: 16.5,
    woodMultiplier: 2.0,
    iceMultiplier: 2.0,
    stoneMultiplier: 2.1,
    accentHex: '#991b1b',
  },
};

export interface BlockSpec {
  x: number;
  y: number; // Bottom-center Y coordinate (0 = ground level)
  z: number;
  w: number;
  h: number;
  d: number;
  material: BlockMaterial;
  rotY?: number;
}

export interface PigSpec {
  x: number;
  y: number; // Bottom-center Y coordinate (0 = ground level)
  z: number;
  radius?: number;
  isKing?: boolean;
}

export interface LevelDefinition {
  id: number;
  name: string;
  subtitle: string;
  birds: BirdType[];
  parScore: number;
  targetCenter: [number, number, number];
  blocks: BlockSpec[];
  pigs: PigSpec[];
}

export type GamePhase =
  | 'aiming'
  | 'charging'
  | 'flight'
  | 'impact'
  | 'won'
  | 'lost';

export interface GameHudState {
  levelIndex: number;
  levelName: string;
  levelSubtitle: string;
  phase: GamePhase;
  power: number; // 0 to 1
  pitchDeg: number;
  yawDeg: number;
  currentBird: BirdType;
  birdQueue: BirdType[];
  birdsLeft: number;
  totalBirds: number;
  pigsLeft: number;
  totalPigs: number;
  score: number;
  speedMps: number;
  altitudeM: number;
  distanceToTargetM: number;
  boostAvailable: boolean;
  starsEarned: number;
  unlockedLevels: number;
  bestScores: Record<number, number>;
  isMuted: boolean;
}
