import { GAME_CONFIG } from '../config.js';

export class WebPhysics {
  constructor() {
    this.active = false;
    this.anchorX = 0;
    this.anchorY = 0;
    this.ropeLength = 0;
    this.cooldownTimer = 0;
  }

  attach(playerX, playerY, playerVelX) {
    if (this.cooldownTimer > 0) return false;

    const ahead = Math.sign(playerVelX) * GAME_CONFIG.WEB_ATTACH_AHEAD;
    this.anchorX = playerX + ahead + (Math.random() - 0.5) * 40;
    this.anchorY = GAME_CONFIG.CEILING_Y + Math.random() * 30;

    const dx = this.anchorX - playerX;
    const dy = this.anchorY - playerY;
    this.ropeLength = Math.sqrt(dx * dx + dy * dy);
    this.ropeLength = Math.max(GAME_CONFIG.WEB_MIN_LENGTH, Math.min(GAME_CONFIG.WEB_MAX_LENGTH, this.ropeLength));

    this.active = true;
    return true;
  }

  release() {
    this.active = false;
    this.cooldownTimer = GAME_CONFIG.WEB_COOLDOWN;
  }

  update(delta, physics) {
    if (this.cooldownTimer > 0) {
      this.cooldownTimer -= delta;
    }

    if (!this.active) return;

    const px = physics.x;
    const py = physics.y;
    const dx = px - this.anchorX;
    const dy = py - this.anchorY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > this.ropeLength) {
      const nx = dx / dist;
      const ny = dy / dist;

      const constrainedX = this.anchorX + nx * this.ropeLength;
      const constrainedY = this.anchorY + ny * this.ropeLength;
      physics.x = constrainedX;
      physics.y = constrainedY;

      const vx = physics.velocity.x;
      const vy = physics.velocity.y;
      const radialSpeed = vx * nx + vy * ny;

      if (radialSpeed > 0) {
        physics.velocity.x = vx - radialSpeed * nx;
        physics.velocity.y = vy - radialSpeed * ny;
      }
    }
  }

  getVelocityBoost(physics) {
    return {
      x: physics.velocity.x * GAME_CONFIG.WEB_RELEASE_BOOST,
      y: physics.velocity.y * GAME_CONFIG.WEB_RELEASE_BOOST,
    };
  }

  pump(direction, physics) {
    const dx = physics.x - this.anchorX;
    const dy = physics.y - this.anchorY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist === 0) return;

    const nx = dx / dist;
    const ny = dy / dist;
    const tangentX = -ny * direction;
    const tangentY = nx * direction;

    physics.velocity.x += tangentX * GAME_CONFIG.WEB_PUMP_FORCE * 0.016;
    physics.velocity.y += tangentY * GAME_CONFIG.WEB_PUMP_FORCE * 0.016;
  }
}
