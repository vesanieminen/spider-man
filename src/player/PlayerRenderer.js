import { GAME_CONFIG } from '../config.js';

export class PlayerRenderer {
  constructor(graphics) {
    this.graphics = graphics;
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
    this.drawSpiderDetails(g, p, dir, 1.0);
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
    const bodyColor = 0x3366ff;
    const accentColor = 0xee2222;

    // Head - with spider mask
    g.fillStyle(accentColor, 0.4 * alpha);
    g.fillCircle(p.head.x, p.head.y, hr);
    g.lineStyle(lw, accentColor, alpha);
    g.strokeCircle(p.head.x, p.head.y, hr);

    // Mask eyes (white lens shapes)
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

    // Torso - blue with red center line
    g.lineStyle(lw + 1, bodyColor, alpha);
    g.lineBetween(p.neck.x, p.neck.y, p.hip.x, p.hip.y);
    g.lineStyle(1, accentColor, 0.5 * alpha);
    g.lineBetween(p.neck.x, p.neck.y, p.hip.x, p.hip.y);

    // Shoulders
    g.lineStyle(lw, bodyColor, alpha);
    g.lineBetween(p.shoulderL.x, p.shoulderL.y, p.shoulderR.x, p.shoulderR.y);

    // Arms - blue
    g.lineStyle(lw, bodyColor, alpha);
    g.lineBetween(p.shoulderL.x, p.shoulderL.y, p.elbowL.x, p.elbowL.y);
    g.lineBetween(p.elbowL.x, p.elbowL.y, p.handL.x, p.handL.y);
    g.lineBetween(p.shoulderR.x, p.shoulderR.y, p.elbowR.x, p.elbowR.y);
    g.lineBetween(p.elbowR.x, p.elbowR.y, p.handR.x, p.handR.y);

    // Legs - red (like spider suit)
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

  drawSpiderDetails(g, p, dir, alpha) {
    // Web pattern lines on torso
    const nx = p.neck.x;
    const ny = p.neck.y;
    const hx = p.hip.x;
    const hy = p.hip.y;
    const midX = (nx + hx) / 2;
    const midY = (ny + hy) / 2;

    g.lineStyle(1, 0xffffff, 0.15 * alpha);
    // Diagonal web lines on chest
    g.lineBetween(midX - 8, midY - 8, midX + 8, midY + 8);
    g.lineBetween(midX + 8, midY - 8, midX - 8, midY + 8);
    g.lineBetween(midX, midY - 10, midX, midY + 10);
  }
}
