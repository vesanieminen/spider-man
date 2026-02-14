import { GAME_CONFIG } from '../config.js';

export class HUD {
  constructor(scene) {
    this.scene = scene;

    // P1 Health bar
    this.hpBarBg = scene.add.graphics().setScrollFactor(0).setDepth(50);
    this.hpBarFill = scene.add.graphics().setScrollFactor(0).setDepth(51);

    // P1 label
    this.p1Label = scene.add.text(20, 6, 'PETER', {
      fontSize: '12px',
      fontFamily: 'monospace',
      color: '#6688ff',
      stroke: '#000',
      strokeThickness: 2,
    }).setScrollFactor(0).setDepth(52);

    // P2 Health bar
    this.p2BarBg = scene.add.graphics().setScrollFactor(0).setDepth(50);
    this.p2BarFill = scene.add.graphics().setScrollFactor(0).setDepth(51);

    // P2 label
    this.p2Label = scene.add.text(20, 48, 'MILES', {
      fontSize: '12px',
      fontFamily: 'monospace',
      color: '#ff4466',
      stroke: '#000',
      strokeThickness: 2,
    }).setScrollFactor(0).setDepth(52).setVisible(false);

    // Boss health bar
    this.bossBarBg = scene.add.graphics().setScrollFactor(0).setDepth(50);
    this.bossBarFill = scene.add.graphics().setScrollFactor(0).setDepth(51);
    this.bossNameText = scene.add.text(GAME_CONFIG.WIDTH / 2, 10, '', {
      fontSize: '14px',
      fontFamily: 'monospace',
      color: '#ff3333',
      fontStyle: 'bold',
      stroke: '#000',
      strokeThickness: 2,
    }).setScrollFactor(0).setDepth(52).setOrigin(0.5, 0).setVisible(false);

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

    // Join prompt
    this.joinText = scene.add.text(GAME_CONFIG.WIDTH / 2, GAME_CONFIG.HEIGHT - 30, 'Press any key to join!', {
      fontSize: '16px',
      fontFamily: 'monospace',
      color: '#ffee00',
      stroke: '#000',
      strokeThickness: 2,
    }).setScrollFactor(0).setDepth(50).setOrigin(0.5).setAlpha(0.6);

    this.goBlinkTimer = 0;
  }

  update(delta, health, maxHealth, score, combo, wave, totalWaves, showGo, p2Data, p1Name, bossData, showJoinPrompt) {
    // P1 Health bar
    this.hpBarBg.clear();
    this.hpBarFill.clear();

    const barX = 20;
    const barY = 20;
    const barW = 200;
    const barH = 18;

    this.p1Label.setText(p1Name || 'PETER');

    this.hpBarBg.fillStyle(0x333333, 0.8);
    this.hpBarBg.fillRect(barX, barY, barW, barH);
    this.hpBarBg.lineStyle(2, 0x666666, 1);
    this.hpBarBg.strokeRect(barX, barY, barW, barH);

    const hpPercent = Math.max(0, health / maxHealth);
    const hpColor = hpPercent > 0.5 ? 0x44ff44 : hpPercent > 0.25 ? 0xffaa00 : 0xff3333;
    this.hpBarFill.fillStyle(hpColor, 0.9);
    this.hpBarFill.fillRect(barX + 2, barY + 2, (barW - 4) * hpPercent, barH - 4);

    // P2 Health bar
    this.p2BarBg.clear();
    this.p2BarFill.clear();

    if (p2Data) {
      this.p2Label.setVisible(true);
      this.p2Label.setText(p2Data.name || 'MILES');

      const p2Y = 62;
      this.p2BarBg.fillStyle(0x333333, 0.8);
      this.p2BarBg.fillRect(barX, p2Y, barW, barH);
      this.p2BarBg.lineStyle(2, 0x666666, 1);
      this.p2BarBg.strokeRect(barX, p2Y, barW, barH);

      const p2Percent = Math.max(0, p2Data.health / p2Data.maxHealth);
      const p2Color = p2Percent > 0.5 ? 0x44ff44 : p2Percent > 0.25 ? 0xffaa00 : 0xff3333;
      this.p2BarFill.fillStyle(p2Color, 0.9);
      this.p2BarFill.fillRect(barX + 2, p2Y + 2, (barW - 4) * p2Percent, barH - 4);
    } else {
      this.p2Label.setVisible(false);
    }

    // Boss health bar
    this.bossBarBg.clear();
    this.bossBarFill.clear();

    if (bossData) {
      this.bossNameText.setVisible(true);
      this.bossNameText.setText(bossData.name.toUpperCase());

      const bossBarW = 400;
      const bossBarH = 14;
      const bossBarX = (GAME_CONFIG.WIDTH - bossBarW) / 2;
      const bossBarY = 28;

      this.bossBarBg.fillStyle(0x333333, 0.8);
      this.bossBarBg.fillRect(bossBarX, bossBarY, bossBarW, bossBarH);
      this.bossBarBg.lineStyle(2, 0xff3333, 0.8);
      this.bossBarBg.strokeRect(bossBarX, bossBarY, bossBarW, bossBarH);

      const bossPercent = Math.max(0, bossData.health / bossData.maxHealth);
      this.bossBarFill.fillStyle(0xff3333, 0.9);
      this.bossBarFill.fillRect(bossBarX + 2, bossBarY + 2, (bossBarW - 4) * bossPercent, bossBarH - 4);
    } else {
      this.bossNameText.setVisible(false);
    }

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

    // Join prompt
    if (showJoinPrompt) {
      this.joinText.setVisible(true);
      this.joinText.setAlpha(0.4 + Math.sin(Date.now() / 400) * 0.3);
    } else {
      this.joinText.setVisible(false);
    }
  }

  destroy() {
    this.hpBarBg.destroy();
    this.hpBarFill.destroy();
    this.p1Label.destroy();
    this.p2BarBg.destroy();
    this.p2BarFill.destroy();
    this.p2Label.destroy();
    this.bossBarBg.destroy();
    this.bossBarFill.destroy();
    this.bossNameText.destroy();
    this.scoreText.destroy();
    this.comboText.destroy();
    this.waveText.destroy();
    this.goText.destroy();
    this.joinText.destroy();
  }
}
