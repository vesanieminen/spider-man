import { GAME_CONFIG } from '../config.js';

export class EnemyRenderer {
  constructor(graphics) {
    this.graphics = graphics;
  }

  draw(x, y, pose, facingRight, color, scale = 1.0, headScale = 1.0, alpha = 1.0, type = null) {
    const g = this.graphics;
    const dir = facingRight ? 1 : -1;
    g.clear();

    const p = this.transformPose(x, y, pose, dir, scale);
    this.drawFigure(g, p, color, alpha, scale, headScale);

    if (type && type.isBoss) {
      this.drawBossDetails(g, p, dir, alpha, type, scale);
    }
  }

  transformPose(x, y, pose, dir, scale) {
    const p = {};
    for (const joint in pose) {
      p[joint] = {
        x: x + pose[joint].x * dir * scale,
        y: y + pose[joint].y * scale,
      };
    }
    return p;
  }

  drawFigure(g, p, color, alpha, scale, headScale) {
    const lw = GAME_CONFIG.LINE_WIDTH * scale;
    const hr = GAME_CONFIG.HEAD_RADIUS * headScale;

    // Head
    g.fillStyle(color, 0.3 * alpha);
    g.fillCircle(p.head.x, p.head.y, hr);
    g.lineStyle(lw, color, alpha);
    g.strokeCircle(p.head.x, p.head.y, hr);

    // Torso
    g.lineStyle(lw + 1, color, alpha);
    g.lineBetween(p.neck.x, p.neck.y, p.hip.x, p.hip.y);

    // Shoulders
    g.lineStyle(lw, color, alpha);
    g.lineBetween(p.shoulderL.x, p.shoulderL.y, p.shoulderR.x, p.shoulderR.y);

    // Arms
    g.lineBetween(p.shoulderL.x, p.shoulderL.y, p.elbowL.x, p.elbowL.y);
    g.lineBetween(p.elbowL.x, p.elbowL.y, p.handL.x, p.handL.y);
    g.lineBetween(p.shoulderR.x, p.shoulderR.y, p.elbowR.x, p.elbowR.y);
    g.lineBetween(p.elbowR.x, p.elbowR.y, p.handR.x, p.handR.y);

    // Legs
    g.lineBetween(p.hip.x, p.hip.y, p.kneeL.x, p.kneeL.y);
    g.lineBetween(p.kneeL.x, p.kneeL.y, p.footL.x, p.footL.y);
    g.lineBetween(p.hip.x, p.hip.y, p.kneeR.x, p.kneeR.y);
    g.lineBetween(p.kneeR.x, p.kneeR.y, p.footR.x, p.footR.y);

    // Joint dots
    g.fillStyle(color, 0.7 * alpha);
    const jr = 2 * scale;
    g.fillCircle(p.elbowL.x, p.elbowL.y, jr);
    g.fillCircle(p.elbowR.x, p.elbowR.y, jr);
    g.fillCircle(p.kneeL.x, p.kneeL.y, jr);
    g.fillCircle(p.kneeR.x, p.kneeR.y, jr);

    // Hands/feet
    const er = 2.5 * scale;
    g.fillCircle(p.handL.x, p.handL.y, er);
    g.fillCircle(p.handR.x, p.handR.y, er);
    g.fillCircle(p.footL.x, p.footL.y, er);
    g.fillCircle(p.footR.x, p.footR.y, er);
  }

  drawBossDetails(g, p, dir, alpha, type, scale) {
    const accent = type.accentColor || 0xffffff;
    const t = Date.now() / 100;

    switch (type.name) {
      case 'Venom':
        this.drawVenomDetails(g, p, dir, alpha, accent, t, scale);
        break;
      case 'Green Goblin':
        this.drawGoblinDetails(g, p, dir, alpha, accent, t, scale);
        break;
      case 'Doc Ock':
        this.drawDocOckDetails(g, p, dir, alpha, accent, t, scale);
        break;
      case 'Lizard':
        this.drawLizardDetails(g, p, dir, alpha, accent, t, scale);
        break;
      case 'Rhino':
        this.drawRhinoDetails(g, p, dir, alpha, accent, t, scale);
        break;
    }
  }

  drawVenomDetails(g, p, dir, alpha, accent, t, scale) {
    // White spider symbol on chest
    const cx = (p.neck.x + p.hip.x) / 2;
    const cy = (p.neck.y + p.hip.y) / 2;
    g.lineStyle(1.5, accent, 0.8 * alpha);
    // Spider body
    g.fillStyle(accent, 0.6 * alpha);
    g.fillCircle(cx, cy - 3, 2.5);
    g.fillCircle(cx, cy + 2, 2);
    // Spider legs
    for (let i = 0; i < 4; i++) {
      const angle = (i - 1.5) * 0.4 - Math.PI / 2;
      const len = 6 + (i % 2) * 2;
      g.lineBetween(cx, cy - 2, cx + Math.cos(angle) * len, cy - 2 + Math.sin(angle) * len);
      g.lineBetween(cx, cy - 2, cx - Math.cos(angle) * len, cy - 2 + Math.sin(angle) * len);
    }

    // Large triangle eyes
    g.fillStyle(accent, 0.9 * alpha);
    const eyeY = p.head.y - 1;
    // Left eye - big angular
    g.beginPath();
    g.moveTo(p.head.x - 7, eyeY + 2);
    g.lineTo(p.head.x - 3, eyeY - 4);
    g.lineTo(p.head.x - 1, eyeY + 1);
    g.closePath();
    g.fillPath();
    // Right eye
    g.beginPath();
    g.moveTo(p.head.x + 7, eyeY + 2);
    g.lineTo(p.head.x + 3, eyeY - 4);
    g.lineTo(p.head.x + 1, eyeY + 1);
    g.closePath();
    g.fillPath();

    // Wavy tendril lines from shoulders
    g.lineStyle(1, accent, 0.3 * alpha);
    for (let side = -1; side <= 1; side += 2) {
      const sx = side === -1 ? p.shoulderL.x : p.shoulderR.x;
      const sy = side === -1 ? p.shoulderL.y : p.shoulderR.y;
      for (let i = 0; i < 3; i++) {
        const len = 8 + i * 5;
        const wave = Math.sin(t * 2 + i + side) * 4;
        g.lineBetween(sx, sy, sx + side * len + wave, sy - 5 + i * 3);
      }
    }
  }

  drawGoblinDetails(g, p, dir, alpha, accent, t, scale) {
    // Glider line under feet
    g.lineStyle(3, 0x888888, 0.8 * alpha);
    const gliderY = Math.max(p.footL.y, p.footR.y) + 5;
    const gliderCx = (p.footL.x + p.footR.x) / 2;
    g.lineBetween(gliderCx - 20 * scale, gliderY, gliderCx + 20 * scale, gliderY);
    // Glider wings
    g.lineStyle(2, 0x666666, 0.6 * alpha);
    g.lineBetween(gliderCx - 20 * scale, gliderY, gliderCx - 30 * scale, gliderY - 5);
    g.lineBetween(gliderCx + 20 * scale, gliderY, gliderCx + 30 * scale, gliderY - 5);

    // Purple hood/hat triangle on head
    g.fillStyle(accent, 0.6 * alpha);
    g.beginPath();
    g.moveTo(p.head.x - 8, p.head.y + 2);
    g.lineTo(p.head.x, p.head.y - 16);
    g.lineTo(p.head.x + 8, p.head.y + 2);
    g.closePath();
    g.fillPath();

    // Glowing eyes
    g.fillStyle(0xffff00, 0.9 * alpha);
    g.fillCircle(p.head.x - 3, p.head.y - 1, 2);
    g.fillCircle(p.head.x + 3, p.head.y - 1, 2);

    // Jet flame from glider
    const flameAlpha = (Math.sin(t * 5) * 0.3 + 0.5) * alpha;
    g.fillStyle(0xff4400, flameAlpha);
    g.fillCircle(gliderCx, gliderY + 6, 3);
    g.fillStyle(0xffaa00, flameAlpha * 0.7);
    g.fillCircle(gliderCx, gliderY + 10, 2);
  }

  drawDocOckDetails(g, p, dir, alpha, accent, t, scale) {
    // 4 animated tentacle lines from back
    const backX = (p.neck.x + p.hip.x) / 2 - dir * 6;
    const backY = (p.neck.y + p.hip.y) / 2;

    g.lineStyle(2, accent, 0.7 * alpha);
    for (let i = 0; i < 4; i++) {
      const baseAngle = (i - 1.5) * 0.6 + (dir > 0 ? Math.PI : 0);
      const segments = 4;
      let px = backX, py = backY;
      for (let s = 1; s <= segments; s++) {
        const segLen = 12 * scale;
        const wave = Math.sin(t * 2 + i * 1.5 + s * 0.8) * 6;
        const nx = px + Math.cos(baseAngle + wave * 0.05) * segLen + wave * (s / segments);
        const ny = py + Math.sin(baseAngle) * segLen * 0.3 + (s - 2) * 4;
        g.lineBetween(px, py, nx, ny);
        px = nx;
        py = ny;
      }
      // Claw at end
      g.fillStyle(accent, 0.8 * alpha);
      g.fillCircle(px, py, 3 * scale);
    }

    // Glasses
    g.lineStyle(1, 0xffffff, 0.6 * alpha);
    g.strokeCircle(p.head.x - 4, p.head.y, 3);
    g.strokeCircle(p.head.x + 4, p.head.y, 3);
    g.lineBetween(p.head.x - 1, p.head.y, p.head.x + 1, p.head.y);
  }

  drawLizardDetails(g, p, dir, alpha, accent, t, scale) {
    // Tail extending from hip backward
    g.lineStyle(3, accent, 0.7 * alpha);
    const tailBaseX = p.hip.x - dir * 5;
    const tailBaseY = p.hip.y;
    const segments = 5;
    let px = tailBaseX, py = tailBaseY;
    for (let i = 1; i <= segments; i++) {
      const wave = Math.sin(t * 1.5 + i * 0.9) * 4;
      const nx = px - dir * 10 * scale;
      const ny = py + wave + (i > 3 ? (i - 3) * 3 : 0);
      g.lineBetween(px, py, nx, ny);
      px = nx;
      py = ny;
    }

    // Elongated head (snout)
    g.lineStyle(2, accent, 0.6 * alpha);
    g.lineBetween(p.head.x + dir * 8, p.head.y, p.head.x + dir * 16, p.head.y + 2);

    // Reptile eyes (vertical slits)
    g.fillStyle(0xffff00, 0.9 * alpha);
    g.fillCircle(p.head.x - 3, p.head.y - 1, 2.5);
    g.fillCircle(p.head.x + 3, p.head.y - 1, 2.5);
    g.fillStyle(0x000000, 0.9 * alpha);
    g.fillRect(p.head.x - 3.5, p.head.y - 3, 1, 4);
    g.fillRect(p.head.x + 2.5, p.head.y - 3, 1, 4);
  }

  drawRhinoDetails(g, p, dir, alpha, accent, t, scale) {
    // Horn triangle on head
    g.fillStyle(accent, 0.8 * alpha);
    g.beginPath();
    g.moveTo(p.head.x + dir * 6, p.head.y);
    g.lineTo(p.head.x + dir * 20, p.head.y - 4);
    g.lineTo(p.head.x + dir * 8, p.head.y + 4);
    g.closePath();
    g.fillPath();

    // Extra-thick torso (armor plating)
    g.lineStyle(3, accent, 0.3 * alpha);
    g.lineBetween(p.neck.x - 4, p.neck.y, p.hip.x - 4, p.hip.y);
    g.lineBetween(p.neck.x + 4, p.neck.y, p.hip.x + 4, p.hip.y);

    // Shoulder armor
    g.fillStyle(accent, 0.4 * alpha);
    g.fillCircle(p.shoulderL.x, p.shoulderL.y, 5 * scale);
    g.fillCircle(p.shoulderR.x, p.shoulderR.y, 5 * scale);

    // Small angry eyes
    g.fillStyle(0xff0000, 0.8 * alpha);
    g.fillCircle(p.head.x - 3, p.head.y - 1, 1.5);
    g.fillCircle(p.head.x + 3, p.head.y - 1, 1.5);
  }
}
