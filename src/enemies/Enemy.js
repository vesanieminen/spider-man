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
    // Center the physics body on the sprite - offset from 32x32 __DEFAULT texture
    this.body.body.setOffset((32 - bw) / 2, (32 - bh) / 2);
    this.body.setCollideWorldBounds(false);
    this.body.setMaxVelocity(1500, 1500);

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

    // Boss-specific state
    this.grabTarget = null;
    this.grabTimer = 0;
    this.leapTarget = null;
    this.flyingBaseY = null;
    this.swoopStartY = null;
    this.groundPoundPhase = null; // 'up' or 'down'
  }

  update(delta, playerX, playerY) {
    // Dead enemies only update ragdoll
    if (!this.alive) {
      this.stateTimer += delta;
      if (this.ragdoll) {
        this.updateRagdoll(delta);
        this.drawRagdoll();
      }
      return;
    }

    // Hitstop
    if (this.hitstopTimer > 0) {
      this.hitstopTimer -= delta;
      this.draw();
      return;
    }

    this.stateTimer += delta;
    this.x = this.body.x;
    this.y = this.body.y;

    // HP regen for bosses with regenRate
    if (this.type.regenRate && this.health < this.maxHealth) {
      this.health = Math.min(this.maxHealth, this.health + this.type.regenRate * delta / 1000);
    }

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

        // Normal melee attack
        if (this.attackCooldown <= 0 && dist < this.type.attackRange + 20) {
          this.enterState(ENEMY_STATES.ATTACK);
          this.attackCooldown = this.type.attackCooldown;
          this.hasHit = false;
          return;
        }

        // Bomber flees when close
        if (this.type.hasBomb && !this.type.hasFlying && dist < (this.type.fleeDistance || 200)) {
          this.enterState(ENEMY_STATES.FLEE);
          return;
        }

        // Bomber/Goblin throws bomb from range
        if (this.type.hasBomb && this.attackCooldown <= 0 && dist < (this.type.hasFlying ? 350 : this.type.attackRange)) {
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

        // Tendril attack (Doc Ock, Venom) - extended range
        if (this.type.hasTendril && this.attackCooldown <= 0 && dist < this.type.tendrilRange + 20 && dist > this.type.attackRange) {
          this.enterState(ENEMY_STATES.TENDRIL);
          this.attackCooldown = this.type.attackCooldown;
          this.hasHit = false;
          return;
        }

        // Grab attack (Venom, Doc Ock)
        if (this.type.hasGrab && this.attackCooldown <= 0 && dist < this.type.attackRange + 30 && Math.random() < 0.3) {
          this.enterState(ENEMY_STATES.GRAB);
          this.attackCooldown = this.type.attackCooldown * 1.5;
          this.hasHit = false;
          this.grabTimer = 0;
          return;
        }

        // Leap (Lizard)
        if (this.type.hasLeap && this.attackCooldown <= 0 && dist > 80 && dist < this.type.leapRange) {
          this.enterState(ENEMY_STATES.LEAP);
          this.attackCooldown = this.type.attackCooldown;
          this.hasHit = false;
          this.leapTarget = { x: playerX, y: playerY };
          const dir = dx > 0 ? 1 : -1;
          this.body.body.setVelocity(dir * 350, -500);
          return;
        }

        // Tail sweep (Lizard) - close range
        if (this.type.hasTailSweep && this.attackCooldown <= 0 && dist < this.type.tailSweepRange + 10) {
          this.enterState(ENEMY_STATES.TAIL_SWEEP);
          this.attackCooldown = this.type.attackCooldown;
          this.hasHit = false;
          return;
        }

        // Swoop dive (Green Goblin)
        if (this.type.hasSwoop && this.attackCooldown <= 0 && dist < 250 && this.type.hasFlying) {
          this.enterState(ENEMY_STATES.SWOOP);
          this.attackCooldown = this.type.attackCooldown;
          this.hasHit = false;
          this.swoopStartY = this.y;
          const dir = dx > 0 ? 1 : -1;
          this.body.body.setVelocity(dir * this.type.swoopSpeed, 400);
          return;
        }

        // Charge (Brute, Venom, Rhino)
        if (this.type.hasCharge && this.attackCooldown <= 0 && dist > 100 && dist < 300) {
          this.enterState(ENEMY_STATES.CHARGE);
          this.attackCooldown = this.type.attackCooldown;
          this.hasHit = false;
          return;
        }

        // Ground pound (Rhino, Brute) - close range
        if (this.type.hasGroundPound && this.attackCooldown <= 0 && dist < this.type.groundPoundRange + 30 && Math.random() < 0.4) {
          this.enterState(ENEMY_STATES.GROUND_POUND);
          this.attackCooldown = this.type.attackCooldown;
          this.hasHit = false;
          this.groundPoundPhase = 'up';
          this.body.body.setVelocityY(-500);
          return;
        }

        // Flying movement (Green Goblin)
        if (this.type.hasFlying) {
          if (this.flyingBaseY === null) {
            this.flyingBaseY = GAME_CONFIG.GROUND_Y - this.type.flyHeight;
            this.body.body.setAllowGravity(false);
          }
          // Hover at fly height
          const targetY = this.flyingBaseY + Math.sin(this.aiTimer / 500) * 20;
          const yDiff = targetY - this.y;
          this.body.body.setVelocityY(yDiff * 3);
          // Move toward player horizontally
          if (dist > 60) {
            const dir = dx > 0 ? 1 : -1;
            this.body.body.setVelocityX(dir * this.type.speed);
            this.state = ENEMY_STATES.WALK;
          } else {
            this.body.body.setVelocityX(0);
            this.state = ENEMY_STATES.IDLE;
          }
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
          this.body.body.setVelocityX(0);
        }
        break;

      case ENEMY_STATES.DEAD:
        if (this.ragdoll) {
          this.updateRagdoll(delta);
        }
        break;

      // === BOSS STATES ===

      case ENEMY_STATES.TENDRIL:
        this.body.body.setVelocityX(0);
        if (this.stateTimer >= this.type.attackDuration) {
          this.enterState(ENEMY_STATES.IDLE);
        }
        break;

      case ENEMY_STATES.GRAB:
        this.body.body.setVelocityX(0);
        this.grabTimer += delta;
        if (this.grabTimer >= (this.type.grabDuration || 1000)) {
          this.grabTarget = null;
          this.enterState(ENEMY_STATES.IDLE);
        }
        break;

      case ENEMY_STATES.LEAP:
        // Airborne leap - land when hitting ground
        if (this.body.body.blocked.down && this.stateTimer > 200) {
          this.hasHit = false; // Can damage on landing too
          this.enterState(ENEMY_STATES.IDLE);
        }
        if (this.stateTimer > 1000) {
          this.enterState(ENEMY_STATES.IDLE);
        }
        break;

      case ENEMY_STATES.TAIL_SWEEP:
        this.body.body.setVelocityX(0);
        if (this.stateTimer >= this.type.attackDuration) {
          this.enterState(ENEMY_STATES.IDLE);
        }
        break;

      case ENEMY_STATES.SWOOP:
        // Swoop down then return to flying height
        if (this.stateTimer > 400) {
          // Return to fly height
          if (this.type.hasFlying) {
            this.body.body.setAllowGravity(false);
          }
          this.enterState(ENEMY_STATES.IDLE);
        }
        break;

      case ENEMY_STATES.GROUND_POUND:
        if (this.groundPoundPhase === 'up') {
          if (this.body.body.velocity.y >= 0 || this.stateTimer > 300) {
            this.groundPoundPhase = 'down';
            this.body.body.setVelocityY(800);
            this.body.body.setVelocityX(0);
          }
        } else if (this.groundPoundPhase === 'down') {
          if (this.body.body.blocked.down) {
            this.groundPoundPhase = null;
            this.enterState(ENEMY_STATES.IDLE);
            // Shockwave handled by GameScene
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
    const bombColor = this.type.isBoss ? this.type.accentColor || this.type.color : this.type.color;
    b.graphics.fillStyle(bombColor, 0.9);
    b.graphics.fillCircle(b.x, b.y, 6);
    b.graphics.fillStyle(0xffff00, 0.8);
    b.graphics.fillCircle(b.x + 3, b.y - 6, 2);

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
    if (this.state === ENEMY_STATES.CHARGE) {
      return this.stateTimer > 100;
    }
    if (this.state === ENEMY_STATES.TENDRIL) {
      const dur = this.type.attackDuration;
      return this.stateTimer >= dur * 0.3 && this.stateTimer <= dur * 0.6;
    }
    if (this.state === ENEMY_STATES.GRAB) {
      return this.stateTimer >= 100 && this.stateTimer <= 300;
    }
    if (this.state === ENEMY_STATES.LEAP) {
      return this.stateTimer > 150;
    }
    if (this.state === ENEMY_STATES.TAIL_SWEEP) {
      const dur = this.type.attackDuration;
      return this.stateTimer >= dur * 0.25 && this.stateTimer <= dur * 0.65;
    }
    if (this.state === ENEMY_STATES.SWOOP) {
      return this.stateTimer > 100 && this.stateTimer < 350;
    }
    if (this.state === ENEMY_STATES.GROUND_POUND) {
      return this.groundPoundPhase === 'down' && this.body.body.blocked.down;
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
    if (this.state === ENEMY_STATES.TENDRIL) {
      return {
        damage: this.type.damage,
        range: this.type.tendrilRange || 120,
        knockback: 200,
      };
    }
    if (this.state === ENEMY_STATES.GRAB) {
      return {
        damage: this.type.grabDamage || this.type.damage,
        range: this.type.attackRange + 20,
        knockback: 50,
        isGrab: true,
      };
    }
    if (this.state === ENEMY_STATES.LEAP) {
      return {
        damage: this.type.leapDamage || this.type.damage,
        range: 50,
        knockback: 300,
      };
    }
    if (this.state === ENEMY_STATES.TAIL_SWEEP) {
      return {
        damage: this.type.tailSweepDamage || this.type.damage,
        range: this.type.tailSweepRange || 90,
        knockback: 250,
        bothSides: true,
      };
    }
    if (this.state === ENEMY_STATES.SWOOP) {
      return {
        damage: this.type.swoopDamage || this.type.damage,
        range: 50,
        knockback: 300,
      };
    }
    if (this.state === ENEMY_STATES.GROUND_POUND) {
      return {
        damage: this.type.groundPoundDamage || this.type.damage,
        range: this.type.groundPoundRange || 80,
        knockback: 200,
        isShockwave: true,
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
    const s = this.type.bodyScale;

    // Tail sweep hits both sides
    if (attack.bothSides) {
      return new Phaser.Geom.Rectangle(
        this.x - attack.range,
        this.y - GAME_CONFIG.BODY_HEIGHT * s / 2,
        attack.range * 2,
        GAME_CONFIG.BODY_HEIGHT * s
      );
    }

    // Ground pound shockwave is a circle around enemy
    if (attack.isShockwave) {
      return new Phaser.Geom.Rectangle(
        this.x - attack.range,
        this.y - attack.range / 2,
        attack.range * 2,
        attack.range
      );
    }

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

    // Release grab if grabbing
    if (this.state === ENEMY_STATES.GRAB) {
      this.grabTarget = null;
    }

    this.health -= amount;
    this.body.body.setVelocityX(knockbackX);
    this.body.body.setVelocityY(knockbackY);

    if (this.health <= 0) {
      this.health = 0;
      this.alive = false;
      // Restore gravity if flying
      if (this.type.hasFlying) {
        this.body.body.setAllowGravity(true);
      }
      this.createRagdoll(knockbackX, knockbackY);
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

  createRagdoll(knockbackX, knockbackY) {
    const s = this.type.bodyScale;
    const parts = [
      { name: 'head', ox: 0, oy: -50 * s, size: GAME_CONFIG.HEAD_RADIUS * this.type.headRadius, shape: 'circle' },
      { name: 'torso', ox: 0, oy: -20 * s, size: 6 * s, shape: 'rect', w: 6 * s, h: 30 * s },
      { name: 'armL', ox: -15 * s, oy: -30 * s, size: 4 * s, shape: 'line', len: 22 * s },
      { name: 'armR', ox: 15 * s, oy: -30 * s, size: 4 * s, shape: 'line', len: 22 * s },
      { name: 'legL', ox: -8 * s, oy: 5 * s, size: 4 * s, shape: 'line', len: 28 * s },
      { name: 'legR', ox: 8 * s, oy: 5 * s, size: 4 * s, shape: 'line', len: 28 * s },
    ];

    this.ragdoll = parts.map(p => {
      const spread = 0.6;
      return {
        ...p,
        x: this.x + p.ox,
        y: this.y + p.oy,
        vx: knockbackX * (0.6 + Math.random() * 0.8) + (Math.random() - 0.5) * 200 * spread,
        vy: knockbackY * (0.5 + Math.random() * 1.0) + (Math.random() - 0.5) * 150 * spread,
        rot: (Math.random() - 0.5) * 2,
        rotSpeed: (Math.random() - 0.5) * 15,
        bounced: false,
      };
    });

    this.body.body.setVelocity(0, 0);
    this.body.body.setAllowGravity(false);
    this.hpGraphics.clear();
    this.webbedGraphics.clear();
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
        // Crouched then extended pose
        const leapT = Math.min(this.stateTimer / 300, 1);
        pose = lerpPose(ENEMY_IDLE, ENEMY_ATTACK, leapT);
        break;
      case ENEMY_STATES.TAIL_SWEEP:
        // Spin-like attack pose
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
        if (this.ragdoll) {
          this.drawRagdoll();
          return;
        }
        pose = ENEMY_HIT;
        break;
      default:
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
      alpha, this.type
    );
  }

  drawRagdoll() {
    if (!this.ragdoll) return;
    const g = this.graphics;
    g.clear();
    const alpha = Math.max(0, 1 - this.stateTimer / 2500);
    const color = this.type.color;

    for (const p of this.ragdoll) {
      g.save && g.save();
      if (p.shape === 'circle') {
        g.fillStyle(color, 0.4 * alpha);
        g.fillCircle(p.x, p.y, p.size);
        g.lineStyle(2, color, alpha);
        g.strokeCircle(p.x, p.y, p.size);
      } else if (p.shape === 'rect') {
        g.fillStyle(color, 0.6 * alpha);
        const cos = Math.cos(p.rot);
        const sin = Math.sin(p.rot);
        g.lineStyle(p.w, color, alpha);
        g.lineBetween(
          p.x - sin * p.h / 2, p.y - cos * p.h / 2,
          p.x + sin * p.h / 2, p.y + cos * p.h / 2
        );
      } else if (p.shape === 'line') {
        g.lineStyle(3, color, alpha);
        const cos = Math.cos(p.rot);
        const sin = Math.sin(p.rot);
        g.lineBetween(
          p.x, p.y,
          p.x + sin * p.len, p.y + cos * p.len
        );
        g.fillStyle(color, 0.7 * alpha);
        g.fillCircle(p.x, p.y, 2);
        g.fillCircle(p.x + sin * p.len, p.y + cos * p.len, 2.5);
      }
    }
  }

  drawHealthBar() {
    this.hpGraphics.clear();
    if (!this.alive || this.health >= this.maxHealth) return;
    // Boss health bars are drawn by HUD
    if (this.type.isBoss) return;

    const barWidth = 30;
    const barHeight = 4;
    const x = this.x - barWidth / 2;
    const y = this.y - GAME_CONFIG.BODY_HEIGHT * this.type.bodyScale / 2 - 12;

    this.hpGraphics.fillStyle(0x333333, 0.8);
    this.hpGraphics.fillRect(x, y, barWidth, barHeight);

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
