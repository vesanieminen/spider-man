import { GAME_CONFIG, PLAYER_STATES, PLAYER_CHARACTERS } from '../config.js';
import { CharacterModel3D } from '../rendering/CharacterModel3D.js';
import { PhysicsBody, makeRect } from '../core/Physics.js';
import { WebPhysics } from './WebPhysics.js';
import { POSES, lerpPose } from './PlayerAnimations.js';
import { SoundManager } from '../audio/SoundManager.js';

export class Player {
  constructor(x, y, characterConfig, playerIndex = 0) {
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
    this.physics = new PhysicsBody(x, y, GAME_CONFIG.BODY_WIDTH, GAME_CONFIG.BODY_HEIGHT);
    this.physics.setMaxVelocity(800, 1000);

    this.x = x;
    this.y = y;

    // 3D model
    this.model = new CharacterModel3D(
      this.characterConfig.bodyColor,
      this.characterConfig.accentColor,
      1.0
    );

    // Web system
    this.web = new WebPhysics();

    // Combat
    this.attackTimer = 0;
    this.hasHit = false;
    this.attackCooldown = 0;
    this.punchCombo = 0;
    this.punchComboTimer = 0;

    // Invulnerability
    this.invulnTimer = 0;
    this.hitstopTimer = 0;

    // Dive kick
    this.diveKickActive = false;

    // Web pull
    this.pullTarget = null;
    this.pullTimer = 0;
  }

  update(delta, actions) {
    if (this.hitstopTimer > 0) {
      this.hitstopTimer -= delta;
      this.draw();
      return;
    }

    this.wasGrounded = this.isGrounded;
    this.isGrounded = this.physics.blocked.down;
    this.stateTimer += delta;

    // Physics update
    this.physics.update(delta, GAME_CONFIG.GROUND_Y);

    this.x = this.physics.x;
    this.y = this.physics.y;

    if (this.invulnTimer > 0) this.invulnTimer -= delta;
    if (this.attackCooldown > 0) this.attackCooldown -= delta;

    if (this.punchComboTimer > 0) {
      this.punchComboTimer -= delta;
      if (this.punchComboTimer <= 0) this.punchCombo = 0;
    }

    this.web.update(delta, this.physics);

    this.updateState(delta, actions);

    this.physics.x = Math.max(20, this.physics.x);
    this.x = this.physics.x;
    this.y = this.physics.y;

    this.draw();
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
    if (this.isGrounded && !this.wasGrounded) {
      SoundManager.land();
    }

    if (!this.isGrounded) {
      this.enterState(PLAYER_STATES.FALL);
      return;
    }

    let moving = false;
    if (actions.left) {
      this.physics.velocity.x = -GAME_CONFIG.PLAYER_SPEED;
      this.facingRight = false;
      moving = true;
    } else if (actions.right) {
      this.physics.velocity.x = GAME_CONFIG.PLAYER_SPEED;
      this.facingRight = true;
      moving = true;
    } else {
      this.physics.velocity.x = 0;
    }

    this.state = moving ? PLAYER_STATES.RUN : PLAYER_STATES.IDLE;

    if (actions.jump) {
      this.physics.velocity.y = GAME_CONFIG.JUMP_VELOCITY;
      this.enterState(PLAYER_STATES.JUMP);
      SoundManager.jump();
      return;
    }

    if (actions.webHold || actions.webHoldStart) {
      this.tryStartSwing();
      return;
    }

    if (actions.down && actions.webShoot && this.attackCooldown <= 0) {
      this.enterState(PLAYER_STATES.WEB_PULL);
      this.hasHit = false;
      this.pullTarget = null;
      this.pullTimer = 0;
      this.attackCooldown = 400;
      SoundManager.webShoot();
      return;
    }

    if (actions.webShoot && this.attackCooldown <= 0) {
      this.enterState(PLAYER_STATES.WEB_SHOT);
      this.hasHit = false;
      this.attackCooldown = 300;
      SoundManager.webShoot();
      return;
    }

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
    if (actions.left) {
      this.physics.velocity.x -= GAME_CONFIG.PLAYER_SPEED * GAME_CONFIG.AIR_CONTROL * (delta / 1000) * 10;
      this.facingRight = false;
    } else if (actions.right) {
      this.physics.velocity.x += GAME_CONFIG.PLAYER_SPEED * GAME_CONFIG.AIR_CONTROL * (delta / 1000) * 10;
      this.facingRight = true;
    }

    if (this.physics.velocity.y > 0 && this.state === PLAYER_STATES.JUMP) {
      this.state = PLAYER_STATES.FALL;
    }

    if (actions.webHold || actions.webHoldStart) {
      this.tryStartSwing();
      return;
    }

    if (actions.down && actions.webShoot && this.attackCooldown <= 0) {
      this.enterState(PLAYER_STATES.WEB_PULL);
      this.hasHit = false;
      this.pullTarget = null;
      this.pullTimer = 0;
      this.attackCooldown = 400;
      SoundManager.webShoot();
      return;
    }

    if (actions.webShoot && this.attackCooldown <= 0) {
      this.enterState(PLAYER_STATES.WEB_SHOT);
      this.hasHit = false;
      this.attackCooldown = 300;
      SoundManager.webShoot();
      return;
    }

    if (actions.down && actions.kick && this.attackCooldown <= 0) {
      this.enterState(PLAYER_STATES.DIVE_KICK);
      this.diveKickActive = true;
      this.hasHit = false;
      const dir = this.facingRight ? 1 : -1;
      this.physics.velocity.x = dir * GAME_CONFIG.DIVE_KICK_SPEED * 0.5;
      this.physics.velocity.y = GAME_CONFIG.DIVE_KICK_SPEED;
      return;
    }

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

    if (this.isGrounded) {
      this.enterState(PLAYER_STATES.LAND);
      SoundManager.land();
      return;
    }
  }

  handleSwingState(delta, actions) {
    this.web.update(delta, this.physics);

    if (actions.left) {
      this.web.pump(-1, this.physics);
      this.facingRight = false;
    } else if (actions.right) {
      this.web.pump(1, this.physics);
      this.facingRight = true;
    }

    if (actions.punch || actions.kick) {
      this.enterState(PLAYER_STATES.SWING_KICK);
      this.hasHit = false;
      return;
    }

    if (actions.webRelease || (!actions.webHold && !actions.webHoldStart && this.stateTimer > 100)) {
      const boost = this.web.getVelocityBoost(this.physics);
      this.web.release();
      this.physics.velocity.x = boost.x;
      this.physics.velocity.y = boost.y;
      SoundManager.webRelease();
      this.enterState(this.physics.velocity.y < 0 ? PLAYER_STATES.JUMP : PLAYER_STATES.FALL);
      return;
    }

    if (this.isGrounded && this.physics.velocity.y >= 0) {
      this.web.release();
      this.enterState(PLAYER_STATES.LAND);
      SoundManager.land();
      return;
    }

    if (this.stateTimer > 200 && Math.floor(this.stateTimer / 400) !== Math.floor((this.stateTimer - delta) / 400)) {
      SoundManager.webSwing();
    }
  }

  handleSwingKickState(delta, actions) {
    this.web.update(delta, this.physics);

    if (actions.left) this.web.pump(-1, this.physics);
    else if (actions.right) this.web.pump(1, this.physics);

    if (this.stateTimer > 300) {
      if (this.web.active) {
        this.enterState(PLAYER_STATES.SWING);
      } else {
        this.enterState(PLAYER_STATES.FALL);
      }
      return;
    }

    if (actions.webRelease || !actions.webHold) {
      const boost = this.web.getVelocityBoost(this.physics);
      this.web.release();
      this.physics.velocity.x = boost.x;
      this.physics.velocity.y = boost.y;
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
    const success = this.web.attach(this.x, this.y, this.physics.velocity.x);
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
      this.physics.velocity.x * this.physics.velocity.x +
      this.physics.velocity.y * this.physics.velocity.y
    );

    switch (this.state) {
      case PLAYER_STATES.PUNCH:
        return { damage: GAME_CONFIG.PUNCH_DAMAGE, range: GAME_CONFIG.PUNCH_RANGE, knockback: GAME_CONFIG.PUNCH_KNOCKBACK, launch: GAME_CONFIG.PUNCH_LAUNCH, type: 'punch' };
      case PLAYER_STATES.KICK:
        return { damage: GAME_CONFIG.KICK_DAMAGE, range: GAME_CONFIG.KICK_RANGE, knockback: GAME_CONFIG.KICK_KNOCKBACK, launch: GAME_CONFIG.KICK_LAUNCH, type: 'kick' };
      case PLAYER_STATES.DIVE_KICK:
        return { damage: GAME_CONFIG.DIVE_KICK_DAMAGE, range: 80, knockback: GAME_CONFIG.DIVE_KICK_KNOCKBACK, launch: GAME_CONFIG.DIVE_KICK_LAUNCH, type: 'diveKick' };
      case PLAYER_STATES.SWING_KICK:
        const bonusDamage = Math.floor(speed / 30);
        return { damage: GAME_CONFIG.SWING_KICK_BASE_DAMAGE + bonusDamage, range: 90, knockback: GAME_CONFIG.SWING_KICK_KNOCKBACK, launch: GAME_CONFIG.SWING_KICK_LAUNCH, type: 'swingKick' };
      case PLAYER_STATES.WEB_SHOT:
        return { damage: GAME_CONFIG.WEB_SHOT_DAMAGE, range: GAME_CONFIG.WEB_SHOT_RANGE, knockback: 0, launch: 0, type: 'webShot', stun: GAME_CONFIG.WEB_SHOT_STUN };
      case PLAYER_STATES.WEB_PULL:
        return { damage: 0, range: GAME_CONFIG.WEB_PULL_RANGE, knockback: 0, launch: 0, type: 'webPull', stun: GAME_CONFIG.WEB_PULL_STUN };
      default:
        return null;
    }
  }

  getHitboxRect() {
    const attack = this.getAttackData();
    if (!attack) return null;
    const dir = this.facingRight ? 1 : -1;

    if (attack.type === 'webShot' || attack.type === 'webPull') {
      const hbX = this.facingRight ? this.x : this.x - attack.range;
      return makeRect(hbX, this.y - 10, attack.range, 20);
    }
    if (attack.type === 'diveKick') {
      return makeRect(this.x - 25, this.y - 10, 50, 40);
    }
    if (attack.type === 'swingKick') {
      return makeRect(this.x + (dir > 0 ? 0 : -attack.range), this.y - 20, attack.range, 40);
    }
    const hbX = dir > 0
      ? this.x + GAME_CONFIG.BODY_WIDTH / 2
      : this.x - GAME_CONFIG.BODY_WIDTH / 2 - attack.range;
    return makeRect(hbX, this.y - GAME_CONFIG.BODY_HEIGHT / 2, attack.range, GAME_CONFIG.BODY_HEIGHT);
  }

  getHurtboxRect() {
    return makeRect(
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

    this.physics.velocity.x = knockbackX;
    this.physics.velocity.y = -150;
    this.enterState(PLAYER_STATES.HIT);
    this.invulnTimer = 500;

    if (this.web.active) {
      this.web.release();
    }
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
      this.model.setVisible(false);
      return;
    }
    this.model.setVisible(true);

    const drawX = this.x;
    const drawY = this.y + GAME_CONFIG.BODY_HEIGHT / 2 - 30;

    this.model.setPose(pose, this.facingRight, drawX, drawY);
  }

  addToScene(scene3D) {
    this.model.addToScene(scene3D);
  }

  removeFromScene(scene3D) {
    this.model.removeFromScene(scene3D);
  }

  destroy() {
    this.model.dispose();
  }
}
