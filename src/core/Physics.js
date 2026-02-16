import { GAME_CONFIG } from '../config.js';

export class PhysicsBody {
  constructor(x, y, width, height) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.velocity = { x: 0, y: 0 };
    this.maxVelocity = { x: 800, y: 1000 };
    this.allowGravity = true;
    this.blocked = { down: false, up: false, left: false, right: false };
  }

  setMaxVelocity(x, y) {
    this.maxVelocity.x = x;
    this.maxVelocity.y = y;
  }

  setAllowGravity(val) {
    this.allowGravity = val;
  }

  update(delta, groundY) {
    const dt = delta / 1000;

    // Apply gravity
    if (this.allowGravity) {
      this.velocity.y += GAME_CONFIG.GRAVITY * dt;
    }

    // Clamp velocity
    this.velocity.x = Math.max(-this.maxVelocity.x, Math.min(this.maxVelocity.x, this.velocity.x));
    this.velocity.y = Math.max(-this.maxVelocity.y, Math.min(this.maxVelocity.y, this.velocity.y));

    // Move
    this.x += this.velocity.x * dt;
    this.y += this.velocity.y * dt;

    // Ground collision
    this.blocked.down = false;
    const feetY = this.y + this.height / 2;
    if (feetY >= groundY) {
      this.y = groundY - this.height / 2;
      if (this.velocity.y > 0) {
        this.velocity.y = 0;
      }
      this.blocked.down = true;
    }
  }
}

export function overlaps(a, b) {
  return a.x < b.x + b.width && a.x + a.width > b.x &&
         a.y < b.y + b.height && a.y + a.height > b.y;
}

export function makeRect(x, y, width, height) {
  return { x, y, width, height };
}
