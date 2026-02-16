import { GAME_CONFIG } from '../config.js';

/**
 * HUD - DOM-based overlay for health bars, score, combo, wave info.
 * All elements are defined in index.html and manipulated here.
 */
export class HUD {
  constructor() {
    this.p1Label = document.getElementById('p1-label');
    this.p1HpBar = document.getElementById('p1-hp-bar');
    this.p1HpFill = document.getElementById('p1-hp-fill');

    this.p2Label = document.getElementById('p2-label');
    this.p2HpBar = document.getElementById('p2-hp-bar');
    this.p2HpFill = document.getElementById('p2-hp-fill');

    this.bossContainer = document.getElementById('boss-container');
    this.bossName = document.getElementById('boss-name');
    this.bossHpFill = document.getElementById('boss-hp-fill');

    this.scoreText = document.getElementById('score-text');
    this.comboText = document.getElementById('combo-text');
    this.waveText = document.getElementById('wave-text');
    this.goText = document.getElementById('go-text');
    this.joinText = document.getElementById('join-text');

    this.goBlinkTimer = 0;
  }

  show() {
    document.getElementById('hud').style.display = 'block';
  }

  hide() {
    document.getElementById('hud').style.display = 'none';
  }

  update(delta, health, maxHealth, score, combo, wave, totalWaves, showGo, p2Data, p1Name, bossData, showJoinPrompt) {
    // P1 health bar
    this.p1Label.textContent = p1Name || 'PETER';
    const hpPercent = Math.max(0, health / maxHealth);
    this.p1HpFill.style.width = (hpPercent * 100) + '%';
    const hpColor = hpPercent > 0.5 ? '#44ff44' : hpPercent > 0.25 ? '#ffaa00' : '#ff3333';
    this.p1HpFill.style.background = hpColor;

    // P2 health bar
    if (p2Data) {
      this.p2Label.style.display = 'block';
      this.p2HpBar.style.display = 'block';
      this.p2Label.textContent = p2Data.name || 'MILES';
      const p2Percent = Math.max(0, p2Data.health / p2Data.maxHealth);
      this.p2HpFill.style.width = (p2Percent * 100) + '%';
      const p2Color = p2Percent > 0.5 ? '#44ff44' : p2Percent > 0.25 ? '#ffaa00' : '#ff3333';
      this.p2HpFill.style.background = p2Color;
    } else {
      this.p2Label.style.display = 'none';
      this.p2HpBar.style.display = 'none';
    }

    // Boss health bar
    if (bossData) {
      this.bossContainer.style.display = 'block';
      this.bossName.textContent = bossData.name.toUpperCase();
      const bossPercent = Math.max(0, bossData.health / bossData.maxHealth);
      this.bossHpFill.style.width = (bossPercent * 100) + '%';
    } else {
      this.bossContainer.style.display = 'none';
    }

    // Score
    this.scoreText.textContent = `SCORE: ${score}`;

    // Combo
    if (combo > 1) {
      this.comboText.style.display = 'block';
      this.comboText.textContent = `${combo} HIT COMBO!`;
      const sc = 1 + Math.sin(Date.now() / 100) * 0.05;
      this.comboText.style.transform = `translateX(-50%) scale(${sc})`;
    } else {
      this.comboText.style.display = 'none';
    }

    // Wave
    if (wave > 0) {
      this.waveText.textContent = `WAVE ${wave}`;
    }

    // GO prompt
    if (showGo) {
      this.goBlinkTimer += delta;
      this.goText.style.display = Math.floor(this.goBlinkTimer / 300) % 2 === 0 ? 'block' : 'none';
    } else {
      this.goText.style.display = 'none';
      this.goBlinkTimer = 0;
    }

    // Join prompt
    if (showJoinPrompt) {
      this.joinText.style.display = 'block';
      this.joinText.style.opacity = 0.4 + Math.sin(Date.now() / 400) * 0.3;
    } else {
      this.joinText.style.display = 'none';
    }
  }

  destroy() {
    // Reset all HUD elements
    this.p2Label.style.display = 'none';
    this.p2HpBar.style.display = 'none';
    this.bossContainer.style.display = 'none';
    this.comboText.style.display = 'none';
    this.goText.style.display = 'none';
  }
}
