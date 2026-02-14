import { GAME_CONFIG } from '../config.js';

/**
 * Procedural parallax city background.
 * Three layers of building silhouettes with windows and neon signs.
 */
export class Background {
  constructor(scene) {
    this.scene = scene;

    // Generate building data once
    this.layers = [
      this.generateBuildings(0.15, 0x111122, 100, 250, 60, 120), // Far
      this.generateBuildings(0.4, 0x161630, 80, 180, 50, 100),   // Mid
      this.generateBuildings(0.7, 0x1a1a3a, 60, 140, 40, 80),    // Near
    ];

    // Create graphics for each layer
    this.layerGraphics = this.layers.map((layer, i) => {
      const g = scene.add.graphics().setDepth(i);
      g.setScrollFactor(layer.scrollFactor);
      return g;
    });

    // Sky gradient (fixed)
    this.skyGraphics = scene.add.graphics().setDepth(-1).setScrollFactor(0);
    this.drawSky();

    // Stars
    this.starGraphics = scene.add.graphics().setDepth(0).setScrollFactor(0.05);
    this.drawStars();

    // Ground
    this.groundGraphics = scene.add.graphics().setDepth(5);
    this.drawGround();

    // Draw buildings
    this.drawAllLayers();
  }

  generateBuildings(scrollFactor, color, minH, maxH, minW, maxW) {
    const buildings = [];
    let x = -200;
    const totalWidth = GAME_CONFIG.LEVEL_WIDTH / scrollFactor + 400;

    while (x < totalWidth) {
      const w = minW + Math.random() * (maxW - minW);
      const h = minH + Math.random() * (maxH - minH);
      const hasNeon = Math.random() < 0.15;
      const neonColor = [0xff0066, 0x00ffaa, 0xff6600, 0x6666ff, 0xffff00][Math.floor(Math.random() * 5)];

      buildings.push({
        x, w, h,
        windows: this.generateWindows(x, w, h),
        hasNeon,
        neonColor,
        neonText: hasNeon ? ['BAR', 'HOTEL', 'PIZZA', '24/7', 'NEON'][Math.floor(Math.random() * 5)] : '',
      });

      x += w + 2 + Math.random() * 20;
    }

    return { buildings, scrollFactor, color };
  }

  generateWindows(bx, bw, bh) {
    const windows = [];
    const cols = Math.floor(bw / 16);
    const rows = Math.floor(bh / 20);
    const startX = bx + (bw - cols * 16) / 2 + 4;
    const startY = GAME_CONFIG.GROUND_Y - bh + 15;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (Math.random() < 0.6) {
          const lit = Math.random() < 0.4;
          windows.push({
            x: startX + c * 16,
            y: startY + r * 20,
            lit,
            color: lit ? (Math.random() < 0.5 ? 0xffdd88 : 0x88bbff) : 0x222233,
          });
        }
      }
    }
    return windows;
  }

  drawSky() {
    const g = this.skyGraphics;
    // Dark blue to near black gradient
    const steps = 12;
    for (let i = 0; i < steps; i++) {
      const t = i / steps;
      const r = Math.floor(5 + t * 10);
      const green = Math.floor(5 + t * 12);
      const b = Math.floor(20 + t * 30);
      const color = (r << 16) | (green << 8) | b;
      g.fillStyle(color, 1);
      g.fillRect(0, (i / steps) * GAME_CONFIG.HEIGHT, GAME_CONFIG.WIDTH, GAME_CONFIG.HEIGHT / steps + 1);
    }

    // Moon
    g.fillStyle(0xeeeedd, 0.9);
    g.fillCircle(1000, 80, 25);
    g.fillStyle(0x0a0a1e, 1);
    g.fillCircle(1010, 75, 22);
  }

  drawStars() {
    const g = this.starGraphics;
    for (let i = 0; i < 80; i++) {
      const x = Math.random() * GAME_CONFIG.WIDTH * 2;
      const y = Math.random() * GAME_CONFIG.HEIGHT * 0.5;
      const size = 0.5 + Math.random() * 1.5;
      const alpha = 0.3 + Math.random() * 0.7;
      g.fillStyle(0xffffff, alpha);
      g.fillCircle(x, y, size);
    }
  }

  drawGround() {
    const g = this.groundGraphics;
    // Main ground
    g.fillStyle(0x222233, 1);
    g.fillRect(0, GAME_CONFIG.GROUND_Y, GAME_CONFIG.LEVEL_WIDTH, GAME_CONFIG.HEIGHT - GAME_CONFIG.GROUND_Y);

    // Road lines
    g.fillStyle(0x333344, 1);
    g.fillRect(0, GAME_CONFIG.GROUND_Y, GAME_CONFIG.LEVEL_WIDTH, 3);

    // Dashed center line
    g.fillStyle(0x555555, 0.5);
    for (let x = 0; x < GAME_CONFIG.LEVEL_WIDTH; x += 60) {
      g.fillRect(x, GAME_CONFIG.GROUND_Y + 40, 30, 2);
    }
  }

  drawAllLayers() {
    for (let i = 0; i < this.layers.length; i++) {
      this.drawBuildingLayer(this.layerGraphics[i], this.layers[i]);
    }
  }

  drawBuildingLayer(g, layer) {
    g.clear();

    for (const b of layer.buildings) {
      const by = GAME_CONFIG.GROUND_Y - b.h;

      // Building silhouette
      g.fillStyle(layer.color, 1);
      g.fillRect(b.x, by, b.w, b.h);

      // Roof edge
      g.fillStyle(layer.color + 0x111111, 1);
      g.fillRect(b.x, by, b.w, 3);

      // Windows
      for (const win of b.windows) {
        g.fillStyle(win.color, win.lit ? 0.8 : 0.3);
        g.fillRect(win.x, win.y, 8, 10);
      }

      // Neon sign
      if (b.hasNeon) {
        const nx = b.x + b.w / 2;
        const ny = by + 20;
        // Glow
        g.fillStyle(b.neonColor, 0.15);
        g.fillCircle(nx, ny, 25);
        // Sign outline
        g.lineStyle(2, b.neonColor, 0.8);
        g.strokeRect(nx - 20, ny - 8, 40, 16);
      }
    }
  }

  destroy() {
    this.skyGraphics.destroy();
    this.starGraphics.destroy();
    this.groundGraphics.destroy();
    this.layerGraphics.forEach(g => g.destroy());
  }
}
