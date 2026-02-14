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

    // Attach point slightly ahead of player based on velocity
    const ahead = Math.sign(playerVelX) * GAME_CONFIG.WEB_ATTACH_AHEAD;
    this.anchorX = playerX + ahead + (Math.random() - 0.5) * 40;
    this.anchorY = GAME_CONFIG.CEILING_Y + Math.random() * 30;

    // Rope length = distance from player to anchor, clamped
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

  update(delta, playerBody) {
    if (this.cooldownTimer > 0) {
      this.cooldownTimer -= delta;
    }

    if (!this.active) return;

    const px = playerBody.x;
    const py = playerBody.y;
    const dx = px - this.anchorX;
    const dy = py - this.anchorY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Hard rope constraint - if player is beyond rope length, pull back
    if (dist > this.ropeLength) {
      // Normalize direction from anchor to player
      const nx = dx / dist;
      const ny = dy / dist;

      // Snap position to rope length
      const constrainedX = this.anchorX + nx * this.ropeLength;
      const constrainedY = this.anchorY + ny * this.ropeLength;
      playerBody.x = constrainedX;
      playerBody.y = constrainedY;

      // Project velocity onto tangent (perpendicular to rope)
      const vx = playerBody.body.velocity.x;
      const vy = playerBody.body.velocity.y;

      // Radial component (along rope)
      const radialSpeed = vx * nx + vy * ny;

      // Remove radial component if it's pulling outward
      if (radialSpeed > 0) {
        playerBody.body.velocity.x = vx - radialSpeed * nx;
        playerBody.body.velocity.y = vy - radialSpeed * ny;
      }
    }
  }

  getVelocityBoost(playerBody) {
    // On release, multiply velocity for satisfying momentum
    return {
      x: playerBody.body.velocity.x * GAME_CONFIG.WEB_RELEASE_BOOST,
      y: playerBody.body.velocity.y * GAME_CONFIG.WEB_RELEASE_BOOST,
    };
  }

  pump(direction, playerBody) {
    // Add force in swing direction for input pumping
    const dx = playerBody.x - this.anchorX;
    const dy = playerBody.y - this.anchorY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist === 0) return;

    // Tangent direction (perpendicular to rope, in swing direction)
    const nx = dx / dist;
    const ny = dy / dist;
    // Tangent = (-ny, nx) or (ny, -nx)
    const tangentX = -ny * direction;
    const tangentY = nx * direction;

    playerBody.body.velocity.x += tangentX * GAME_CONFIG.WEB_PUMP_FORCE * 0.016;
    playerBody.body.velocity.y += tangentY * GAME_CONFIG.WEB_PUMP_FORCE * 0.016;
  }
}
