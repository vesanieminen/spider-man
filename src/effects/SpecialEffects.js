/**
 * Visual effects - self-cleaning graphics that auto-destroy.
 */

export function spawnHitSparks(scene, x, y, color = 0xffff00, count = 8) {
  const g = scene.add.graphics().setDepth(25);
  const sparks = [];
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 100 + Math.random() * 200;
    sparks.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 50,
      len: 3 + Math.random() * 6,
    });
  }
  scene.tweens.addCounter({
    from: 0, to: 1, duration: 250,
    onUpdate: (tween) => {
      g.clear();
      const t = tween.getValue();
      sparks.forEach(s => {
        s.x += s.vx * 0.016;
        s.y += s.vy * 0.016;
        const angle = Math.atan2(s.vy, s.vx);
        g.lineStyle(2, color, 1 - t);
        g.lineBetween(s.x, s.y, s.x - Math.cos(angle) * s.len, s.y - Math.sin(angle) * s.len);
        g.fillStyle(0xffffff, (1 - t) * 0.6);
        g.fillCircle(s.x, s.y, 2);
      });
    },
    onComplete: () => g.destroy()
  });
}

export function spawnSpeedLines(scene, x, y, dirX, color = 0xffffff, count = 5) {
  const g = scene.add.graphics().setDepth(18);
  for (let i = 0; i < count; i++) {
    const ly = y - 30 + Math.random() * 60;
    const lx = x - dirX * (10 + i * 12);
    const len = 20 + Math.random() * 25;
    g.lineStyle(2, color, 0.6 - i * 0.08);
    g.lineBetween(lx, ly, lx - dirX * len, ly);
  }
  scene.tweens.add({ targets: g, alpha: 0, duration: 200, onComplete: () => g.destroy() });
}

export function spawnDustPuff(scene, x, y, color = 0xaaaaaa) {
  const g = scene.add.graphics().setDepth(15);
  for (let i = 0; i < 6; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = 5 + Math.random() * 15;
    const size = 3 + Math.random() * 4;
    g.fillStyle(color, 0.4);
    g.fillCircle(x + Math.cos(angle) * dist, y + Math.sin(angle) * dist, size);
  }
  scene.tweens.add({ targets: g, alpha: 0, duration: 400, onComplete: () => g.destroy() });
}

export function spawnShockwave(scene, x, y, color = 0xffaa00, maxRadius = 80) {
  const g = scene.add.graphics().setDepth(22);
  scene.tweens.addCounter({
    from: 10, to: maxRadius, duration: 400,
    onUpdate: (tween) => {
      g.clear();
      const r = tween.getValue();
      const t = (r - 10) / (maxRadius - 10);
      g.lineStyle(3, color, (1 - t) * 0.8);
      g.strokeCircle(x, y, r);
      g.lineStyle(2, 0xffffff, (1 - t) * 0.4);
      g.strokeCircle(x, y, r * 0.6);
    },
    onComplete: () => g.destroy()
  });
}

export function spawnWebHitEffect(scene, x, y) {
  const g = scene.add.graphics().setDepth(22);
  // White web splat
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2;
    const len = 8 + Math.random() * 12;
    g.lineStyle(2, 0xffffff, 0.8);
    g.lineBetween(x, y, x + Math.cos(angle) * len, y + Math.sin(angle) * len);
  }
  g.fillStyle(0xffffff, 0.6);
  g.fillCircle(x, y, 5);
  scene.tweens.add({ targets: g, alpha: 0, duration: 600, onComplete: () => g.destroy() });
}

export function spawnEnemyDeathEffect(scene, x, y, color) {
  // Shatter pieces
  const g = scene.add.graphics().setDepth(25);
  const pieces = [];
  for (let i = 0; i < 12; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 150 + Math.random() * 250;
    pieces.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 100,
      size: 2 + Math.random() * 5,
      rot: Math.random() * Math.PI,
    });
  }
  scene.tweens.addCounter({
    from: 0, to: 1, duration: 600,
    onUpdate: (tween) => {
      g.clear();
      const t = tween.getValue();
      pieces.forEach(p => {
        p.x += p.vx * 0.016;
        p.y += p.vy * 0.016;
        p.vy += 400 * 0.016;
        g.fillStyle(color, 1 - t);
        g.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      });
    },
    onComplete: () => g.destroy()
  });
}

export function spawnComboText(scene, x, y, text, color = 0xffff00) {
  const txt = scene.add.text(x, y, text, {
    fontSize: '24px',
    fontFamily: 'monospace',
    color: '#' + color.toString(16).padStart(6, '0'),
    fontStyle: 'bold',
    stroke: '#000',
    strokeThickness: 3,
  }).setDepth(30).setOrigin(0.5);

  scene.tweens.add({
    targets: txt,
    y: y - 40,
    alpha: 0,
    scaleX: 1.3,
    scaleY: 1.3,
    duration: 800,
    ease: 'Power2',
    onComplete: () => txt.destroy(),
  });
}

export function spawnStyleBonus(scene, x, y, text) {
  const txt = scene.add.text(x, y - 30, text, {
    fontSize: '20px',
    fontFamily: 'monospace',
    color: '#ff6600',
    fontStyle: 'bold',
    stroke: '#000',
    strokeThickness: 3,
  }).setDepth(30).setOrigin(0.5);

  scene.tweens.add({
    targets: txt,
    y: y - 70,
    alpha: 0,
    scaleX: 1.5,
    scaleY: 1.5,
    duration: 1000,
    ease: 'Power2',
    onComplete: () => txt.destroy(),
  });
}

export function spawnLandingDust(scene, x, y) {
  const g = scene.add.graphics().setDepth(15);
  for (let i = 0; i < 8; i++) {
    const side = i < 4 ? -1 : 1;
    const dist = 5 + Math.random() * 20;
    const size = 2 + Math.random() * 3;
    g.fillStyle(0x888888, 0.5);
    g.fillCircle(x + side * dist, y + Math.random() * 4, size);
  }
  scene.tweens.add({ targets: g, alpha: 0, duration: 300, onComplete: () => g.destroy() });
}

export function spawnDiveKickShockwave(scene, x, y) {
  spawnShockwave(scene, x, y, 0xff4400, 100);
  spawnDustPuff(scene, x - 20, y, 0x666666);
  spawnDustPuff(scene, x + 20, y, 0x666666);

  // Screen flash
  const flash = scene.add.graphics().setDepth(100);
  flash.fillStyle(0xffffff, 0.3);
  flash.fillRect(
    scene.cameras.main.scrollX,
    scene.cameras.main.scrollY,
    GAME_WIDTH, GAME_HEIGHT
  );
  scene.tweens.add({ targets: flash, alpha: 0, duration: 100, onComplete: () => flash.destroy() });
}

export function spawnVenomStrikeEffect(scene, x, y) {
  // Yellow electric sparks (for Miles' hits on Venom)
  const g = scene.add.graphics().setDepth(26);
  const sparks = [];
  for (let i = 0; i < 12; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 80 + Math.random() * 180;
    sparks.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 30,
      len: 4 + Math.random() * 8,
    });
  }
  scene.tweens.addCounter({
    from: 0, to: 1, duration: 350,
    onUpdate: (tween) => {
      g.clear();
      const t = tween.getValue();
      sparks.forEach(s => {
        s.x += s.vx * 0.016;
        s.y += s.vy * 0.016;
        const angle = Math.atan2(s.vy, s.vx);
        g.lineStyle(2, 0xffee00, 1 - t);
        g.lineBetween(s.x, s.y, s.x - Math.cos(angle) * s.len, s.y - Math.sin(angle) * s.len);
        g.fillStyle(0xffffff, (1 - t) * 0.8);
        g.fillCircle(s.x, s.y, 1.5);
      });
    },
    onComplete: () => g.destroy()
  });
}

export function spawnGrabEffect(scene, x, y) {
  // Tendrils wrapping visual
  const g = scene.add.graphics().setDepth(22);
  scene.tweens.addCounter({
    from: 0, to: 1, duration: 500,
    onUpdate: (tween) => {
      g.clear();
      const t = tween.getValue();
      g.lineStyle(2, 0x444444, (1 - t) * 0.7);
      for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2 + t * 2;
        const r = 15 + t * 5;
        g.lineBetween(
          x + Math.cos(angle) * r, y + Math.sin(angle) * r,
          x + Math.cos(angle + 0.5) * (r + 8), y + Math.sin(angle + 0.5) * (r + 8)
        );
      }
    },
    onComplete: () => g.destroy()
  });
}

export function spawnGroundPoundWave(scene, x, y, range = 120) {
  // Expanding ring shockwave (for Rhino)
  spawnShockwave(scene, x, y, 0x888888, range);
  spawnDustPuff(scene, x - 30, y, 0x666666);
  spawnDustPuff(scene, x + 30, y, 0x666666);
  spawnDustPuff(scene, x, y, 0x888888);
}

export function spawnBossEntryText(scene, name) {
  const cx = GAME_WIDTH / 2;
  const cy = GAME_HEIGHT / 2 - 50;
  const txt = scene.add.text(cx, cy, name.toUpperCase(), {
    fontSize: '48px',
    fontFamily: 'monospace',
    color: '#ff3333',
    fontStyle: 'bold',
    stroke: '#000',
    strokeThickness: 6,
  }).setScrollFactor(0).setDepth(60).setOrigin(0.5).setAlpha(0);

  scene.tweens.add({
    targets: txt,
    alpha: 1,
    duration: 300,
    yoyo: true,
    hold: 1200,
    onComplete: () => txt.destroy(),
  });
}

const GAME_WIDTH = 1280;
const GAME_HEIGHT = 720;
