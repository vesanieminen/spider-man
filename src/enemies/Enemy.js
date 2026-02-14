import Phaser from 'phaser';
import { GAME_CONFIG, ENEMY_STATES } from '../config.js';
import { EnemyRenderer } from './EnemyRenderer.js';
import { SoundManager } from '../audio/SoundManager.js';

// Simple enemy poses
const ENEMY_IDLE = {
  head: { x: 0, y: -50 }, neck: { x: 0, y: -38 },
  shoulderL: { x: -12, y: -36 }, shoulderR: { x: 12, y: -36 },
  elbowL: { x: -18, y: -22 }, elbowR: { x: 18, y: -22 },
  handL: { x: -14, y: -10 }, handR: { x: 14, y: -10 },
  hip: { x: 0, y: -4 },
  kneeL: { x: -8, y: 14 }, kneeR: { x: 8, y: 14 },
  footL: { x: -10, y: 30 }, footR: { x: 10, y: 30 },
};

const ENEMY_WALK_A = {
  head: { x: 2, y: -50 }, neck: { x: 2, y: -38 },
  shoulderL: { x: -10, y: -36 }, shoulderR: { x: 14, y: -36 },
  elbowL: { x: -20, y: -28 }, elbowR: { x: 22, y: -24 },
  handL: { x: -16, y: -16 }, handR: { x: 18, y: -14 },
  hip: { x: 0, y: -4 },
  kneeL: { x: -14, y: 10 }, kneeR: { x: 14, y: 12 },
  footL: { x: -18, y: 28 }, footR: { x: 8, y: 30 },
};

const ENEMY_WALK_B = {
  head: { x: 2, y: -50 }, neck: { x: 2, y: -38 },
  shoulderL: { x: -10, y: -36 }, shoulderR: { x: 14, y: -36 },
  elbowL: { x: 4, y: -24 }, elbowR: { x: -12, y: -28 },
  handL: { x: 8, y: -14 }, handR: { x: -8, y: -16 },
  hip: { x: 0, y: -4 },
  kneeL: { x: 14, y: 12 }, kneeR: { x: -14, y: 10 },
  footL: { x: 8, y: 30 }, footR: { x: -18, y: 28 },
};

const ENEMY_ATTACK = {
  head: { x: 4, y: -50 }, neck: { x: 3, y: -38 },
  shoulderL: { x: -10, y: -36 }, shoulderR: { x: 14, y: -36 },
  elbowL: { x: -18, y: -24 }, elbowR: { x: 30, y: -34 },
  handL: { x: -14, y: -12 }, handR: { x: 44, y: -34 },
  hip: { x: 0, y: -4 },
  kneeL: { x: -8, y: 14 }, kneeR: { x: 10, y: 14 },
  footL: { x: -10, y: 30 }, footR: { x: 10, y: 30 },
};

const ENEMY_HIT = {
  head: { x: -6, y: -48 }, neck: { x: -4, y: -36 },
  shoulderL: { x: -16, y: -34 }, shoulderR: { x: 8, y: -34 },
  elbowL: { x: -24, y: -24 }, elbowR: { x: 4, y: -24 },
  handL: { x: -22, y: -14 }, handR: { x: 0, y: -14 },
  hip: { x: -2, y: -2 },
  kneeL: { x: -10, y: 14 }, kneeR: { x: 6, y: 14 },
  footL: { x: -12, y: 30 }, footR: { x: 8, y: 30 },
};

const ENEMY_STUNNED = {
  head: { x: -4, y: -46 }, neck: { x: -2, y: -34 },
  shoulderL: { x: -14, y: -32 }, shoulderR: { x: 10, y: -32 },
  elbowL: { x: -20, y: -22 }, elbowR: { x: 8, y: -22 },
  handL: { x: -18, y: -12 }, handR: { x: 4, y: -12 },
  hip: { x: -2, y: 0 },
  kneeL: { x: -10, y: 16 }, kneeR: { x: 6, y: 16 },
  footL: { x: -12, y: 30 }, footR: { x: 8, y: 30 },
};

function lerpPose(a, b, t) {
  const result = {};
  for (const joint in a) {
    result[joint] = {
      x: a[joint].x + (b[joint].x - a[joint].x) * t,
      y: a[joint].y + (b[joint].y - a[joint].y) * t,
    };
  }
  return result;
}

export class Enemy {
  constructor(scene, x, y, type) {
    this.scene = scene;
    this.type = type;
    this.x = x;
    this.y = y;
    this.health = type.hp;
    this.maxHealth = type.hp;
    this.facingRight = true;
    this.state = ENEMY_STATES.IDLE;
    this.stateTimer = 0;
    this.alive = true;
    this.hasHit = false;

    // Physics body
    this.body = scene.physics.add.sprite(x, y, '__DEFAULT').setVisible(false);
    const bw = GAME_CONFIG.BODY_WIDTH * type.bodyScale;
    const bh = GAME_CONFIG.BODY_HEIGHT * type.bodyScale;
    this.body.setSize(bw, bh);
    this.body.setCollideWorldBounds(false);
    this.body.setMaxVelocity(400, 1000);

    // Graphics
    this.graphics = scene.add.graphics().setDepth(15);
    this.renderer = new EnemyRenderer(this.graphics);

    // Health bar graphics
    this.hpGraphics = scene.add.graphics().setDepth(16);

    // AI timers
    this.aiTimer = 0;
    this.attackCooldown = type.attackCooldown * (0.5 + Math.random() * 0.5);
    this.thinkInterval = 300 + Math.random() * 200;

    // Stun
    this.stunTimer = 0;

    // Hitstop
    this.hitstopTimer = 0;

    // Web visual (when webbed)
    this.webbed = false;
    this.webbedGraphics = scene.add.graphics().setDepth(17);

    // Projectile data
    this.projectile = null;

    // Bomb data
    this.bomb = null;
  }

  update(delta, playerX, playerY) {
    if (!this.alive) return;

    // Hitstop
    if (this.hitstopTimer > 0) {
      this.hitstopTimer -= delta;
      this.draw();
      return;
    }

    this.stateTimer += delta;
    this.x = this.body.x;
    this.y = this.body.y;

    // Stun countdown
    if (this.stunTimer > 0) {
      this.stunTimer -= delta;
      if (this.stunTimer <= 0) {
        this.webbed = false;
        this.webbedGraphics.clear();
        if (this.state === ENEMY_STATES.STUNNED) {
          this.enterState(ENEMY_STATES.IDLE);
        }
      }
    }

    this.updateAI(delta, playerX, playerY);

    this.x = this.body.x;
    this.y = this.body.y;

    this.draw();
    this.drawHealthBar();
    this.drawWebbed();
  }

  updateAI(delta, playerX, playerY) {
    const dx = playerX - this.x;
    const dist = Math.abs(dx);
    this.facingRight = dx > 0;

    switch (this.state) {
      case ENEMY_STATES.IDLE:
      case ENEMY_STATES.WALK:
        this.aiTimer += delta;
        this.attackCooldown -= delta;

        if (this.attackCooldown <= 0 && dist < this.type.attackRange + 20) {
          this.enterState(ENEMY_STATES.ATTACK);
          this.attackCooldown = this.type.attackCooldown;
          this.hasHit = false;
          return;
        }

        // Bomber flees when close
        if (this.type.hasBomb && dist < this.type.fleeDistance) {
          this.enterState(ENEMY_STATES.FLEE);
          return;
        }

        // Bomber throws from range
        if (this.type.hasBomb && this.attackCooldown <= 0 && dist < this.type.attackRange) {
          this.enterState(ENEMY_STATES.THROW);
          this.attackCooldown = this.type.attackCooldown;
          return;
        }

        // Ninja throws projectile from range
        if (this.type.hasProjectile && this.attackCooldown <= 0 && dist < 300 && dist > 100) {
          this.enterState(ENEMY_STATES.THROW);
          this.attackCooldown = this.type.attackCooldown;
          return;
        }

        // Brute charge
        if (this.type.hasCharge && this.attackCooldown <= 0 && dist > 100 && dist < 300) {
          this.enterState(ENEMY_STATES.CHARGE);
          this.attackCooldown = this.type.attackCooldown;
          this.hasHit = false;
          return;
        }

        // Walk toward player
        if (dist > this.type.attackRange - 10) {
          const dir = dx > 0 ? 1 : -1;
          this.body.body.setVelocityX(dir * this.type.speed);
          this.state = ENEMY_STATES.WALK;
        } else {
          this.body.body.setVelocityX(0);
          this.state = ENEMY_STATES.IDLE;
        }
        break;

      case ENEMY_STATES.ATTACK:
        this.body.body.setVelocityX(0);
        if (this.stateTimer >= this.type.attackDuration) {
          this.enterState(ENEMY_STATES.IDLE);
        }
        break;

      case ENEMY_STATES.CHARGE:
        {
          const dir = this.facingRight ? 1 : -1;
          this.body.body.setVelocityX(dir * this.type.chargeSpeed);
          if (this.stateTimer >= 600 || dist < 30) {
            this.enterState(ENEMY_STATES.IDLE);
          }
        }
        break;

      case ENEMY_STATES.THROW:
        this.body.body.setVelocityX(0);
        // Spawn projectile/bomb at midpoint
        if (this.stateTimer >= this.type.attackDuration * 0.5 && !this.hasHit) {
          this.hasHit = true;
          if (this.type.hasProjectile) {
            this.spawnProjectile(playerX, playerY);
          } else if (this.type.hasBomb) {
            this.spawnBomb(playerX, playerY);
          }
        }
        if (this.stateTimer >= this.type.attackDuration) {
          this.enterState(ENEMY_STATES.IDLE);
        }
        break;

      case ENEMY_STATES.FLEE:
        {
          const fleeDir = dx > 0 ? -1 : 1;
          this.body.body.setVelocityX(fleeDir * this.type.speed * 1.5);
          if (dist > this.type.fleeDistance + 50 || this.stateTimer > 1000) {
            this.enterState(ENEMY_STATES.IDLE);
          }
        }
        break;

      case ENEMY_STATES.HIT:
        if (this.stateTimer >= 300) {
          this.enterState(ENEMY_STATES.IDLE);
        }
        break;

      case ENEMY_STATES.STUNNED:
        this.body.body.setVelocityX(0);
        break;

      case ENEMY_STATES.DEAD:
        this.body.body.setVelocityX(0);
        break;
    }
  }

  spawnProjectile(targetX, targetY) {
    const dir = this.facingRight ? 1 : -1;
    this.projectile = {
      x: this.x + dir * 20,
      y: this.y - 20,
      vx: dir * this.type.projectileSpeed,
      vy: 0,
      alive: true,
      timer: 0,
      graphics: this.scene.add.graphics().setDepth(18),
    };
    SoundManager.ninjaThrow();
  }

  spawnBomb(targetX, targetY) {
    const dx = targetX - this.x;
    const dy = targetY - this.y;
    const time = 0.8;
    this.bomb = {
      x: this.x,
      y: this.y - 20,
      vx: dx / time,
      vy: dy / time - 400,
      alive: true,
      timer: 0,
      graphics: this.scene.add.graphics().setDepth(18),
    };
    SoundManager.ninjaThrow();
  }

  updateProjectile(delta) {
    if (!this.projectile || !this.projectile.alive) return null;
    const p = this.projectile;
    p.timer += delta;
    p.x += p.vx * delta / 1000;
    p.y += p.vy * delta / 1000;

    // Draw projectile
    p.graphics.clear();
    p.graphics.fillStyle(this.type.color, 0.9);
    p.graphics.fillCircle(p.x, p.y, 4);
    p.graphics.lineStyle(1, 0xffffff, 0.5);
    p.graphics.strokeCircle(p.x, p.y, 4);

    if (p.timer > 2000) {
      p.alive = false;
      p.graphics.destroy();
      this.projectile = null;
      return null;
    }

    return { x: p.x, y: p.y, damage: this.type.projectileDamage, radius: 8 };
  }

  updateBomb(delta) {
    if (!this.bomb || !this.bomb.alive) return null;
    const b = this.bomb;
    b.timer += delta;
    b.x += b.vx * delta / 1000;
    b.y += b.vy * delta / 1000;
    b.vy += GAME_CONFIG.GRAVITY * delta / 1000;

    // Draw bomb
    b.graphics.clear();
    b.graphics.fillStyle(this.type.color, 0.9);
    b.graphics.fillCircle(b.x, b.y, 6);
    // Fuse spark
    b.graphics.fillStyle(0xffff00, 0.8);
    b.graphics.fillCircle(b.x + 3, b.y - 6, 2);

    // Explode on ground or timeout
    if (b.y >= GAME_CONFIG.GROUND_Y || b.timer > 1500) {
      b.alive = false;
      b.graphics.destroy();
      const result = { x: b.x, y: b.y, damage: this.type.bombDamage, radius: this.type.bombRadius };
      this.bomb = null;
      return result;
    }

    return null;
  }

  enterState(newState) {
    this.state = newState;
    this.stateTimer = 0;
  }

  isAttacking() {
    return this.state === ENEMY_STATES.ATTACK || this.state === ENEMY_STATES.CHARGE;
  }

  isOnActiveFrame() {
    if (this.state === ENEMY_STATES.ATTACK) {
      const dur = this.type.attackDuration;
      return this.stateTimer >= dur * 0.3 && this.stateTimer <= dur * 0.6;
    }
    if (this.state === ENEMY_STATES.CHARGE) {
      return this.stateTimer > 100;
    }
    return false;
  }

  getAttackData() {
    if (this.state === ENEMY_STATES.CHARGE) {
      return {
        damage: this.type.chargeDamage || this.type.damage,
        range: 40,
        knockback: 350,
      };
    }
    return {
      damage: this.type.damage,
      range: this.type.attackRange,
      knockback: 200,
    };
  }

  getHitboxRect() {
    if (!this.isAttacking() || !this.isOnActiveFrame()) return null;
    const attack = this.getAttackData();
    const dir = this.facingRight ? 1 : -1;
    const hbX = dir > 0
      ? this.x + GAME_CONFIG.BODY_WIDTH / 2
      : this.x - GAME_CONFIG.BODY_WIDTH / 2 - attack.range;
    return new Phaser.Geom.Rectangle(
      hbX,
      this.y - GAME_CONFIG.BODY_HEIGHT / 2,
      attack.range,
      GAME_CONFIG.BODY_HEIGHT
    );
  }

  getHurtboxRect() {
    const s = this.type.bodyScale;
    return new Phaser.Geom.Rectangle(
      this.x - GAME_CONFIG.BODY_WIDTH * s / 2,
      this.y - GAME_CONFIG.BODY_HEIGHT * s / 2,
      GAME_CONFIG.BODY_WIDTH * s,
      GAME_CONFIG.BODY_HEIGHT * s
    );
  }

  takeDamage(amount, knockbackX, knockbackY = -150) {
    if (!this.alive) return;

    // Ninja dodge
    if (this.type.dodgeChance && Math.random() < this.type.dodgeChance && this.state !== ENEMY_STATES.HIT) {
      this.enterState(ENEMY_STATES.IDLE);
      const dodgeDir = knockbackX > 0 ? 1 : -1;
      this.body.body.setVelocityX(dodgeDir * (this.type.dodgeSpeed || 300));
      this.body.body.setVelocityY(-200);
      return false;
    }

    this.health -= amount;
    this.body.body.setVelocityX(knockbackX);
    this.body.body.setVelocityY(knockbackY);

    if (this.health <= 0) {
      this.health = 0;
      this.alive = false;
      this.enterState(ENEMY_STATES.DEAD);
      return true;
    }

    this.enterState(ENEMY_STATES.HIT);
    return true;
  }

  stun(duration) {
    this.stunTimer = duration;
    this.webbed = true;
    this.enterState(ENEMY_STATES.STUNNED);
    this.body.body.setVelocityX(0);
  }

  applyHitstop(ms) {
    this.hitstopTimer = ms;
  }

  draw() {
    let pose;
    switch (this.state) {
      case ENEMY_STATES.WALK:
      case ENEMY_STATES.FLEE:
        const walkT = (this.stateTimer % 400) / 400;
        pose = walkT < 0.5
          ? lerpPose(ENEMY_WALK_A, ENEMY_WALK_B, walkT * 2)
          : lerpPose(ENEMY_WALK_B, ENEMY_WALK_A, (walkT - 0.5) * 2);
        break;
      case ENEMY_STATES.ATTACK:
      case ENEMY_STATES.CHARGE:
      case ENEMY_STATES.THROW:
        const atkT = this.stateTimer / this.type.attackDuration;
        if (atkT < 0.3) pose = lerpPose(ENEMY_IDLE, ENEMY_ATTACK, atkT / 0.3);
        else if (atkT < 0.6) pose = ENEMY_ATTACK;
        else pose = lerpPose(ENEMY_ATTACK, ENEMY_IDLE, (atkT - 0.6) / 0.4);
        break;
      case ENEMY_STATES.HIT:
        pose = ENEMY_HIT;
        break;
      case ENEMY_STATES.STUNNED:
        pose = ENEMY_STUNNED;
        break;
      case ENEMY_STATES.DEAD:
        pose = ENEMY_HIT;
        break;
      default:
        // Idle breathing
        const idleT = (this.stateTimer % 800) / 800;
        const breathe = Math.sin(idleT * Math.PI * 2) * 0.5 + 0.5;
        pose = lerpPose(ENEMY_IDLE, {
          ...ENEMY_IDLE,
          head: { x: 0, y: -49 },
          neck: { x: 0, y: -37 },
        }, breathe);
        break;
    }

    const alpha = this.state === ENEMY_STATES.DEAD ? Math.max(0, 1 - this.stateTimer / 500) : 1;
    const drawY = this.y + GAME_CONFIG.BODY_HEIGHT / 2 - 30;

    this.renderer.draw(
      this.x, drawY, pose,
      this.facingRight, this.type.color,
      this.type.bodyScale, this.type.headRadius,
      alpha
    );
  }

  drawHealthBar() {
    this.hpGraphics.clear();
    if (!this.alive || this.health >= this.maxHealth) return;

    const barWidth = 30;
    const barHeight = 4;
    const x = this.x - barWidth / 2;
    const y = this.y - GAME_CONFIG.BODY_HEIGHT * this.type.bodyScale / 2 - 12;

    // Background
    this.hpGraphics.fillStyle(0x333333, 0.8);
    this.hpGraphics.fillRect(x, y, barWidth, barHeight);

    // Health
    const hpPercent = this.health / this.maxHealth;
    const color = hpPercent > 0.5 ? 0x44ff44 : hpPercent > 0.25 ? 0xffaa00 : 0xff3333;
    this.hpGraphics.fillStyle(color, 0.9);
    this.hpGraphics.fillRect(x, y, barWidth * hpPercent, barHeight);
  }

  drawWebbed() {
    this.webbedGraphics.clear();
    if (!this.webbed) return;

    const g = this.webbedGraphics;
    g.lineStyle(1, 0xffffff, 0.5);
    // Web strands wrapping the enemy
    for (let i = 0; i < 4; i++) {
      const y = this.y - 20 + i * 12;
      g.lineBetween(this.x - 15, y, this.x + 15, y + 3);
      g.lineBetween(this.x - 12, y + 3, this.x + 12, y - 2);
    }
  }

  destroy() {
    this.graphics.destroy();
    this.hpGraphics.destroy();
    this.webbedGraphics.destroy();
    if (this.projectile && this.projectile.graphics) this.projectile.graphics.destroy();
    if (this.bomb && this.bomb.graphics) this.bomb.graphics.destroy();
  }
}
