import { ENEMY_TYPES } from './EnemyTypes.js';

// Wave definitions tied to camera scroll position
const WAVES = [
  { trigger: 200, enemies: [
    { type: 'THUG', x: 500, y: 0 },
    { type: 'THUG', x: 600, y: 0 },
  ]},
  { trigger: 800, enemies: [
    { type: 'THUG', x: 1100, y: 0 },
    { type: 'THUG', x: 1200, y: 0 },
    { type: 'THUG', x: 1300, y: 0 },
  ]},
  { trigger: 1500, enemies: [
    { type: 'THUG', x: 1800, y: 0 },
    { type: 'NINJA', x: 1950, y: 0 },
    { type: 'THUG', x: 2100, y: 0 },
  ]},
  { trigger: 2200, enemies: [
    { type: 'BRUTE', x: 2600, y: 0 },
    { type: 'THUG', x: 2750, y: 0 },
  ]},
  { trigger: 2900, enemies: [
    { type: 'NINJA', x: 3200, y: 0 },
    { type: 'NINJA', x: 3350, y: 0 },
    { type: 'BOMBER', x: 3500, y: 0 },
  ]},
  { trigger: 3600, enemies: [
    { type: 'THUG', x: 3900, y: 0 },
    { type: 'THUG', x: 4000, y: 0 },
    { type: 'BRUTE', x: 4100, y: 0 },
    { type: 'THUG', x: 4200, y: 0 },
  ]},
  { trigger: 4300, enemies: [
    { type: 'NINJA', x: 4600, y: 0 },
    { type: 'BOMBER', x: 4750, y: 0 },
    { type: 'NINJA', x: 4900, y: 0 },
    { type: 'BOMBER', x: 5050, y: 0 },
  ]},
  { trigger: 5100, enemies: [
    { type: 'BRUTE', x: 5400, y: 0 },
    { type: 'BRUTE', x: 5600, y: 0 },
    { type: 'THUG', x: 5500, y: 0 },
    { type: 'THUG', x: 5700, y: 0 },
  ]},
  { trigger: 5800, enemies: [
    { type: 'NINJA', x: 6100, y: 0 },
    { type: 'NINJA', x: 6200, y: 0 },
    { type: 'NINJA', x: 6300, y: 0 },
    { type: 'BOMBER', x: 6400, y: 0 },
    { type: 'BRUTE', x: 6250, y: 0 },
  ]},
  { trigger: 6500, enemies: [
    // Final wave - everything
    { type: 'BRUTE', x: 6900, y: 0 },
    { type: 'BRUTE', x: 7100, y: 0 },
    { type: 'NINJA', x: 7000, y: 0 },
    { type: 'NINJA', x: 7200, y: 0 },
    { type: 'BOMBER', x: 7300, y: 0 },
    { type: 'THUG', x: 6950, y: 0 },
    { type: 'THUG', x: 7150, y: 0 },
  ]},
];

export class EnemySpawner {
  constructor() {
    this.currentWave = 0;
    this.waveActive = false;
    this.waveEnemies = [];
    this.showGoPrompt = false;
  }

  update(cameraX, activeEnemies) {
    const spawned = [];

    // Check for next wave trigger
    if (this.currentWave < WAVES.length) {
      const wave = WAVES[this.currentWave];
      if (cameraX >= wave.trigger) {
        // Spawn wave enemies
        for (const def of wave.enemies) {
          spawned.push({
            type: ENEMY_TYPES[def.type],
            x: def.x,
          });
        }
        this.waveActive = true;
        this.waveEnemies = [...spawned];
        this.currentWave++;
        this.showGoPrompt = false;
      }
    }

    // Check if wave is cleared
    if (this.waveActive && activeEnemies === 0) {
      this.waveActive = false;
      this.showGoPrompt = true;
    }

    return spawned;
  }

  isComplete() {
    return this.currentWave >= WAVES.length;
  }

  get totalWaves() {
    return WAVES.length;
  }
}
