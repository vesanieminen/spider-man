import Phaser from 'phaser';
import { GAME_CONFIG } from '../config.js';
import { SoundManager } from '../audio/SoundManager.js';
import { InputManager, INPUT_CONFIGS } from '../input/InputManager.js';

function getGrade(score) {
  if (score >= 15000) return { grade: 'S', color: '#ff6600' };
  if (score >= 10000) return { grade: 'A', color: '#44ff44' };
  if (score >= 6000) return { grade: 'B', color: '#6688ff' };
  if (score >= 3000) return { grade: 'C', color: '#ffff00' };
  return { grade: 'D', color: '#aaaaaa' };
}

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super('GameOverScene');
  }

  init(data) {
    this.finalScore = data.score || 0;
    this.maxCombo = data.maxCombo || 0;
    this.won = data.won || false;
  }

  create() {
    const cx = GAME_CONFIG.WIDTH / 2;

    // Background
    this.add.graphics().fillStyle(0x0a0a1e, 1).fillRect(0, 0, GAME_CONFIG.WIDTH, GAME_CONFIG.HEIGHT);

    // Result
    const headerText = this.won ? 'CITY SAVED!' : 'GAME OVER';
    const headerColor = this.won ? '#44ff44' : '#ff3333';

    this.add.text(cx, 100, headerText, {
      fontSize: '56px',
      fontFamily: 'monospace',
      color: headerColor,
      fontStyle: 'bold',
      stroke: '#000',
      strokeThickness: 6,
    }).setOrigin(0.5);

    // Score
    this.add.text(cx, 220, `FINAL SCORE: ${this.finalScore}`, {
      fontSize: '32px',
      fontFamily: 'monospace',
      color: '#ffffff',
      stroke: '#000',
      strokeThickness: 4,
    }).setOrigin(0.5);

    // Max combo
    this.add.text(cx, 280, `MAX COMBO: ${this.maxCombo}`, {
      fontSize: '22px',
      fontFamily: 'monospace',
      color: '#ffff00',
      stroke: '#000',
      strokeThickness: 3,
    }).setOrigin(0.5);

    // Grade
    const { grade, color } = getGrade(this.finalScore);
    this.add.text(cx, 380, grade, {
      fontSize: '120px',
      fontFamily: 'monospace',
      color: color,
      fontStyle: 'bold',
      stroke: '#000',
      strokeThickness: 8,
    }).setOrigin(0.5);

    this.add.text(cx, 460, 'RANK', {
      fontSize: '20px',
      fontFamily: 'monospace',
      color: '#888888',
    }).setOrigin(0.5);

    // Restart prompt
    this.startText = this.add.text(cx, 580, 'Press Any Key to Play Again', {
      fontSize: '24px',
      fontFamily: 'monospace',
      color: '#ffff00',
      stroke: '#000',
      strokeThickness: 3,
    }).setOrigin(0.5);

    this.tweens.add({
      targets: this.startText,
      alpha: 0.3,
      yoyo: true,
      repeat: -1,
      duration: 600,
    });

    // Play result sound
    if (this.won) {
      SoundManager.victory();
    } else {
      SoundManager.gameOver();
    }

    this.started = false;
    this.startDelay = 500; // Brief delay to avoid phantom inputs
  }

  restartGame(inputConfig) {
    if (this.started) return;
    this.started = true;
    SoundManager.menuSelect();
    this.scene.start('GameScene', { inputConfig });
  }

  update(time, delta) {
    this.startDelay -= delta;
    if (this.startDelay <= 0 && !this.started) {
      const config = InputManager.detectAnyPress(this, []);
      if (config) {
        this.restartGame(config);
      }
    }
  }
}
