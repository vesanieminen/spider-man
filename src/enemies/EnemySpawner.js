import { ENEMY_TYPES } from './EnemyTypes.js';

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
  // Boss wave: Lizard
  { trigger: 2200, enemies: [
    { type: 'LIZARD', x: 2600, y: 0 },
    { type: 'THUG', x: 2750, y: 0 },
    { type: 'THUG', x: 2500, y: 0 },
  ]},
  { trigger: 2900, enemies: [
    { type: 'NINJA', x: 3200, y: 0 },
    { type: 'NINJA', x: 3350, y: 0 },
    { type: 'BOMBER', x: 3500, y: 0 },
  ]},
  // Boss wave: Doc Ock
  { trigger: 3600, enemies: [
    { type: 'DOC_OCK', x: 4000, y: 0 },
    { type: 'THUG', x: 3900, y: 0 },
    { type: 'THUG', x: 4100, y: 0 },
  ]},
  { trigger: 4300, enemies: [
    { type: 'NINJA', x: 4600, y: 0 },
    { type: 'BOMBER', x: 4750, y: 0 },
    { type: 'NINJA', x: 4900, y: 0 },
    { type: 'BOMBER', x: 5050, y: 0 },
  ]},
  // Boss wave: Green Goblin
  { trigger: 5100, enemies: [
    { type: 'GREEN_GOBLIN', x: 5500, y: 0 },
    { type: 'NINJA', x: 5400, y: 0 },
    { type: 'NINJA', x: 5600, y: 0 },
  ]},
  { trigger: 5800, enemies: [
    { type: 'NINJA', x: 6100, y: 0 },
    { type: 'NINJA', x: 6200, y: 0 },
    { type: 'NINJA', x: 6300, y: 0 },
    { type: 'BOMBER', x: 6400, y: 0 },
    { type: 'BRUTE', x: 6250, y: 0 },
  ]},
  // Boss wave: Rhino
  { trigger: 6500, enemies: [
    { type: 'RHINO', x: 6900, y: 0 },
    { type: 'BRUTE', x: 7100, y: 0 },
  ]},
  { trigger: 7000, enemies: [
    { type: 'BRUTE', x: 7400, y: 0 },
    { type: 'NINJA', x: 7500, y: 0 },
    { type: 'NINJA', x: 7600, y: 0 },
    { type: 'BOMBER', x: 7700, y: 0 },
    { type: 'THUG', x: 7350, y: 0 },
    { type: 'THUG', x: 7550, y: 0 },
  ]},
  // Final boss: Venom
  { trigger: 7500, enemies: [
    { type: 'VENOM', x: 8000, y: 0 },
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

    if (this.currentWave < WAVES.length) {
      const wave = WAVES[this.currentWave];
      if (cameraX >= wave.trigger) {
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
