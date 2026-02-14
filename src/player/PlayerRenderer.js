import { GAME_CONFIG, PLAYER_CHARACTERS } from '../config.js';

export class PlayerRenderer {
  constructor(graphics, characterConfig) {
    this.graphics = graphics;
    this.char = characterConfig || PLAYER_CHARACTERS.PETER;
  }

  draw(x, y, pose, facingRight, showGhost = false) {
    const g = this.graphics;
    const dir = facingRight ? 1 : -1;
    g.clear();

    if (showGhost) {
      const gp = this.transformPose(x - dir * 10, y, pose, dir);
      this.drawFigure(g, gp, 0.12);
    }

    const p = this.transformPose(x, y, pose, dir);
    this.drawFigure(g, p, 1.0);
    this.drawDetails(g, p, dir, 1.0);
  }

  transformPose(x, y, pose, dir) {
    const p = {};
    for (const joint in pose) {
      p[joint] = {
        x: x + pose[joint].x * dir,
        y: y + pose[joint].y,
      };
    }
    return p;
  }

  drawFigure(g, p, alpha) {
    const lw = GAME_CONFIG.LINE_WIDTH;
    const hr = GAME_CONFIG.HEAD_RADIUS;
    const bodyColor = this.char.bodyColor;
    const accentColor = this.char.accentColor;

    // Head - with spider mask
    g.fillStyle(accentColor, 0.4 * alpha);
    g.fillCircle(p.head.x, p.head.y, hr);
    g.lineStyle(lw, accentColor, alpha);
    g.strokeCircle(p.head.x, p.head.y, hr);

    // Eyes
    if (this.char.style === 'electric') {
      // Miles: larger, more angular eyes
      this.drawMilesEyes(g, p, alpha);
    } else {
      this.drawPeterEyes(g, p, alpha);
    }

    // Torso
    g.lineStyle(lw + 1, bodyColor, alpha);
    g.lineBetween(p.neck.x, p.neck.y, p.hip.x, p.hip.y);
    g.lineStyle(1, accentColor, 0.5 * alpha);
    g.lineBetween(p.neck.x, p.neck.y, p.hip.x, p.hip.y);

    // Shoulders
    g.lineStyle(lw, bodyColor, alpha);
    g.lineBetween(p.shoulderL.x, p.shoulderL.y, p.shoulderR.x, p.shoulderR.y);

    // Arms
    g.lineStyle(lw, bodyColor, alpha);
    g.lineBetween(p.shoulderL.x, p.shoulderL.y, p.elbowL.x, p.elbowL.y);
    g.lineBetween(p.elbowL.x, p.elbowL.y, p.handL.x, p.handL.y);
    g.lineBetween(p.shoulderR.x, p.shoulderR.y, p.elbowR.x, p.elbowR.y);
    g.lineBetween(p.elbowR.x, p.elbowR.y, p.handR.x, p.handR.y);

    // Legs
    g.lineStyle(lw, accentColor, alpha);
    g.lineBetween(p.hip.x, p.hip.y, p.kneeL.x, p.kneeL.y);
    g.lineBetween(p.kneeL.x, p.kneeL.y, p.footL.x, p.footL.y);
    g.lineBetween(p.hip.x, p.hip.y, p.kneeR.x, p.kneeR.y);
    g.lineBetween(p.kneeR.x, p.kneeR.y, p.footR.x, p.footR.y);

    // Joint dots
    g.fillStyle(bodyColor, 0.7 * alpha);
    const jr = 2.5;
    g.fillCircle(p.elbowL.x, p.elbowL.y, jr);
    g.fillCircle(p.elbowR.x, p.elbowR.y, jr);

    g.fillStyle(accentColor, 0.7 * alpha);
    g.fillCircle(p.kneeL.x, p.kneeL.y, jr);
    g.fillCircle(p.kneeR.x, p.kneeR.y, jr);

    // Hands and feet
    const er = 3;
    g.fillStyle(bodyColor, alpha);
    g.fillCircle(p.handL.x, p.handL.y, er);
    g.fillCircle(p.handR.x, p.handR.y, er);
    g.fillStyle(accentColor, alpha);
    g.fillCircle(p.footL.x, p.footL.y, er);
    g.fillCircle(p.footR.x, p.footR.y, er);
  }

  drawPeterEyes(g, p, alpha) {
    const eyeOffsetX = 4;
    const eyeY = p.head.y - 1;
    g.fillStyle(0xffffff, 0.9 * alpha);
    // Left eye
    g.beginPath();
    g.moveTo(p.head.x - eyeOffsetX - 3, eyeY);
    g.lineTo(p.head.x - eyeOffsetX, eyeY - 3);
    g.lineTo(p.head.x - eyeOffsetX + 3, eyeY);
    g.lineTo(p.head.x - eyeOffsetX, eyeY + 2);
    g.closePath();
    g.fillPath();
    // Right eye
    g.beginPath();
    g.moveTo(p.head.x + eyeOffsetX - 3, eyeY);
    g.lineTo(p.head.x + eyeOffsetX, eyeY - 3);
    g.lineTo(p.head.x + eyeOffsetX + 3, eyeY);
    g.lineTo(p.head.x + eyeOffsetX, eyeY + 2);
    g.closePath();
    g.fillPath();
  }

  drawMilesEyes(g, p, alpha) {
    const eyeOffsetX = 4;
    const eyeY = p.head.y - 1;
    g.fillStyle(0xffffff, 0.95 * alpha);
    // Wider, more angular eyes for Miles
    // Left eye
    g.beginPath();
    g.moveTo(p.head.x - eyeOffsetX - 4, eyeY + 1);
    g.lineTo(p.head.x - eyeOffsetX - 1, eyeY - 3);
    g.lineTo(p.head.x - eyeOffsetX + 3, eyeY - 1);
    g.lineTo(p.head.x - eyeOffsetX, eyeY + 2);
    g.closePath();
    g.fillPath();
    // Right eye
    g.beginPath();
    g.moveTo(p.head.x + eyeOffsetX + 4, eyeY + 1);
    g.lineTo(p.head.x + eyeOffsetX + 1, eyeY - 3);
    g.lineTo(p.head.x + eyeOffsetX - 3, eyeY - 1);
    g.lineTo(p.head.x + eyeOffsetX, eyeY + 2);
    g.closePath();
    g.fillPath();
  }

  drawDetails(g, p, dir, alpha) {
    if (this.char.style === 'electric') {
      this.drawElectricDetails(g, p, dir, alpha);
    } else {
      this.drawWebPatternDetails(g, p, dir, alpha);
    }
  }

  drawWebPatternDetails(g, p, dir, alpha) {
    const nx = p.neck.x;
    const ny = p.neck.y;
    const hx = p.hip.x;
    const hy = p.hip.y;
    const midX = (nx + hx) / 2;
    const midY = (ny + hy) / 2;

    g.lineStyle(1, 0xffffff, 0.15 * alpha);
    g.lineBetween(midX - 8, midY - 8, midX + 8, midY + 8);
    g.lineBetween(midX + 8, midY - 8, midX - 8, midY + 8);
    g.lineBetween(midX, midY - 10, midX, midY + 10);
  }

  drawElectricDetails(g, p, dir, alpha) {
    const electricColor = this.char.electricColor;
    const t = Date.now() / 100;

    // Electric arc lines on chest (instead of web pattern)
    const nx = p.neck.x;
    const ny = p.neck.y;
    const hx = p.hip.x;
    const hy = p.hip.y;

    g.lineStyle(1, electricColor, 0.4 * alpha);
    // Zigzag electric arc down torso
    const segments = 4;
    let prevX = nx, prevY = ny;
    for (let i = 1; i <= segments; i++) {
      const frac = i / segments;
      const baseX = nx + (hx - nx) * frac;
      const baseY = ny + (hy - ny) * frac;
      const jitter = i < segments ? Math.sin(t + i * 2.1) * 5 : 0;
      g.lineBetween(prevX, prevY, baseX + jitter, baseY);
      prevX = baseX + jitter;
      prevY = baseY;
    }

    // Small electric sparks from shoulders (animated)
    const sparkAlpha = (Math.sin(t * 1.5) * 0.5 + 0.5) * 0.3 * alpha;
    g.lineStyle(1, electricColor, sparkAlpha);
    const sx = p.shoulderR.x + dir * 3;
    const sy = p.shoulderR.y;
    g.lineBetween(sx, sy, sx + Math.sin(t * 3) * 6, sy - 4 + Math.cos(t * 2) * 3);
    g.lineBetween(sx, sy, sx + Math.cos(t * 2.5) * 5, sy + 3 + Math.sin(t * 3.5) * 3);
  }
}
