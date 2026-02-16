import { ENEMY_TYPES } from './EnemyTypes.js';

const REGULAR_TYPES = ['THUG', 'NINJA', 'BOMBER', 'BRUTE'];
const BOSS_TYPES = ['LIZARD', 'DOC_OCK', 'GREEN_GOBLIN', 'RHINO', 'VENOM'];

// Difficulty scales with wave number
function getDifficulty(wave) {
  return {
    // Enemy counts match original game feel (2-3 early, 3-6 mid, up to 8 late)
    minEnemies: Math.min(2 + Math.floor(wave / 2), 6),
    maxEnemies: Math.min(3 + wave, 8),
    // Which enemy types are available (unlock tougher ones over time)
    availableTypes: REGULAR_TYPES.slice(0, Math.min(1 + Math.floor(wave / 2), REGULAR_TYPES.length)),
    // Boss every 3rd wave starting from wave 3
    isBossWave: wave >= 3 && wave % 3 === 0,
    // HP multiplier increases over time
    hpMultiplier: 1 + (wave - 1) * 0.08,
    // Damage multiplier
    dmgMultiplier: 1 + (wave - 1) * 0.05,
    // Speed multiplier
    speedMultiplier: 1 + (wave - 1) * 0.03,
  };
}

export class EnemySpawner {
  constructor() {
    this.currentWave = 0;
    this.waveActive = false;
    this.waveEnemies = [];
    this.showGoPrompt = false;
    this.nextTrigger = 200; // First wave trigger distance
    this.usedBosses = []; // Track recently used bosses to avoid repeats
  }

  update(cameraX, activeEnemies) {
    const spawned = [];

    if (!this.waveActive && cameraX >= this.nextTrigger) {
      this.currentWave++;
      const diff = getDifficulty(this.currentWave);
      const baseX = cameraX + 600; // Spawn ahead of camera

      // Spawn regular enemies
      const count = diff.minEnemies + Math.floor(Math.random() * (diff.maxEnemies - diff.minEnemies + 1));
      for (let i = 0; i < count; i++) {
        const typeKey = diff.availableTypes[Math.floor(Math.random() * diff.availableTypes.length)];
        spawned.push({
          type: ENEMY_TYPES[typeKey],
          x: baseX + i * 120 + Math.random() * 60,
          scalers: { hp: diff.hpMultiplier, dmg: diff.dmgMultiplier, speed: diff.speedMultiplier },
        });
      }

      // Boss wave: add a random boss
      if (diff.isBossWave) {
        const boss = this.pickRandomBoss();
        spawned.push({
          type: ENEMY_TYPES[boss],
          x: baseX + count * 120 + 50,
          scalers: { hp: diff.hpMultiplier, dmg: diff.dmgMultiplier, speed: diff.speedMultiplier },
        });
      }

      this.waveActive = true;
      this.waveEnemies = [...spawned];
      this.showGoPrompt = false;

      // Next wave trigger: advance further each wave
      this.nextTrigger = cameraX + 500 + Math.min(this.currentWave * 30, 300);
    }

    if (this.waveActive && activeEnemies === 0) {
      this.waveActive = false;
      this.showGoPrompt = true;
    }

    return spawned;
  }

  pickRandomBoss() {
    // Avoid repeating the last 2 bosses
    const available = BOSS_TYPES.filter(b => !this.usedBosses.includes(b));
    const pool = available.length > 0 ? available : BOSS_TYPES;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    this.usedBosses.push(pick);
    if (this.usedBosses.length > 2) this.usedBosses.shift();
    return pick;
  }

  isComplete() {
    // Never complete - endless mode
    return false;
  }

  get totalWaves() {
    return Infinity;
  }
}
