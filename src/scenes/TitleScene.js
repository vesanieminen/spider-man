import Phaser from 'phaser';
import { GAME_CONFIG } from '../config.js';
import { SoundManager } from '../audio/SoundManager.js';

export class TitleScene extends Phaser.Scene {
  constructor() {
    super('TitleScene');
  }

  create() {
    const cx = GAME_CONFIG.WIDTH / 2;
    const cy = GAME_CONFIG.HEIGHT / 2;

    // Dark city background
    this.add.graphics().fillStyle(0x0a0a1e, 1).fillRect(0, 0, GAME_CONFIG.WIDTH, GAME_CONFIG.HEIGHT);

    // Simple city silhouette
    const bg = this.add.graphics();
    bg.fillStyle(0x111122, 1);
    for (let i = 0; i < 15; i++) {
      const bx = i * 90;
      const bw = 60 + Math.random() * 30;
      const bh = 80 + Math.random() * 200;
      bg.fillRect(bx, GAME_CONFIG.HEIGHT - bh, bw, bh);
      // Windows
      bg.fillStyle(0xffdd88, 0.3);
      for (let wy = GAME_CONFIG.HEIGHT - bh + 15; wy < GAME_CONFIG.HEIGHT - 20; wy += 20) {
        for (let wx = bx + 8; wx < bx + bw - 8; wx += 16) {
          if (Math.random() < 0.3) {
            bg.fillRect(wx, wy, 8, 10);
          }
        }
      }
      bg.fillStyle(0x111122, 1);
    }

    // Animated swinging stick figure
    this.swingAngle = 0;
    this.swingGraphics = this.add.graphics().setDepth(10);
    this.webAnchorX = cx + 50;
    this.webAnchorY = 100;

    // Title
    this.add.text(cx, 120, 'WEB SLINGER', {
      fontSize: '64px',
      fontFamily: 'monospace',
      color: '#ff3333',
      fontStyle: 'bold',
      stroke: '#000',
      strokeThickness: 6,
    }).setOrigin(0.5).setDepth(20);

    this.add.text(cx, 180, 'A Spider Beat \'Em Up', {
      fontSize: '20px',
      fontFamily: 'monospace',
      color: '#6688ff',
      stroke: '#000',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(20);

    // Controls info
    const controls = [
      'A/D - Move    W/Space - Jump',
      'J - Punch    K - Kick',
      'Hold L - Web Swing    Tap L - Web Shot',
      'S+K (air) - Dive Kick',
    ];
    controls.forEach((line, i) => {
      this.add.text(cx, 420 + i * 28, line, {
        fontSize: '16px',
        fontFamily: 'monospace',
        color: '#aaaaaa',
        stroke: '#000',
        strokeThickness: 2,
      }).setOrigin(0.5).setDepth(20);
    });

    // Start prompt
    this.startText = this.add.text(cx, 580, 'Press SPACE or ENTER to Start', {
      fontSize: '24px',
      fontFamily: 'monospace',
      color: '#ffff00',
      stroke: '#000',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(20);

    // Input
    this.input.keyboard.on('keydown-SPACE', () => this.startGame());
    this.input.keyboard.on('keydown-ENTER', () => this.startGame());

    // Gamepad
    if (this.input.gamepad) {
      this.input.gamepad.on('down', () => this.startGame());
    }
  }

  startGame() {
    SoundManager.menuSelect();
    this.scene.start('GameScene');
  }

  update(time, delta) {
    // Animate swinging figure
    this.swingAngle = Math.sin(time / 600) * 0.8;
    const ropeLen = 160;
    const px = this.webAnchorX + Math.sin(this.swingAngle) * ropeLen;
    const py = this.webAnchorY + Math.cos(this.swingAngle) * ropeLen;

    const g = this.swingGraphics;
    g.clear();

    // Web line
    g.lineStyle(2, 0xffffff, 0.7);
    g.lineBetween(px, py - 20, this.webAnchorX, this.webAnchorY);

    // Simple stick figure
    const bodyColor = 0x3366ff;
    const accentColor = 0xee2222;

    // Head
    g.fillStyle(accentColor, 0.5);
    g.fillCircle(px, py - 48, 10);
    g.lineStyle(3, accentColor, 1);
    g.strokeCircle(px, py - 48, 10);

    // Eyes
    g.fillStyle(0xffffff, 0.9);
    g.fillCircle(px - 4, py - 49, 2.5);
    g.fillCircle(px + 4, py - 49, 2.5);

    // Body
    g.lineStyle(4, bodyColor, 1);
    g.lineBetween(px, py - 38, px, py - 4);

    // Arms (one reaching up to web)
    g.lineStyle(3, bodyColor, 1);
    const armAngle = this.swingAngle * 0.5;
    g.lineBetween(px, py - 34, px + Math.sin(armAngle + 0.5) * 20, py - 50);
    g.lineBetween(px, py - 34, px - 15, py - 20);

    // Legs
    g.lineStyle(3, accentColor, 1);
    const legSwing = Math.sin(this.swingAngle * 2) * 8;
    g.lineBetween(px, py - 4, px - 8 + legSwing, py + 26);
    g.lineBetween(px, py - 4, px + 8 - legSwing, py + 26);

    // Blink start text
    this.startText.setAlpha(0.5 + Math.sin(time / 300) * 0.5);
  }
}
