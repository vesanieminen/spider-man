import { GAME_CONFIG, ENEMY_STATES } from '../config.js';
import { CharacterModel3D } from '../rendering/CharacterModel3D.js';
import { PhysicsBody, makeRect } from '../core/Physics.js';
import { SoundManager } from '../audio/SoundManager.js';

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
  constructor(scene3D, x, y, type) {
    this.scene3D = scene3D;
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
    const bw = GAME_CONFIG.BODY_WIDTH * type.bodyScale;
    const bh = GAME_CONFIG.BODY_HEIGHT * type.bodyScale;
    this.physics = new PhysicsBody(x, y, bw, bh);
    this.physics.setMaxVelocity(1500, 1500);

    // 3D model
    this.model = new CharacterModel3D(type.color, type.accentColor || type.color, type.bodyScale);
    this.model.addToScene(scene3D);

    // AI timers
    this.aiTimer = 0;
    this.attackCooldown = type.attackCooldown * (0.5 + Math.random() * 0.5);
    this.thinkInterval = 300 + Math.random() * 200;

    // Stun
    this.stunTimer = 0;
    this.hitstopTimer = 0;
    this.webbed = false;

    // Projectile/bomb data
    this.projectile = null;
    this.bomb = null;

    // Boss-specific state
    this.grabTarget = null;
    this.grabTimer = 0;
    this.leapTarget = null;
    this.flyingBaseY = null;
    this.swoopStartY = null;
    this.groundPoundPhase = null;

    // Ragdoll
    this.ragdoll = null;
  }

  update(delta, playerX, playerY) {
    if (!this.alive) {
      this.stateTimer += delta;
      if (this.ragdoll) {
        this.updateRagdoll(delta);
      }
      return;
    }

    if (this.hitstopTimer > 0) {
      this.hitstopTimer -= delta;
      this.draw();
      return;
    }

    this.stateTimer += delta;

    // Physics update
    this.physics.update(delta, GAME_CONFIG.GROUND_Y);
    this.x = this.physics.x;
    this.y = this.physics.y;

    if (this.type.regenRate && this.health < this.maxHealth) {
      this.health = Math.min(this.maxHealth, this.health + this.type.regenRate * delta / 1000);
    }

    if (this.stunTimer > 0) {
      this.stunTimer -= delta;
      if (this.stunTimer <= 0) {
        this.webbed = false;
        if (this.state === ENEMY_STATES.STUNNED) {
          this.enterState(ENEMY_STATES.IDLE);
        }
      }
    }

    this.updateAI(delta, playerX, playerY);
    this.x = this.physics.x;
    this.y = this.physics.y;

    this.draw();
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

        if (this.type.hasBomb && !this.type.hasFlying && dist < (this.type.fleeDistance || 200)) {
          this.enterState(ENEMY_STATES.FLEE);
          return;
        }

        if (this.type.hasBomb && this.attackCooldown <= 0 && dist < (this.type.hasFlying ? 350 : this.type.attackRange)) {
          this.enterState(ENEMY_STATES.THROW);
          this.attackCooldown = this.type.attackCooldown;
          return;
        }

        if (this.type.hasProjectile && this.attackCooldown <= 0 && dist < 300 && dist > 100) {
          this.enterState(ENEMY_STATES.THROW);
          this.attackCooldown = this.type.attackCooldown;
          return;
        }

        if (this.type.hasTendril && this.attackCooldown <= 0 && dist < this.type.tendrilRange + 20 && dist > this.type.attackRange) {
          this.enterState(ENEMY_STATES.TENDRIL);
          this.attackCooldown = this.type.attackCooldown;
          this.hasHit = false;
          return;
        }

        if (this.type.hasGrab && this.attackCooldown <= 0 && dist < this.type.attackRange + 30 && Math.random() < 0.3) {
          this.enterState(ENEMY_STATES.GRAB);
          this.attackCooldown = this.type.attackCooldown * 1.5;
          this.hasHit = false;
          this.grabTimer = 0;
          return;
        }

        if (this.type.hasLeap && this.attackCooldown <= 0 && dist > 80 && dist < this.type.leapRange) {
          this.enterState(ENEMY_STATES.LEAP);
          this.attackCooldown = this.type.attackCooldown;
          this.hasHit = false;
          this.leapTarget = { x: playerX, y: playerY };
          const dir = dx > 0 ? 1 : -1;
          this.physics.velocity.x = dir * 350;
          this.physics.velocity.y = -500;
          return;
        }

        if (this.type.hasTailSweep && this.attackCooldown <= 0 && dist < this.type.tailSweepRange + 10) {
          this.enterState(ENEMY_STATES.TAIL_SWEEP);
          this.attackCooldown = this.type.attackCooldown;
          this.hasHit = false;
          return;
        }

        if (this.type.hasSwoop && this.attackCooldown <= 0 && dist < 250 && this.type.hasFlying) {
          this.enterState(ENEMY_STATES.SWOOP);
          this.attackCooldown = this.type.attackCooldown;
          this.hasHit = false;
          this.swoopStartY = this.y;
          const dir = dx > 0 ? 1 : -1;
          this.physics.velocity.x = dir * this.type.swoopSpeed;
          this.physics.velocity.y = 400;
          return;
        }

        if (this.type.hasCharge && this.attackCooldown <= 0 && dist > 100 && dist < 300) {
          this.enterState(ENEMY_STATES.CHARGE);
          this.attackCooldown = this.type.attackCooldown;
          this.hasHit = false;
          return;
        }

        if (this.type.hasGroundPound && this.attackCooldown <= 0 && dist < this.type.groundPoundRange + 30 && Math.random() < 0.4) {
          this.enterState(ENEMY_STATES.GROUND_POUND);
          this.attackCooldown = this.type.attackCooldown;
          this.hasHit = false;
          this.groundPoundPhase = 'up';
          this.physics.velocity.y = -500;
          return;
        }

        if (this.type.hasFlying) {
          if (this.flyingBaseY === null) {
            this.flyingBaseY = GAME_CONFIG.GROUND_Y - this.type.flyHeight;
            this.physics.setAllowGravity(false);
          }
          const targetY = this.flyingBaseY + Math.sin(this.aiTimer / 500) * 20;
          const yDiff = targetY - this.y;
          this.physics.velocity.y = yDiff * 3;
          if (dist > 60) {
            const dir = dx > 0 ? 1 : -1;
            this.physics.velocity.x = dir * this.type.speed;
            this.state = ENEMY_STATES.WALK;
          } else {
            this.physics.velocity.x = 0;
            this.state = ENEMY_STATES.IDLE;
          }
          return;
        }

        if (dist > this.type.attackRange - 10) {
          const dir = dx > 0 ? 1 : -1;
          this.physics.velocity.x = dir * this.type.speed;
          this.state = ENEMY_STATES.WALK;
        } else {
          this.physics.velocity.x = 0;
          this.state = ENEMY_STATES.IDLE;
        }
        break;

      case ENEMY_STATES.ATTACK:
        this.physics.velocity.x = 0;
        if (this.stateTimer >= this.type.attackDuration) {
          this.enterState(ENEMY_STATES.IDLE);
        }
        break;

      case ENEMY_STATES.CHARGE:
        {
          const dir = this.facingRight ? 1 : -1;
          this.physics.velocity.x = dir * this.type.chargeSpeed;
          if (this.stateTimer >= 600 || dist < 30) {
            this.enterState(ENEMY_STATES.IDLE);
          }
        }
        break;

      case ENEMY_STATES.THROW:
        this.physics.velocity.x = 0;
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
          this.physics.velocity.x = fleeDir * this.type.speed * 1.5;
          if (dist > (this.type.fleeDistance || 200) + 50 || this.stateTimer > 1000) {
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
        if (!this.beingPulled) {
          this.physics.velocity.x = 0;
        }
        break;

      case ENEMY_STATES.DEAD:
        break;

      case ENEMY_STATES.TENDRIL:
        this.physics.velocity.x = 0;
        if (this.stateTimer >= this.type.attackDuration) {
          this.enterState(ENEMY_STATES.IDLE);
        }
        break;

      case ENEMY_STATES.GRAB:
        this.physics.velocity.x = 0;
        this.grabTimer += delta;
        if (this.grabTimer >= (this.type.grabDuration || 1000)) {
          this.grabTarget = null;
          this.enterState(ENEMY_STATES.IDLE);
        }
        break;

      case ENEMY_STATES.LEAP:
        if (this.physics.blocked.down && this.stateTimer > 200) {
          this.hasHit = false;
          this.enterState(ENEMY_STATES.IDLE);
        }
        if (this.stateTimer > 1000) {
          this.enterState(ENEMY_STATES.IDLE);
        }
        break;

      case ENEMY_STATES.TAIL_SWEEP:
        this.physics.velocity.x = 0;
        if (this.stateTimer >= this.type.attackDuration) {
          this.enterState(ENEMY_STATES.IDLE);
        }
        break;

      case ENEMY_STATES.SWOOP:
        if (this.stateTimer > 400) {
          if (this.type.hasFlying) {
            this.physics.setAllowGravity(false);
          }
          this.enterState(ENEMY_STATES.IDLE);
        }
        break;

      case ENEMY_STATES.GROUND_POUND:
        if (this.groundPoundPhase === 'up') {
          if (this.physics.velocity.y >= 0 || this.stateTimer > 300) {
            this.groundPoundPhase = 'down';
            this.physics.velocity.y = 800;
            this.physics.velocity.x = 0;
          }
        } else if (this.groundPoundPhase === 'down') {
          if (this.physics.blocked.down) {
            this.groundPoundPhase = null;
            this.enterState(ENEMY_STATES.IDLE);
          }
        }
        if (this.stateTimer > 1200) {
          this.groundPoundPhase = null;
          this.enterState(ENEMY_STATES.IDLE);
        }
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
    };
    SoundManager.ninjaThrow();
  }

  updateProjectile(delta) {
    if (!this.projectile || !this.projectile.alive) return null;
    const p = this.projectile;
    p.timer += delta;
    p.x += p.vx * delta / 1000;
    p.y += p.vy * delta / 1000;

    if (p.timer > 2000) {
      p.alive = false;
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

    if (b.y >= GAME_CONFIG.GROUND_Y || b.timer > 1500) {
      b.alive = false;
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
    return this.state === ENEMY_STATES.ATTACK ||
           this.state === ENEMY_STATES.CHARGE ||
           this.state === ENEMY_STATES.TENDRIL ||
           this.state === ENEMY_STATES.GRAB ||
           this.state === ENEMY_STATES.LEAP ||
           this.state === ENEMY_STATES.TAIL_SWEEP ||
           this.state === ENEMY_STATES.SWOOP ||
           this.state === ENEMY_STATES.GROUND_POUND;
  }

  isOnActiveFrame() {
    if (this.state === ENEMY_STATES.ATTACK) {
      const dur = this.type.attackDuration;
      return this.stateTimer >= dur * 0.3 && this.stateTimer <= dur * 0.6;
    }
    if (this.state === ENEMY_STATES.CHARGE) return this.stateTimer > 100;
    if (this.state === ENEMY_STATES.TENDRIL) {
      const dur = this.type.attackDuration;
      return this.stateTimer >= dur * 0.3 && this.stateTimer <= dur * 0.6;
    }
    if (this.state === ENEMY_STATES.GRAB) return this.stateTimer >= 100 && this.stateTimer <= 300;
    if (this.state === ENEMY_STATES.LEAP) return this.stateTimer > 150;
    if (this.state === ENEMY_STATES.TAIL_SWEEP) {
      const dur = this.type.attackDuration;
      return this.stateTimer >= dur * 0.25 && this.stateTimer <= dur * 0.65;
    }
    if (this.state === ENEMY_STATES.SWOOP) return this.stateTimer > 100 && this.stateTimer < 350;
    if (this.state === ENEMY_STATES.GROUND_POUND) return this.groundPoundPhase === 'down' && this.physics.blocked.down;
    return false;
  }

  getAttackData() {
    if (this.state === ENEMY_STATES.CHARGE) return { damage: this.type.chargeDamage || this.type.damage, range: 40, knockback: 350 };
    if (this.state === ENEMY_STATES.TENDRIL) return { damage: this.type.damage, range: this.type.tendrilRange || 120, knockback: 200 };
    if (this.state === ENEMY_STATES.GRAB) return { damage: this.type.grabDamage || this.type.damage, range: this.type.attackRange + 20, knockback: 50, isGrab: true };
    if (this.state === ENEMY_STATES.LEAP) return { damage: this.type.leapDamage || this.type.damage, range: 50, knockback: 300 };
    if (this.state === ENEMY_STATES.TAIL_SWEEP) return { damage: this.type.tailSweepDamage || this.type.damage, range: this.type.tailSweepRange || 90, knockback: 250, bothSides: true };
    if (this.state === ENEMY_STATES.SWOOP) return { damage: this.type.swoopDamage || this.type.damage, range: 50, knockback: 300 };
    if (this.state === ENEMY_STATES.GROUND_POUND) return { damage: this.type.groundPoundDamage || this.type.damage, range: this.type.groundPoundRange || 80, knockback: 200, isShockwave: true };
    return { damage: this.type.damage, range: this.type.attackRange, knockback: 200 };
  }

  getHitboxRect() {
    if (!this.isAttacking() || !this.isOnActiveFrame()) return null;
    const attack = this.getAttackData();
    const dir = this.facingRight ? 1 : -1;
    const s = this.type.bodyScale;

    if (attack.bothSides) {
      return makeRect(this.x - attack.range, this.y - GAME_CONFIG.BODY_HEIGHT * s / 2, attack.range * 2, GAME_CONFIG.BODY_HEIGHT * s);
    }
    if (attack.isShockwave) {
      return makeRect(this.x - attack.range, this.y - attack.range / 2, attack.range * 2, attack.range);
    }
    const hbX = dir > 0
      ? this.x + GAME_CONFIG.BODY_WIDTH / 2
      : this.x - GAME_CONFIG.BODY_WIDTH / 2 - attack.range;
    return makeRect(hbX, this.y - GAME_CONFIG.BODY_HEIGHT / 2, attack.range, GAME_CONFIG.BODY_HEIGHT);
  }

  getHurtboxRect() {
    const s = this.type.bodyScale;
    return makeRect(
      this.x - GAME_CONFIG.BODY_WIDTH * s / 2,
      this.y - GAME_CONFIG.BODY_HEIGHT * s / 2,
      GAME_CONFIG.BODY_WIDTH * s,
      GAME_CONFIG.BODY_HEIGHT * s
    );
  }

  takeDamage(amount, knockbackX, knockbackY = -150) {
    if (!this.alive) return;

    if (this.type.dodgeChance && Math.random() < this.type.dodgeChance && this.state !== ENEMY_STATES.HIT) {
      this.enterState(ENEMY_STATES.IDLE);
      const dodgeDir = knockbackX > 0 ? 1 : -1;
      this.physics.velocity.x = dodgeDir * (this.type.dodgeSpeed || 300);
      this.physics.velocity.y = -200;
      return false;
    }

    if (this.state === ENEMY_STATES.GRAB) {
      this.grabTarget = null;
    }

    this.health -= amount;
    this.physics.velocity.x = knockbackX;
    this.physics.velocity.y = knockbackY;

    if (this.health <= 0) {
      this.health = 0;
      this.alive = false;
      if (this.type.hasFlying) {
        this.physics.setAllowGravity(true);
      }
      this.createRagdoll(knockbackX, knockbackY);
      this.enterState(ENEMY_STATES.DEAD);
      // Hide model, ragdoll takes over
      this.model.setVisible(false);
      return true;
    }

    this.enterState(ENEMY_STATES.HIT);
    return true;
  }

  stun(duration) {
    this.stunTimer = duration;
    this.webbed = true;
    this.enterState(ENEMY_STATES.STUNNED);
    this.physics.velocity.x = 0;
  }

  applyHitstop(ms) {
    this.hitstopTimer = ms;
  }

  createRagdoll(knockbackX, knockbackY) {
    const s = this.type.bodyScale;
    const parts = [
      { name: 'head', ox: 0, oy: -50 * s, size: GAME_CONFIG.HEAD_RADIUS * this.type.headRadius },
      { name: 'torso', ox: 0, oy: -20 * s, w: 6 * s, h: 30 * s },
      { name: 'armL', ox: -15 * s, oy: -30 * s, len: 22 * s },
      { name: 'armR', ox: 15 * s, oy: -30 * s, len: 22 * s },
      { name: 'legL', ox: -8 * s, oy: 5 * s, len: 28 * s },
      { name: 'legR', ox: 8 * s, oy: 5 * s, len: 28 * s },
    ];

    this.ragdoll = parts.map(p => ({
      ...p,
      x: this.x + p.ox,
      y: this.y + p.oy,
      vx: knockbackX * (0.6 + Math.random() * 0.8) + (Math.random() - 0.5) * 120,
      vy: knockbackY * (0.5 + Math.random() * 1.0) + (Math.random() - 0.5) * 90,
      rot: (Math.random() - 0.5) * 2,
      rotSpeed: (Math.random() - 0.5) * 15,
    }));
  }

  updateRagdoll(delta) {
    if (!this.ragdoll) return;
    const dt = delta / 1000;
    const groundY = GAME_CONFIG.GROUND_Y;
    for (const p of this.ragdoll) {
      p.vy += GAME_CONFIG.GRAVITY * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.rotSpeed * dt;
      if (p.y > groundY - 5) {
        p.y = groundY - 5;
        p.vy = -p.vy * 0.4;
        p.vx *= 0.7;
        p.rotSpeed *= 0.5;
        if (Math.abs(p.vy) < 30) {
          p.vy = 0;
          p.rotSpeed = 0;
        }
      }
    }
  }

  draw() {
    if (!this.alive && this.ragdoll) {
      // Ragdoll is rendered by Effects3D system
      return;
    }

    let pose;
    switch (this.state) {
      case ENEMY_STATES.WALK:
      case ENEMY_STATES.FLEE:
      case ENEMY_STATES.FLYING:
        const walkT = (this.stateTimer % 400) / 400;
        pose = walkT < 0.5
          ? lerpPose(ENEMY_WALK_A, ENEMY_WALK_B, walkT * 2)
          : lerpPose(ENEMY_WALK_B, ENEMY_WALK_A, (walkT - 0.5) * 2);
        break;
      case ENEMY_STATES.ATTACK:
      case ENEMY_STATES.CHARGE:
      case ENEMY_STATES.THROW:
      case ENEMY_STATES.TENDRIL:
      case ENEMY_STATES.GRAB:
      case ENEMY_STATES.SWOOP:
        const atkT = this.stateTimer / this.type.attackDuration;
        if (atkT < 0.3) pose = lerpPose(ENEMY_IDLE, ENEMY_ATTACK, atkT / 0.3);
        else if (atkT < 0.6) pose = ENEMY_ATTACK;
        else pose = lerpPose(ENEMY_ATTACK, ENEMY_IDLE, (atkT - 0.6) / 0.4);
        break;
      case ENEMY_STATES.LEAP:
        const leapT = Math.min(this.stateTimer / 300, 1);
        pose = lerpPose(ENEMY_IDLE, ENEMY_ATTACK, leapT);
        break;
      case ENEMY_STATES.TAIL_SWEEP:
        const sweepT = this.stateTimer / this.type.attackDuration;
        if (sweepT < 0.3) pose = lerpPose(ENEMY_IDLE, ENEMY_ATTACK, sweepT / 0.3);
        else if (sweepT < 0.65) pose = ENEMY_ATTACK;
        else pose = lerpPose(ENEMY_ATTACK, ENEMY_IDLE, (sweepT - 0.65) / 0.35);
        break;
      case ENEMY_STATES.GROUND_POUND:
        if (this.groundPoundPhase === 'up') {
          pose = lerpPose(ENEMY_IDLE, ENEMY_ATTACK, Math.min(this.stateTimer / 200, 1));
        } else {
          pose = ENEMY_ATTACK;
        }
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
        const idleT = (this.stateTimer % 800) / 800;
        const breathe = Math.sin(idleT * Math.PI * 2) * 0.5 + 0.5;
        pose = lerpPose(ENEMY_IDLE, { ...ENEMY_IDLE, head: { x: 0, y: -49 }, neck: { x: 0, y: -37 } }, breathe);
        break;
    }

    const drawY = this.y + GAME_CONFIG.BODY_HEIGHT / 2 - 30;
    this.model.setPose(pose, this.facingRight, this.x, drawY);
  }

  destroy() {
    this.model.removeFromScene(this.scene3D);
    this.model.dispose();
  }
}
