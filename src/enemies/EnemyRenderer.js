import { GAME_CONFIG } from '../config.js';

export class EnemyRenderer {
  constructor(graphics) {
    this.graphics = graphics;
  }

  draw(x, y, pose, facingRight, color, scale = 1.0, headScale = 1.0, alpha = 1.0) {
    const g = this.graphics;
    const dir = facingRight ? 1 : -1;
    g.clear();

    const p = this.transformPose(x, y, pose, dir, scale);
    this.drawFigure(g, p, color, alpha, scale, headScale);
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
}
