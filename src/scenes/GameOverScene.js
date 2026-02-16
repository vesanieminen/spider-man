import { Scene } from '../core/Scene.js';
import { GAME_CONFIG } from '../config.js';
import { SoundManager } from '../audio/SoundManager.js';
import { InputManager, INPUT_CONFIGS } from '../input/InputManager.js';
import { TweenManager } from '../core/TweenManager.js';

function getGrade(score) {
  if (score >= 15000) return { grade: 'S', color: '#ff6600' };
  if (score >= 10000) return { grade: 'A', color: '#44ff44' };
  if (score >= 6000) return { grade: 'B', color: '#6688ff' };
  if (score >= 3000) return { grade: 'C', color: '#ffff00' };
  return { grade: 'D', color: '#aaaaaa' };
}

export class GameOverScene extends Scene {
  constructor() {
    super('GameOverScene');
  }

  init(data) {
    this.finalScore = (data && data.score) || 0;
    this.maxCombo = (data && data.maxCombo) || 0;
    this.waveReached = (data && data.wave) || 0;
  }

  create() {
    const { grade, color } = getGrade(this.finalScore);

    // Hide game HUD
    document.getElementById('hud').style.display = 'none';

    // Create overlay
    this.overlay = document.createElement('div');
    this.overlay.id = 'gameover-overlay';
    this.overlay.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;font-family:monospace;background:rgba(10,10,30,0.95);';
    this.overlay.innerHTML = `
      <div style="text-align:center;margin-top:60px;font-size:56px;color:#ff3333;font-weight:bold;text-shadow:0 0 6px #000;">GAME OVER</div>
      <div style="text-align:center;margin-top:40px;font-size:24px;color:#6688ff;text-shadow:0 0 3px #000;">WAVE REACHED: ${this.waveReached}</div>
      <div style="text-align:center;margin-top:20px;font-size:32px;color:#fff;text-shadow:0 0 4px #000;">FINAL SCORE: ${this.finalScore}</div>
      <div style="text-align:center;margin-top:20px;font-size:22px;color:#ffff00;text-shadow:0 0 3px #000;">MAX COMBO: ${this.maxCombo}</div>
      <div style="text-align:center;margin-top:30px;font-size:120px;color:${color};font-weight:bold;text-shadow:0 0 8px #000;">${grade}</div>
      <div style="text-align:center;font-size:20px;color:#888;">RANK</div>
      <div id="gameover-restart" style="text-align:center;margin-top:30px;font-size:24px;color:#ffff00;text-shadow:0 0 4px #000;">Press Any Key to Play Again</div>
    `;
    document.getElementById('game-container').appendChild(this.overlay);

    SoundManager.gameOver();

    this.started = false;
    this.startDelay = 500;
    this._blinkTimer = 0;
  }

  restartGame(inputConfig) {
    if (this.started) return;
    this.started = true;
    SoundManager.menuSelect();
    if (this.overlay && this.overlay.parentNode) {
      this.overlay.parentNode.removeChild(this.overlay);
    }
    this.game.startScene('GameScene', { inputConfig });
  }

  update(time, delta) {
    // Blink restart text
    this._blinkTimer += delta;
    const el = document.getElementById('gameover-restart');
    if (el) {
      el.style.opacity = 0.3 + Math.sin(this._blinkTimer / 300) * 0.5;
    }

    this.startDelay -= delta;
    if (this.startDelay <= 0 && !this.started) {
      const config = InputManager.detectAnyPress([]);
      if (config) {
        this.restartGame(config);
      }
    }
  }

  destroy() {
    super.destroy();
    if (this.overlay && this.overlay.parentNode) {
      this.overlay.parentNode.removeChild(this.overlay);
    }
  }
}
