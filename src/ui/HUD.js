import { GAME_CONFIG } from '../config.js';

export class HUD {
  constructor(scene) {
    this.scene = scene;

    // Health bar
    this.hpBarBg = scene.add.graphics().setScrollFactor(0).setDepth(50);
    this.hpBarFill = scene.add.graphics().setScrollFactor(0).setDepth(51);

    // Score
    this.scoreText = scene.add.text(GAME_CONFIG.WIDTH - 20, 20, 'SCORE: 0', {
      fontSize: '20px',
      fontFamily: 'monospace',
      color: '#ffffff',
      stroke: '#000',
      strokeThickness: 3,
    }).setScrollFactor(0).setDepth(50).setOrigin(1, 0);

    // Combo
    this.comboText = scene.add.text(GAME_CONFIG.WIDTH / 2, 80, '', {
      fontSize: '28px',
      fontFamily: 'monospace',
      color: '#ffff00',
      fontStyle: 'bold',
      stroke: '#000',
      strokeThickness: 4,
    }).setScrollFactor(0).setDepth(50).setOrigin(0.5);

    // Wave info
    this.waveText = scene.add.text(GAME_CONFIG.WIDTH / 2, 50, '', {
      fontSize: '18px',
      fontFamily: 'monospace',
      color: '#aaaaaa',
      stroke: '#000',
      strokeThickness: 2,
    }).setScrollFactor(0).setDepth(50).setOrigin(0.5);

    // GO prompt
    this.goText = scene.add.text(GAME_CONFIG.WIDTH - 100, GAME_CONFIG.HEIGHT / 2, 'GO -->', {
      fontSize: '32px',
      fontFamily: 'monospace',
      color: '#ffff00',
      fontStyle: 'bold',
      stroke: '#000',
      strokeThickness: 4,
    }).setScrollFactor(0).setDepth(50).setOrigin(0.5).setVisible(false);

    this.goBlinkTimer = 0;
  }

  update(delta, health, maxHealth, score, combo, wave, totalWaves, showGo) {
    // Health bar
    this.hpBarBg.clear();
    this.hpBarFill.clear();

    const barX = 20;
    const barY = 20;
    const barW = 200;
    const barH = 18;

    // Background
    this.hpBarBg.fillStyle(0x333333, 0.8);
    this.hpBarBg.fillRect(barX, barY, barW, barH);
    this.hpBarBg.lineStyle(2, 0x666666, 1);
    this.hpBarBg.strokeRect(barX, barY, barW, barH);

    // Health fill
    const hpPercent = Math.max(0, health / maxHealth);
    const hpColor = hpPercent > 0.5 ? 0x44ff44 : hpPercent > 0.25 ? 0xffaa00 : 0xff3333;
    this.hpBarFill.fillStyle(hpColor, 0.9);
    this.hpBarFill.fillRect(barX + 2, barY + 2, (barW - 4) * hpPercent, barH - 4);

    // Label
    this.hpBarBg.fillStyle(0xffffff, 1);

    // Score
    this.scoreText.setText(`SCORE: ${score}`);

    // Combo
    if (combo > 1) {
      this.comboText.setText(`${combo} HIT COMBO!`);
      this.comboText.setVisible(true);
      this.comboText.setScale(1 + Math.sin(Date.now() / 100) * 0.05);
    } else {
      this.comboText.setVisible(false);
    }

    // Wave
    if (wave > 0) {
      this.waveText.setText(`WAVE ${wave}/${totalWaves}`);
    }

    // GO prompt
    if (showGo) {
      this.goBlinkTimer += delta;
      this.goText.setVisible(Math.floor(this.goBlinkTimer / 300) % 2 === 0);
    } else {
      this.goText.setVisible(false);
      this.goBlinkTimer = 0;
    }
  }

  destroy() {
    this.hpBarBg.destroy();
    this.hpBarFill.destroy();
    this.scoreText.destroy();
    this.comboText.destroy();
    this.waveText.destroy();
    this.goText.destroy();
  }
}
