import { GAME_CONFIG } from '../config.js';
import { SoundManager } from '../audio/SoundManager.js';

export class ComboMeter {
  constructor() {
    this.count = 0;
    this.timer = 0;
    this.totalScore = 0;
  }

  hit(baseScore) {
    this.count++;
    this.timer = GAME_CONFIG.COMBO_TIMEOUT;

    // Combo damage multiplier
    const multiplier = 1 + (this.count - 1) * GAME_CONFIG.COMBO_DAMAGE_BONUS;
    const score = Math.floor(baseScore * multiplier);
    this.totalScore += score;

    // Combo sounds
    if (this.count > 1 && this.count % 5 === 0) {
      SoundManager.comboArpeggio(this.count);
    }

    return { score, multiplier, comboCount: this.count };
  }

  update(delta) {
    if (this.count > 0) {
      this.timer -= delta;
      if (this.timer <= 0) {
        this.reset();
      }
    }
  }

  reset() {
    this.count = 0;
    this.timer = 0;
  }

  getDamageMultiplier() {
    return 1 + (this.count) * GAME_CONFIG.COMBO_DAMAGE_BONUS;
  }
}
