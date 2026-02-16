import Phaser from 'phaser';
import { GAME_CONFIG, PLAYER_STATES, PLAYER_CHARACTERS } from '../config.js';
import { PlayerRenderer } from './PlayerRenderer.js';
import { WebPhysics } from './WebPhysics.js';
import { POSES, lerpPose } from './PlayerAnimations.js';
import { SoundManager } from '../audio/SoundManager.js';

export class Player {
  constructor(scene, x, y, characterConfig, playerIndex = 0) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.characterConfig = characterConfig || PLAYER_CHARACTERS.PETER;
    this.playerIndex = playerIndex;
    this.health = GAME_CONFIG.PLAYER_HP;
    this.maxHealth = GAME_CONFIG.PLAYER_MAX_HP;
    this.facingRight = true;
    this.state = PLAYER_STATES.IDLE;
    this.stateTimer = 0;
    this.isGrounded = false;
    this.wasGrounded = false;

    // Physics body
    this.body = scene.physics.add.sprite(x, y, '__DEFAULT').setVisible(false);
    this.body.setSize(GAME_CONFIG.BODY_WIDTH, GAME_CONFIG.BODY_HEIGHT);
    this.body.setCollideWorldBounds(false);
    this.body.setMaxVelocity(800, 1000);

    // Graphics for drawing
    this.graphics = scene.add.graphics().setDepth(20);
    this.renderer = new PlayerRenderer(this.graphics, this.characterConfig);

    // Web system
    this.web = new WebPhysics();
    this.webGraphics = scene.add.graphics().setDepth(19);

    // Combat
    this.attackTimer = 0;
    this.hasHit = false;
    this.attackCooldown = 0;
    this.punchCombo = 0;
    this.punchComboTimer = 0;

    // Invulnerability after hit
    this.invulnTimer = 0;
    this.hitstopTimer = 0;

    // Dive kick state
    this.diveKickActive = false;

    // Web pull state
    this.pullTarget = null;
    this.pullTimer = 0;
  }

  update(delta, actions) {
    // Hitstop freeze
    if (this.hitstopTimer > 0) {
      this.hitstopTimer -= delta;
      this.draw();
      return;
    }

    this.wasGrounded = this.isGrounded;
    this.isGrounded = this.body.body.blocked.down;
    this.stateTimer += delta;

    // Sync position
    this.x = this.body.x;
    this.y = this.body.y;

    // Invulnerability
    if (this.invulnTimer > 0) this.invulnTimer -= delta;

    // Attack cooldown
    if (this.attackCooldown > 0) this.attackCooldown -= delta;

    // Punch combo timeout
    if (this.punchComboTimer > 0) {
      this.punchComboTimer -= delta;
      if (this.punchComboTimer <= 0) this.punchCombo = 0;
    }

    // Web cooldown
    this.web.update(delta, this.body);

    // State machine
    this.updateState(delta, actions);

    // Clamp to left boundary only (endless right scrolling)
    this.body.x = Math.max(20, this.body.x);

    // Update position
    this.x = this.body.x;
    this.y = this.body.y;

    this.draw();
    this.drawWeb();
  }

  updateState(delta, actions) {
    switch (this.state) {
      case PLAYER_STATES.IDLE:
      case PLAYER_STATES.RUN:
        this.handleGroundState(delta, actions);
        break;
      case PLAYER_STATES.JUMP:
      case PLAYER_STATES.FALL:
        this.handleAirState(delta, actions);
        break;
      case PLAYER_STATES.SWING:
        this.handleSwingState(delta, actions);
        break;
      case PLAYER_STATES.PUNCH:
      case PLAYER_STATES.KICK:
      case PLAYER_STATES.WEB_SHOT:
        this.handleAttackState(delta);
        break;
      case PLAYER_STATES.DIVE_KICK:
        this.handleDiveKickState(delta, actions);
        break;
      case PLAYER_STATES.WEB_PULL:
        this.handleWebPullState(delta, actions);
        break;
      case PLAYER_STATES.SWING_KICK:
        this.handleSwingKickState(delta, actions);
        break;
      case PLAYER_STATES.HIT:
        this.handleHitState(delta);
        break;
      case PLAYER_STATES.LAND:
        this.handleLandState(delta, actions);
        break;
    }
  }

  handleGroundState(delta, actions) {
    // Landing detection
    if (this.isGrounded && !this.wasGrounded) {
      SoundManager.land();
    }

    // Fall off edges
    if (!this.isGrounded) {
      this.enterState(PLAYER_STATES.FALL);
      return;
    }

    // Movement
    let moving = false;
    if (actions.left) {
      this.body.body.setVelocityX(-GAME_CONFIG.PLAYER_SPEED);
      this.facingRight = false;
      moving = true;
    } else if (actions.right) {
      this.body.body.setVelocityX(GAME_CONFIG.PLAYER_SPEED);
      this.facingRight = true;
      moving = true;
    } else {
      this.body.body.setVelocityX(0);
    }

    this.state = moving ? PLAYER_STATES.RUN : PLAYER_STATES.IDLE;

    // Jump
    if (actions.jump) {
      this.body.body.setVelocityY(GAME_CONFIG.JUMP_VELOCITY);
      this.enterState(PLAYER_STATES.JUMP);
      SoundManager.jump();
      return;
    }

    // Web swing
    if (actions.webHold || actions.webHoldStart) {
      this.tryStartSwing();
      return;
    }

    // Web pull (down + web shoot key)
    if (actions.down && actions.webShoot && this.attackCooldown <= 0) {
      this.enterState(PLAYER_STATES.WEB_PULL);
      this.hasHit = false;
      this.pullTarget = null;
      this.pullTimer = 0;
      this.attackCooldown = 400;
      SoundManager.webShoot();
      return;
    }

    // Web shot (web shoot key)
    if (actions.webShoot && this.attackCooldown <= 0) {
      this.enterState(PLAYER_STATES.WEB_SHOT);
      this.hasHit = false;
      this.attackCooldown = 300;
      SoundManager.webShoot();
      return;
    }

    // Combat
    if (this.attackCooldown <= 0) {
      if (actions.punch) {
        this.punchCombo = (this.punchComboTimer > 0) ? (this.punchCombo + 1) % 3 : 0;
        this.punchComboTimer = 400;
        this.enterState(PLAYER_STATES.PUNCH);
        this.hasHit = false;
        this.attackCooldown = 100;
        SoundManager.punch();
        return;
      }
      if (actions.kick) {
        this.enterState(PLAYER_STATES.KICK);
        this.hasHit = false;
        this.attackCooldown = 150;
        SoundManager.kick();
        return;
      }
    }
  }

  handleAirState(delta, actions) {
    // Air control
    if (actions.left) {
      this.body.body.velocity.x -= GAME_CONFIG.PLAYER_SPEED * GAME_CONFIG.AIR_CONTROL * (delta / 1000) * 10;
      this.facingRight = false;
    } else if (actions.right) {
      this.body.body.velocity.x += GAME_CONFIG.PLAYER_SPEED * GAME_CONFIG.AIR_CONTROL * (delta / 1000) * 10;
      this.facingRight = true;
    }

    // Transition to fall
    if (this.body.body.velocity.y > 0 && this.state === PLAYER_STATES.JUMP) {
      this.state = PLAYER_STATES.FALL;
    }

    // Web swing
    if (actions.webHold || actions.webHoldStart) {
      this.tryStartSwing();
      return;
    }

    // Web pull (down + web shoot key) in air
    if (actions.down && actions.webShoot && this.attackCooldown <= 0) {
      this.enterState(PLAYER_STATES.WEB_PULL);
      this.hasHit = false;
      this.pullTarget = null;
      this.pullTimer = 0;
      this.attackCooldown = 400;
      SoundManager.webShoot();
      return;
    }

    // Web shot (web shoot key)
    if (actions.webShoot && this.attackCooldown <= 0) {
      this.enterState(PLAYER_STATES.WEB_SHOT);
      this.hasHit = false;
      this.attackCooldown = 300;
      SoundManager.webShoot();
      return;
    }

    // Dive kick: S + K in air
    if (actions.down && actions.kick && this.attackCooldown <= 0) {
      this.enterState(PLAYER_STATES.DIVE_KICK);
      this.diveKickActive = true;
      this.hasHit = false;
      const dir = this.facingRight ? 1 : -1;
      this.body.body.setVelocity(dir * GAME_CONFIG.DIVE_KICK_SPEED * 0.5, GAME_CONFIG.DIVE_KICK_SPEED);
      return;
    }

    // Air punch/kick
    if (this.attackCooldown <= 0) {
      if (actions.punch) {
        this.enterState(PLAYER_STATES.PUNCH);
        this.hasHit = false;
        this.attackCooldown = 150;
        SoundManager.punch();
        return;
      }
      if (actions.kick) {
        this.enterState(PLAYER_STATES.KICK);
        this.hasHit = false;
        this.attackCooldown = 200;
        SoundManager.kick();
        return;
      }
    }

    // Land
    if (this.isGrounded) {
      this.enterState(PLAYER_STATES.LAND);
      SoundManager.land();
      return;
    }
  }

  handleSwingState(delta, actions) {
    // Apply web constraint
    this.web.update(delta, this.body);

    // Input pumping
    if (actions.left) {
      this.web.pump(-1, this.body);
      this.facingRight = false;
    } else if (actions.right) {
      this.web.pump(1, this.body);
      this.facingRight = true;
    }

    // Swing kick - attack while swinging
    if (actions.punch || actions.kick) {
      this.enterState(PLAYER_STATES.SWING_KICK);
      this.hasHit = false;
      // Keep swinging but enable hit
      return;
    }

    // Release web
    if (actions.webRelease || (!actions.webHold && !actions.webHoldStart && this.stateTimer > 100)) {
      const boost = this.web.getVelocityBoost(this.body);
      this.web.release();
      this.body.body.setVelocity(boost.x, boost.y);
      SoundManager.webRelease();
      this.enterState(this.body.body.velocity.y < 0 ? PLAYER_STATES.JUMP : PLAYER_STATES.FALL);
      return;
    }

    // Hit ground while swinging
    if (this.isGrounded && this.body.body.velocity.y >= 0) {
      this.web.release();
      this.enterState(PLAYER_STATES.LAND);
      SoundManager.land();
      return;
    }

    // Periodic swing sounds
    if (this.stateTimer > 200 && Math.floor(this.stateTimer / 400) !== Math.floor((this.stateTimer - delta) / 400)) {
      SoundManager.webSwing();
    }
  }

  handleSwingKickState(delta, actions) {
    // Still under web constraint
    this.web.update(delta, this.body);

    // Input pumping
    if (actions.left) this.web.pump(-1, this.body);
    else if (actions.right) this.web.pump(1, this.body);

    // After a short time, go back to swing or release
    if (this.stateTimer > 300) {
      if (this.web.active) {
        this.enterState(PLAYER_STATES.SWING);
      } else {
        this.enterState(PLAYER_STATES.FALL);
      }
      return;
    }

    // Release web during swing kick
    if (actions.webRelease || !actions.webHold) {
      const boost = this.web.getVelocityBoost(this.body);
      this.web.release();
      this.body.body.setVelocity(boost.x, boost.y);
      this.enterState(PLAYER_STATES.FALL);
      return;
    }

    if (this.isGrounded) {
      this.web.release();
      this.enterState(PLAYER_STATES.LAND);
      SoundManager.land();
    }
  }

  handleAttackState(delta) {
    const durations = {
      [PLAYER_STATES.PUNCH]: GAME_CONFIG.PUNCH_DURATION,
      [PLAYER_STATES.KICK]: GAME_CONFIG.KICK_DURATION,
      [PLAYER_STATES.WEB_SHOT]: 200,
    };
    const dur = durations[this.state] || 250;

    if (this.stateTimer >= dur) {
      if (this.isGrounded) {
        this.enterState(PLAYER_STATES.IDLE);
      } else {
        this.enterState(PLAYER_STATES.FALL);
      }
    }
  }

  handleDiveKickState(delta) {
    if (this.isGrounded) {
      this.diveKickActive = false;
      SoundManager.diveKickImpact();
      this.enterState(PLAYER_STATES.LAND);
      // Shockwave will be triggered by GameScene
      return;
    }
  }

  releasePullTarget() {
    if (this.pullTarget) {
      this.pullTarget.beingPulled = false;
      this.pullTarget = null;
    }
  }

  handleWebPullState(delta, actions) {
    this.pullTimer += delta;

    // Allow canceling into punch/kick for follow-up combo
    if (this.pullTimer > 200 && this.attackCooldown <= 0) {
      if (actions.punch) {
        this.releasePullTarget();
        this.enterState(PLAYER_STATES.PUNCH);
        this.hasHit = false;
        this.attackCooldown = 100;
        SoundManager.punch();
        return;
      }
      if (actions.kick) {
        this.releasePullTarget();
        this.enterState(PLAYER_STATES.KICK);
        this.hasHit = false;
        this.attackCooldown = 150;
        SoundManager.kick();
        return;
      }
    }

    // End pull after duration
    if (this.pullTimer >= GAME_CONFIG.WEB_PULL_DURATION) {
      this.releasePullTarget();
      if (this.isGrounded) {
        this.enterState(PLAYER_STATES.IDLE);
      } else {
        this.enterState(PLAYER_STATES.FALL);
      }
    }
  }

  handleHitState(delta) {
    if (this.stateTimer > 300) {
      if (this.isGrounded) {
        this.enterState(PLAYER_STATES.IDLE);
      } else {
        this.enterState(PLAYER_STATES.FALL);
      }
    }
  }

  handleLandState(delta, actions) {
    if (this.stateTimer > 100) {
      this.enterState(PLAYER_STATES.IDLE);
    }
  }

  tryStartSwing() {
    if (this.web.cooldownTimer > 0) return;

    const success = this.web.attach(this.x, this.y, this.body.body.velocity.x);
    if (success) {
      this.enterState(PLAYER_STATES.SWING);
      SoundManager.webShoot();
    }
  }

  enterState(newState) {
    this.state = newState;
    this.stateTimer = 0;
  }

  isAttacking() {
    return [
      PLAYER_STATES.PUNCH,
      PLAYER_STATES.KICK,
      PLAYER_STATES.DIVE_KICK,
      PLAYER_STATES.SWING_KICK,
      PLAYER_STATES.WEB_SHOT,
      PLAYER_STATES.WEB_PULL,
    ].includes(this.state);
  }

  isOnActiveFrame() {
    if (!this.isAttacking()) return false;

    let duration, activeStart, activeEnd;
    switch (this.state) {
      case PLAYER_STATES.PUNCH:
        duration = GAME_CONFIG.PUNCH_DURATION;
        activeStart = duration * 0.25;
        activeEnd = duration * 0.6;
        break;
      case PLAYER_STATES.KICK:
        duration = GAME_CONFIG.KICK_DURATION;
        activeStart = duration * 0.2;
        activeEnd = duration * 0.6;
        break;
      case PLAYER_STATES.DIVE_KICK:
        return this.diveKickActive;
      case PLAYER_STATES.SWING_KICK:
        return this.stateTimer < 250;
      case PLAYER_STATES.WEB_SHOT:
        activeStart = 50;
        activeEnd = 150;
        break;
      case PLAYER_STATES.WEB_PULL:
        activeStart = 50;
        activeEnd = 200;
        break;
      default:
        return false;
    }

    return this.stateTimer >= activeStart && this.stateTimer <= activeEnd;
  }

  getAttackData() {
    const speed = Math.sqrt(
      this.body.body.velocity.x * this.body.body.velocity.x +
      this.body.body.velocity.y * this.body.body.velocity.y
    );

    switch (this.state) {
      case PLAYER_STATES.PUNCH:
        return {
          damage: GAME_CONFIG.PUNCH_DAMAGE,
          range: GAME_CONFIG.PUNCH_RANGE,
          knockback: GAME_CONFIG.PUNCH_KNOCKBACK,
          launch: GAME_CONFIG.PUNCH_LAUNCH,
          type: 'punch',
        };
      case PLAYER_STATES.KICK:
        return {
          damage: GAME_CONFIG.KICK_DAMAGE,
          range: GAME_CONFIG.KICK_RANGE,
          knockback: GAME_CONFIG.KICK_KNOCKBACK,
          launch: GAME_CONFIG.KICK_LAUNCH,
          type: 'kick',
        };
      case PLAYER_STATES.DIVE_KICK:
        return {
          damage: GAME_CONFIG.DIVE_KICK_DAMAGE,
          range: 80,
          knockback: GAME_CONFIG.DIVE_KICK_KNOCKBACK,
          launch: GAME_CONFIG.DIVE_KICK_LAUNCH,
          type: 'diveKick',
        };
      case PLAYER_STATES.SWING_KICK:
        // More speed = more damage
        const bonusDamage = Math.floor(speed / 30);
        return {
          damage: GAME_CONFIG.SWING_KICK_BASE_DAMAGE + bonusDamage,
          range: 90,
          knockback: GAME_CONFIG.SWING_KICK_KNOCKBACK,
          launch: GAME_CONFIG.SWING_KICK_LAUNCH,
          type: 'swingKick',
        };
      case PLAYER_STATES.WEB_SHOT:
        return {
          damage: GAME_CONFIG.WEB_SHOT_DAMAGE,
          range: GAME_CONFIG.WEB_SHOT_RANGE,
          knockback: 0,
          launch: 0,
          type: 'webShot',
          stun: GAME_CONFIG.WEB_SHOT_STUN,
        };
      case PLAYER_STATES.WEB_PULL:
        return {
          damage: 0,
          range: GAME_CONFIG.WEB_PULL_RANGE,
          knockback: 0,
          launch: 0,
          type: 'webPull',
          stun: GAME_CONFIG.WEB_PULL_STUN,
        };
      default:
        return null;
    }
  }

  getHitboxRect() {
    const attack = this.getAttackData();
    if (!attack) return null;

    const dir = this.facingRight ? 1 : -1;

    if (attack.type === 'webShot' || attack.type === 'webPull') {
      // Long horizontal beam
      const hbX = this.facingRight ? this.x : this.x - attack.range;
      return new Phaser.Geom.Rectangle(hbX, this.y - 10, attack.range, 20);
    }

    if (attack.type === 'diveKick') {
      return new Phaser.Geom.Rectangle(
        this.x - 25, this.y - 10, 50, 40
      );
    }

    if (attack.type === 'swingKick') {
      return new Phaser.Geom.Rectangle(
        this.x + (dir > 0 ? 0 : -attack.range),
        this.y - 20,
        attack.range,
        40
      );
    }

    // Punch/kick hitbox
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
    return new Phaser.Geom.Rectangle(
      this.x - GAME_CONFIG.BODY_WIDTH / 2,
      this.y - GAME_CONFIG.BODY_HEIGHT / 2,
      GAME_CONFIG.BODY_WIDTH,
      GAME_CONFIG.BODY_HEIGHT
    );
  }

  takeDamage(amount, knockbackX) {
    if (this.invulnTimer > 0) return;
    if (this.state === PLAYER_STATES.HIT) return;

    this.health -= amount;
    this.health = Math.max(0, this.health);

    this.body.body.setVelocityX(knockbackX);
    this.body.body.setVelocityY(-150);
    this.enterState(PLAYER_STATES.HIT);
    this.invulnTimer = 500;

    // Release web if swinging
    if (this.web.active) {
      this.web.release();
    }

    // Release web pull target
    this.releasePullTarget();
  }

  applyHitstop(ms) {
    this.hitstopTimer = ms;
  }

  draw() {
    const poseKey = this.state;
    const poses = POSES[poseKey] || POSES.IDLE;
    let pose;

    const frameCount = poses.length;
    if (frameCount === 1) {
      pose = poses[0];
    } else {
      let totalDuration;
      let looping = false;
      switch (this.state) {
        case PLAYER_STATES.IDLE: totalDuration = 800; looping = true; break;
        case PLAYER_STATES.RUN: totalDuration = 400; looping = true; break;
        case PLAYER_STATES.PUNCH: totalDuration = GAME_CONFIG.PUNCH_DURATION; break;
        case PLAYER_STATES.KICK: totalDuration = GAME_CONFIG.KICK_DURATION; break;
        case PLAYER_STATES.WEB_PULL: totalDuration = GAME_CONFIG.WEB_PULL_DURATION; break;
        case PLAYER_STATES.HIT: totalDuration = 300; break;
        default: totalDuration = 400; break;
      }

      const timer = looping ? (this.stateTimer % totalDuration) : this.stateTimer;
      const frameDuration = totalDuration / frameCount;
      const currentFrame = looping
        ? Math.floor(timer / frameDuration) % frameCount
        : Math.min(Math.floor(timer / frameDuration), frameCount - 1);
      const nextFrame = looping
        ? (currentFrame + 1) % frameCount
        : Math.min(currentFrame + 1, frameCount - 1);
      const t = (timer % frameDuration) / frameDuration;

      if (currentFrame === nextFrame) {
        pose = poses[currentFrame];
      } else {
        pose = lerpPose(poses[currentFrame], poses[nextFrame], t);
      }
    }

    // Blink when invulnerable
    if (this.invulnTimer > 0 && Math.floor(this.invulnTimer / 60) % 2 === 0) {
      this.graphics.clear();
      return;
    }

    const drawX = this.x;
    const drawY = this.y + GAME_CONFIG.BODY_HEIGHT / 2 - 30;
    const showGhost = this.isAttacking() || this.state === PLAYER_STATES.SWING;

    this.renderer.draw(drawX, drawY, pose, this.facingRight, showGhost);
  }

  drawWeb() {
    this.webGraphics.clear();

    const g = this.webGraphics;

    // Draw web pull line to target
    if (this.state === PLAYER_STATES.WEB_PULL && this.pullTarget) {
      const target = this.pullTarget;
      const tx = target.x || target.body?.x || 0;
      const ty = (target.y || target.body?.y || 0) - 20;

      // Main web line
      g.lineStyle(3, 0xffffff, 0.9);
      g.lineBetween(this.x, this.y - 20, tx, ty);

      // Secondary strands
      g.lineStyle(1, 0xcccccc, 0.5);
      g.lineBetween(this.x + 2, this.y - 18, tx + 3, ty + 3);
      g.lineBetween(this.x - 2, this.y - 22, tx - 3, ty - 3);

      // Web splat on target
      g.fillStyle(0xffffff, 0.7);
      g.fillCircle(tx, ty, 5);
      for (let i = 0; i < 4; i++) {
        const angle = (i / 4) * Math.PI * 2;
        const len = 6 + Math.random() * 4;
        g.lineStyle(1, 0xffffff, 0.5);
        g.lineBetween(tx, ty, tx + Math.cos(angle) * len, ty + Math.sin(angle) * len);
      }
    }

    // Draw web projectile during web shot
    if (this.state === PLAYER_STATES.WEB_SHOT && this.stateTimer >= 30 && this.stateTimer <= 180) {
      const dir = this.facingRight ? 1 : -1;
      const progress = (this.stateTimer - 30) / 150;
      const projX = this.x + dir * progress * GAME_CONFIG.WEB_SHOT_RANGE;
      const projY = this.y - 20;

      // Web glob
      g.fillStyle(0xffffff, 0.9 - progress * 0.3);
      g.fillCircle(projX, projY, 4);

      // Trailing web lines
      g.lineStyle(2, 0xffffff, 0.7 - progress * 0.3);
      g.lineBetween(this.x, this.y - 20, projX, projY);

      // Thin trailing strands
      g.lineStyle(1, 0xcccccc, 0.4);
      g.lineBetween(this.x + 2, this.y - 18, projX + 2, projY + 2);
    }

    if (!this.web.active) return;

    // Web line from hand to anchor (swing)
    g.lineStyle(2, 0xffffff, 0.8);
    g.lineBetween(this.x, this.y - 20, this.web.anchorX, this.web.anchorY);

    // Thin secondary line for visual depth
    g.lineStyle(1, 0xcccccc, 0.4);
    const midX = (this.x + this.web.anchorX) / 2 + (Math.random() - 0.5) * 4;
    const midY = (this.y - 20 + this.web.anchorY) / 2 + 10;
    g.lineBetween(this.x + 2, this.y - 18, midX, midY);
    g.lineBetween(midX, midY, this.web.anchorX, this.web.anchorY);

    // Anchor point glow
    g.fillStyle(0xffffff, 0.6);
    g.fillCircle(this.web.anchorX, this.web.anchorY, 3);
  }

  destroy() {
    this.graphics.destroy();
    this.webGraphics.destroy();
    this.body.destroy();
  }
}
