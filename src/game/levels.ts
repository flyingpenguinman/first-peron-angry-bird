import { LevelDefinition } from './types';

export const LEVELS: LevelDefinition[] = [
  {
    id: 1,
    name: 'Timber Hut',
    subtitle: 'Hold Space to charge power, release to fly first-person into the hut.',
    birds: ['red', 'red'],
    parScore: 6000,
    targetCenter: [16, 2.2, 0],
    blocks: [
      { x: 14.5, y: 0, z: -1.6, w: 0.7, h: 3.0, d: 0.7, material: 'wood' },
      { x: 14.5, y: 0, z: 1.6, w: 0.7, h: 3.0, d: 0.7, material: 'wood' },
      { x: 17.5, y: 0, z: -1.6, w: 0.7, h: 3.0, d: 0.7, material: 'wood' },
      { x: 17.5, y: 0, z: 1.6, w: 0.7, h: 3.0, d: 0.7, material: 'wood' },
      { x: 14.5, y: 0, z: 0, w: 0.45, h: 2.2, d: 2.3, material: 'ice' },
      { x: 16.0, y: 3.0, z: -1.6, w: 4.2, h: 0.55, d: 0.9, material: 'wood' },
      { x: 16.0, y: 3.0, z: 1.6, w: 4.2, h: 0.55, d: 0.9, material: 'wood' },
      { x: 16.0, y: 3.55, z: 0, w: 3.8, h: 0.45, d: 4.2, material: 'wood' },
      { x: 16.0, y: 4.0, z: 0, w: 1.4, h: 1.1, d: 1.4, material: 'ice' },
    ],
    pigs: [
      { x: 16.1, y: 0, z: 0, radius: 0.75 },
    ],
  },
  {
    id: 2,
    name: 'Twin Towers',
    subtitle: 'Meet Chuck (Yellow): press Space mid-flight for Turbo Dash through wood!',
    birds: ['red', 'yellow', 'red'],
    parScore: 12000,
    targetCenter: [17, 3.0, 0],
    blocks: [
      // Left-Z Tower
      { x: 16.0, y: 0, z: -3.5, w: 0.7, h: 3.2, d: 0.7, material: 'wood' },
      { x: 18.4, y: 0, z: -3.5, w: 0.7, h: 3.2, d: 0.7, material: 'wood' },
      { x: 16.0, y: 0, z: -1.7, w: 0.7, h: 3.2, d: 0.7, material: 'wood' },
      { x: 18.4, y: 0, z: -1.7, w: 0.7, h: 3.2, d: 0.7, material: 'wood' },
      { x: 17.2, y: 3.2, z: -2.6, w: 3.4, h: 0.5, d: 2.8, material: 'wood' },
      { x: 16.3, y: 3.7, z: -2.6, w: 0.55, h: 2.2, d: 1.8, material: 'ice' },
      { x: 18.1, y: 3.7, z: -2.6, w: 0.55, h: 2.2, d: 1.8, material: 'ice' },
      { x: 17.2, y: 5.9, z: -2.6, w: 2.8, h: 0.45, d: 2.2, material: 'wood' },

      // Right-Z Tower
      { x: 16.0, y: 0, z: 1.7, w: 0.7, h: 3.2, d: 0.7, material: 'wood' },
      { x: 18.4, y: 0, z: 1.7, w: 0.7, h: 3.2, d: 0.7, material: 'wood' },
      { x: 16.0, y: 0, z: 3.5, w: 0.7, h: 3.2, d: 0.7, material: 'wood' },
      { x: 18.4, y: 0, z: 3.5, w: 0.7, h: 3.2, d: 0.7, material: 'wood' },
      { x: 17.2, y: 3.2, z: 2.6, w: 3.4, h: 0.5, d: 2.8, material: 'wood' },
      { x: 16.3, y: 3.7, z: 2.6, w: 0.55, h: 2.2, d: 1.8, material: 'ice' },
      { x: 18.1, y: 3.7, z: 2.6, w: 0.55, h: 2.2, d: 1.8, material: 'ice' },
      { x: 17.2, y: 5.9, z: 2.6, w: 2.8, h: 0.45, d: 2.2, material: 'wood' },
    ],
    pigs: [
      { x: 17.2, y: 0, z: -2.6, radius: 0.72 },
      { x: 17.2, y: 3.7, z: 2.6, radius: 0.65 },
      { x: 17.2, y: 0, z: 2.6, radius: 0.72 },
    ],
  },
  {
    id: 3,
    name: 'Crystal Greenhouse',
    subtitle: 'Blue Bird joins the squad—press Space mid-air for Triple Split on glass!',
    birds: ['blue', 'yellow', 'red'],
    parScore: 15500,
    targetCenter: [18.5, 3.2, 0],
    blocks: [
      // Tier 1 Base
      { x: 16.5, y: 0, z: -3.6, w: 0.65, h: 2.6, d: 0.65, material: 'ice' },
      { x: 19.5, y: 0, z: -3.6, w: 0.65, h: 2.6, d: 0.65, material: 'ice' },
      { x: 16.5, y: 0, z: -1.2, w: 0.65, h: 2.6, d: 0.65, material: 'wood' },
      { x: 19.5, y: 0, z: -1.2, w: 0.65, h: 2.6, d: 0.65, material: 'wood' },
      { x: 16.5, y: 0, z: 1.2, w: 0.65, h: 2.6, d: 0.65, material: 'wood' },
      { x: 19.5, y: 0, z: 1.2, w: 0.65, h: 2.6, d: 0.65, material: 'wood' },
      { x: 16.5, y: 0, z: 3.6, w: 0.65, h: 2.6, d: 0.65, material: 'ice' },
      { x: 19.5, y: 0, z: 3.6, w: 0.65, h: 2.6, d: 0.65, material: 'ice' },

      // Tier 1 Deck
      { x: 18.0, y: 2.6, z: -2.4, w: 3.9, h: 0.45, d: 3.2, material: 'ice' },
      { x: 18.0, y: 2.6, z: 2.4, w: 3.9, h: 0.45, d: 3.2, material: 'ice' },
      { x: 18.0, y: 2.6, z: 0, w: 3.9, h: 0.45, d: 1.5, material: 'wood' },

      // Tier 2 Pillars
      { x: 17.0, y: 3.05, z: -1.8, w: 0.6, h: 2.4, d: 0.6, material: 'ice' },
      { x: 19.0, y: 3.05, z: -1.8, w: 0.6, h: 2.4, d: 0.6, material: 'ice' },
      { x: 17.0, y: 3.05, z: 1.8, w: 0.6, h: 2.4, d: 0.6, material: 'ice' },
      { x: 19.0, y: 3.05, z: 1.8, w: 0.6, h: 2.4, d: 0.6, material: 'ice' },
      { x: 18.0, y: 5.45, z: 0, w: 3.2, h: 0.45, d: 4.4, material: 'wood' },

      // Tier 3 Spire
      { x: 18.0, y: 5.9, z: -0.9, w: 0.55, h: 1.8, d: 0.55, material: 'ice' },
      { x: 18.0, y: 5.9, z: 0.9, w: 0.55, h: 1.8, d: 0.55, material: 'ice' },
      { x: 18.0, y: 7.7, z: 0, w: 2.0, h: 0.45, d: 2.6, material: 'ice' },
    ],
    pigs: [
      { x: 18.0, y: 0, z: -2.4, radius: 0.68 },
      { x: 18.0, y: 0, z: 2.4, radius: 0.68 },
      { x: 18.0, y: 3.05, z: 0, radius: 0.72 },
      { x: 18.0, y: 5.9, z: 0, radius: 0.58 },
    ],
  },
  {
    id: 4,
    name: 'Stone Bastion',
    subtitle: 'Bomb (Black Bird) joins—detonate near stone armor for a Mega Blast!',
    birds: ['yellow', 'black', 'red', 'red'],
    parScore: 16500,
    targetCenter: [18, 2.8, 0],
    blocks: [
      // Front stone shield wall
      { x: 14.5, y: 0, z: -1.3, w: 1.0, h: 2.8, d: 1.2, material: 'stone' },
      { x: 14.5, y: 0, z: 1.3, w: 1.0, h: 2.8, d: 1.2, material: 'stone' },
      { x: 14.5, y: 2.8, z: 0, w: 1.0, h: 0.7, d: 4.0, material: 'stone' },

      // Inner timber hall behind stone wall
      { x: 17.5, y: 0, z: -2.2, w: 0.7, h: 3.2, d: 0.7, material: 'wood' },
      { x: 17.5, y: 0, z: 2.2, w: 0.7, h: 3.2, d: 0.7, material: 'wood' },
      { x: 20.5, y: 0, z: -2.2, w: 0.7, h: 3.2, d: 0.7, material: 'stone' },
      { x: 20.5, y: 0, z: 2.2, w: 0.7, h: 3.2, d: 0.7, material: 'stone' },
      { x: 19.0, y: 3.2, z: 0, w: 4.2, h: 0.55, d: 5.4, material: 'wood' },

      // Upper penthouse
      { x: 18.0, y: 3.75, z: -1.1, w: 0.6, h: 2.1, d: 0.6, material: 'wood' },
      { x: 18.0, y: 3.75, z: 1.1, w: 0.6, h: 2.1, d: 0.6, material: 'wood' },
      { x: 20.0, y: 3.75, z: -1.1, w: 0.6, h: 2.1, d: 0.6, material: 'wood' },
      { x: 20.0, y: 3.75, z: 1.1, w: 0.6, h: 2.1, d: 0.6, material: 'wood' },
      { x: 19.0, y: 5.85, z: 0, w: 3.0, h: 0.5, d: 3.2, material: 'stone' },
    ],
    pigs: [
      { x: 18.8, y: 0, z: -0.9, radius: 0.7 },
      { x: 18.8, y: 0, z: 0.9, radius: 0.7 },
      { x: 19.0, y: 3.75, z: 0, radius: 0.68 },
    ],
  },
  {
    id: 5,
    name: 'Granite Archway',
    subtitle: 'Terence (Fat Heavy Bird) arrives—plow straight through the stone bridge!',
    birds: ['blue', 'yellow', 'black', 'big'],
    parScore: 19000,
    targetCenter: [18.5, 3.2, 0],
    blocks: [
      // Left-Z Stone Pier
      { x: 16.5, y: 0, z: -3.4, w: 1.0, h: 3.6, d: 1.0, material: 'stone' },
      { x: 19.5, y: 0, z: -3.4, w: 1.0, h: 3.6, d: 1.0, material: 'stone' },
      { x: 16.5, y: 0, z: -1.5, w: 0.8, h: 3.6, d: 0.8, material: 'wood' },
      { x: 19.5, y: 0, z: -1.5, w: 0.8, h: 3.6, d: 0.8, material: 'wood' },

      // Right-Z Stone Pier
      { x: 16.5, y: 0, z: 1.5, w: 0.8, h: 3.6, d: 0.8, material: 'wood' },
      { x: 19.5, y: 0, z: 1.5, w: 0.8, h: 3.6, d: 0.8, material: 'wood' },
      { x: 16.5, y: 0, z: 3.4, w: 1.0, h: 3.6, d: 1.0, material: 'stone' },
      { x: 19.5, y: 0, z: 3.4, w: 1.0, h: 3.6, d: 1.0, material: 'stone' },

      // Spanning Bridge Deck
      { x: 18.0, y: 3.6, z: 0, w: 4.2, h: 0.65, d: 8.2, material: 'stone' },

      // Upper Wooden & Glass Watchtower
      { x: 17.0, y: 4.25, z: -2.0, w: 0.65, h: 2.5, d: 0.65, material: 'wood' },
      { x: 19.0, y: 4.25, z: -2.0, w: 0.65, h: 2.5, d: 0.65, material: 'wood' },
      { x: 17.0, y: 4.25, z: 2.0, w: 0.65, h: 2.5, d: 0.65, material: 'wood' },
      { x: 19.0, y: 4.25, z: 2.0, w: 0.65, h: 2.5, d: 0.65, material: 'wood' },
      { x: 17.0, y: 4.25, z: 0, w: 0.45, h: 2.3, d: 2.8, material: 'ice' },
      { x: 18.0, y: 6.75, z: 0, w: 3.0, h: 0.5, d: 5.0, material: 'wood' },
    ],
    pigs: [
      { x: 18.0, y: 0, z: -2.45, radius: 0.7 },
      { x: 18.0, y: 0, z: 2.45, radius: 0.7 },
      { x: 18.1, y: 4.25, z: -1.0, radius: 0.65 },
      { x: 18.1, y: 4.25, z: 1.0, radius: 0.65 },
    ],
  },
  {
    id: 6,
    name: 'Triple Keep',
    subtitle: 'Three fortified bays—combine Yellow speed, Blue split, and Bomb blast!',
    birds: ['yellow', 'blue', 'black', 'big', 'red'],
    parScore: 22000,
    targetCenter: [19, 3.3, 0],
    blocks: [
      // Front Bay (x = 14.2)
      { x: 14.2, y: 0, z: -2.2, w: 0.75, h: 3.0, d: 0.75, material: 'wood' },
      { x: 14.2, y: 0, z: 2.2, w: 0.75, h: 3.0, d: 0.75, material: 'wood' },
      { x: 14.2, y: 0, z: 0, w: 0.45, h: 2.8, d: 3.2, material: 'ice' },
      { x: 14.2, y: 3.0, z: 0, w: 1.0, h: 0.55, d: 5.4, material: 'wood' },

      // Mid Bay (x = 18.5)
      { x: 17.5, y: 0, z: -3.2, w: 0.8, h: 3.4, d: 0.8, material: 'stone' },
      { x: 19.8, y: 0, z: -3.2, w: 0.8, h: 3.4, d: 0.8, material: 'stone' },
      { x: 17.5, y: 0, z: 3.2, w: 0.8, h: 3.4, d: 0.8, material: 'stone' },
      { x: 19.8, y: 0, z: 3.2, w: 0.8, h: 3.4, d: 0.8, material: 'stone' },
      { x: 18.65, y: 3.4, z: -2.2, w: 3.2, h: 0.5, d: 2.8, material: 'wood' },
      { x: 18.65, y: 3.4, z: 2.2, w: 3.2, h: 0.5, d: 2.8, material: 'wood' },

      // Upper glass dome on Mid Bay
      { x: 18.65, y: 3.9, z: -2.8, w: 0.6, h: 2.2, d: 0.6, material: 'ice' },
      { x: 18.65, y: 3.9, z: -1.4, w: 0.6, h: 2.2, d: 0.6, material: 'ice' },
      { x: 18.65, y: 6.1, z: -2.1, w: 2.2, h: 0.45, d: 2.4, material: 'ice' },

      { x: 18.65, y: 3.9, z: 1.4, w: 0.6, h: 2.2, d: 0.6, material: 'ice' },
      { x: 18.65, y: 3.9, z: 2.8, w: 0.6, h: 2.2, d: 0.6, material: 'ice' },
      { x: 18.65, y: 6.1, z: 2.1, w: 2.2, h: 0.45, d: 2.4, material: 'ice' },

      // Rear Vault (x = 22.8)
      { x: 22.0, y: 0, z: -1.4, w: 0.85, h: 3.2, d: 0.85, material: 'stone' },
      { x: 22.0, y: 0, z: 1.4, w: 0.85, h: 3.2, d: 0.85, material: 'stone' },
      { x: 24.0, y: 0, z: -1.4, w: 0.85, h: 3.2, d: 0.85, material: 'stone' },
      { x: 24.0, y: 0, z: 1.4, w: 0.85, h: 3.2, d: 0.85, material: 'stone' },
      { x: 23.0, y: 3.2, z: 0, w: 3.0, h: 0.55, d: 3.8, material: 'stone' },
    ],
    pigs: [
      { x: 16.0, y: 0, z: -1.2, radius: 0.66 },
      { x: 16.0, y: 0, z: 1.2, radius: 0.66 },
      { x: 18.65, y: 3.9, z: -2.1, radius: 0.62 },
      { x: 18.65, y: 3.9, z: 2.1, radius: 0.62 },
      { x: 23.0, y: 0, z: 0, radius: 0.74 },
    ],
  },
  {
    id: 7,
    name: 'Skyline Spire',
    subtitle: 'Sky-high timber & stone tower—shatter the pillars or breach with Bomb!',
    birds: ['blue', 'yellow', 'black', 'big', 'black'],
    parScore: 25000,
    targetCenter: [19.5, 4.2, 0],
    blocks: [
      // Level 1 Ground Pillars
      { x: 17.5, y: 0, z: -2.8, w: 0.9, h: 3.2, d: 0.9, material: 'stone' },
      { x: 21.5, y: 0, z: -2.8, w: 0.9, h: 3.2, d: 0.9, material: 'stone' },
      { x: 17.5, y: 0, z: 2.8, w: 0.9, h: 3.2, d: 0.9, material: 'stone' },
      { x: 21.5, y: 0, z: 2.8, w: 0.9, h: 3.2, d: 0.9, material: 'stone' },
      { x: 17.5, y: 0, z: 0, w: 0.6, h: 3.2, d: 1.6, material: 'wood' },
      { x: 21.5, y: 0, z: 0, w: 0.6, h: 3.2, d: 1.6, material: 'wood' },
      { x: 19.5, y: 3.2, z: 0, w: 5.2, h: 0.55, d: 6.8, material: 'wood' },

      // Level 2 Mid Deck
      { x: 18.0, y: 3.75, z: -2.0, w: 0.7, h: 2.8, d: 0.7, material: 'wood' },
      { x: 21.0, y: 3.75, z: -2.0, w: 0.7, h: 2.8, d: 0.7, material: 'wood' },
      { x: 18.0, y: 3.75, z: 2.0, w: 0.7, h: 2.8, d: 0.7, material: 'wood' },
      { x: 21.0, y: 3.75, z: 2.0, w: 0.7, h: 2.8, d: 0.7, material: 'wood' },
      { x: 18.0, y: 3.75, z: 0, w: 0.45, h: 2.6, d: 2.6, material: 'ice' },
      { x: 19.5, y: 6.55, z: 0, w: 4.0, h: 0.5, d: 5.0, material: 'stone' },

      // Level 3 Crown Spire
      { x: 18.8, y: 7.05, z: -1.0, w: 0.55, h: 2.2, d: 0.55, material: 'ice' },
      { x: 20.2, y: 7.05, z: -1.0, w: 0.55, h: 2.2, d: 0.55, material: 'ice' },
      { x: 18.8, y: 7.05, z: 1.0, w: 0.55, h: 2.2, d: 0.55, material: 'ice' },
      { x: 20.2, y: 7.05, z: 1.0, w: 0.55, h: 2.2, d: 0.55, material: 'ice' },
      { x: 19.5, y: 9.25, z: 0, w: 2.4, h: 0.45, d: 2.8, material: 'wood' },
    ],
    pigs: [
      { x: 19.5, y: 0, z: 0, radius: 0.7 },
      { x: 19.5, y: 3.75, z: -1.1, radius: 0.65 },
      { x: 19.5, y: 3.75, z: 1.1, radius: 0.65 },
      { x: 19.5, y: 7.05, z: 0, radius: 0.62 },
    ],
  },
  {
    id: 8,
    name: "King Pig's Citadel",
    subtitle: 'Grand Finale! 6 birds vs. the armored fortress and crowned King Pig.',
    birds: ['yellow', 'blue', 'black', 'big', 'black', 'big'],
    parScore: 30000,
    targetCenter: [20, 3.6, 0],
    blocks: [
      // Outer Stone Gatehouse
      { x: 15.2, y: 0, z: -2.8, w: 1.1, h: 3.4, d: 1.1, material: 'stone' },
      { x: 15.2, y: 0, z: 2.8, w: 1.1, h: 3.4, d: 1.1, material: 'stone' },
      { x: 15.2, y: 3.4, z: 0, w: 1.2, h: 0.75, d: 6.8, material: 'stone' },
      { x: 15.2, y: 0, z: 0, w: 0.55, h: 3.2, d: 3.2, material: 'ice' },

      // Left & Right Keep Wings
      { x: 19.5, y: 0, z: -3.6, w: 0.85, h: 3.8, d: 0.85, material: 'stone' },
      { x: 22.5, y: 0, z: -3.6, w: 0.85, h: 3.8, d: 0.85, material: 'stone' },
      { x: 19.5, y: 0, z: -1.4, w: 0.75, h: 3.8, d: 0.75, material: 'wood' },
      { x: 22.5, y: 0, z: -1.4, w: 0.75, h: 3.8, d: 0.75, material: 'wood' },

      { x: 19.5, y: 0, z: 1.4, w: 0.75, h: 3.8, d: 0.75, material: 'wood' },
      { x: 22.5, y: 0, z: 1.4, w: 0.75, h: 3.8, d: 0.75, material: 'wood' },
      { x: 19.5, y: 0, z: 3.6, w: 0.85, h: 3.8, d: 0.85, material: 'stone' },
      { x: 22.5, y: 0, z: 3.6, w: 0.85, h: 3.8, d: 0.85, material: 'stone' },

      // Grand Keep Deck
      { x: 21.0, y: 3.8, z: 0, w: 4.4, h: 0.6, d: 8.4, material: 'wood' },

      // King's Upper Throne Pavilion
      { x: 19.8, y: 4.4, z: -1.6, w: 0.7, h: 2.8, d: 0.7, material: 'stone' },
      { x: 22.2, y: 4.4, z: -1.6, w: 0.7, h: 2.8, d: 0.7, material: 'stone' },
      { x: 19.8, y: 4.4, z: 1.6, w: 0.7, h: 2.8, d: 0.7, material: 'stone' },
      { x: 22.2, y: 4.4, z: 1.6, w: 0.7, h: 2.8, d: 0.7, material: 'stone' },
      { x: 21.0, y: 7.2, z: 0, w: 3.6, h: 0.55, d: 4.2, material: 'stone' },
      { x: 19.8, y: 4.4, z: 0, w: 0.45, h: 2.6, d: 2.2, material: 'ice' },
    ],
    pigs: [
      { x: 21.0, y: 0, z: -2.5, radius: 0.72 },
      { x: 21.0, y: 0, z: 2.5, radius: 0.72 },
      { x: 17.0, y: 0, z: 0, radius: 0.65 },
      { x: 21.0, y: 4.4, z: -2.8, radius: 0.6 },
      { x: 21.0, y: 4.4, z: 2.8, radius: 0.6 },
      { x: 21.1, y: 4.4, z: 0, radius: 0.92, isKing: true },
    ],
  },
];
