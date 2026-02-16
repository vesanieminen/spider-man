import * as THREE from 'three';
import { Scene } from '../core/Scene.js';
import { GAME_CONFIG, PLAYER_STATES, PLAYER_CHARACTERS } from '../config.js';
import { overlaps, makeRect } from '../core/Physics.js';
import { Player } from '../player/Player.js';
import { Enemy } from '../enemies/Enemy.js';
import { EnemySpawner } from '../enemies/EnemySpawner.js';
import { Background3D } from '../level/Background3D.js';
import { HUD } from '../ui/HUD.js';
import { ComboMeter } from '../ui/ComboMeter.js';
import { InputManager, INPUT_CONFIGS } from '../input/InputManager.js';
import { ScreenEffects } from '../effects/ScreenEffects.js';
import { Effects3D } from '../rendering/Effects3D.js';
import { SoundManager } from '../audio/SoundManager.js';

export class GameScene extends Scene {
  constructor() {
    super('GameScene');
  }

  init(data) {
    this.p1InputConfig = (data && data.inputConfig) || INPUT_CONFIGS.KEYBOARD_1;
  }

  create() {
    this.worldWidth = GAME_CONFIG.LEVEL_WIDTH;

    // Lighting
    const ambient = new THREE.AmbientLight(0x8090cc, 1.2);
    this.scene3D.add(ambient);
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(200, 200, 400);
    this.scene3D.add(dirLight);
    const fillLight = new THREE.DirectionalLight(0x4466aa, 0.5);
    fillLight.position.set(-200, 100, 200);
    this.scene3D.add(fillLight);

    // Background
    this.background = new Background3D(this.scene3D);

    // Effects
    this.effects = new Effects3D(this.scene3D);
    this.screenEffects = new ScreenEffects();

    // Players array: { player, input, active, lastDiveKickState, webLine }
    this.players = [];

    // Create P1
    const p1Input = new InputManager(this.p1InputConfig);
    const p1 = new Player(200, GAME_CONFIG.GROUND_Y - 40, PLAYER_CHARACTERS.PETER, 0);
    p1.addToScene(this.scene3D);
    this.players.push({
      player: p1,
      input: p1Input,
      active: true,
      lastDiveKickState: false,
      config: this.p1InputConfig,
      webLine: null,
    });

    // Track assigned input configs
    this.assignedConfigs = [this.p1InputConfig];

    // For backward compat
    this.player = p1;

    // Enemies
    this.enemies = [];
    this.spawner = new EnemySpawner();

    // Scoring
    this.score = 0;
    this.combo = new ComboMeter();
    this.maxCombo = 0;

    // HUD
    this.hud = new HUD();
    this.hud.show();

    // P2 join cooldown
    this.joinCooldown = 500;

    // Enemy target tracking
    this.enemyTargets = new Map();
    this.targetHysteresis = 1000;

    // Camera tracking state
    this.camX = 0;
    this.camY = 0;
    this.camZoom = 1;
  }

  update(time, delta) {
    // Apply slowmo
    const timeScale = this.screenEffects.getTimeScale();
    const scaledDelta = delta * timeScale;

    // Screen effects
    this.screenEffects.update(scaledDelta);

    // Effects update
    this.effects.update(scaledDelta);

    // P2 join detection
    this.joinCooldown -= scaledDelta;
    if (this.joinCooldown <= 0 && this.players.filter(p => p.active).length < 2) {
      const detectedConfig = InputManager.detectAnyPress(this.assignedConfigs);
      if (detectedConfig) {
        this.spawnPlayer2(detectedConfig);
      }
    }

    // Check gamepad disconnects
    for (const slot of this.players) {
      if (slot.active && slot.config.type === 'gamepad' && !slot.input.isConnected()) {
        this.removePlayer(slot);
      }
    }

    // Update all active players
    for (const slot of this.players) {
      if (!slot.active) continue;
      const actions = slot.input.getActions(scaledDelta);
      slot.player.update(scaledDelta, actions);

      // Dive kick landing detection
      this.handleDiveKickLanding(slot);

      // Web pull
      this.handleWebPull(slot.player, scaledDelta);

      // Web line rendering
      this.updateWebLine(slot);
    }

    const aliveEnemies = this.enemies.filter(e => e.alive);

    // Spawn enemies
    const cameraX = this.camX;
    const spawned = this.spawner.update(cameraX, aliveEnemies.length);
    for (const def of spawned) {
      const scaledType = def.scalers ? {
        ...def.type,
        hp: Math.round(def.type.hp * def.scalers.hp),
        damage: Math.round(def.type.damage * def.scalers.dmg),
        speed: Math.round(def.type.speed * def.scalers.speed),
      } : def.type;

      const spawnY = GAME_CONFIG.GROUND_Y - 40 * (scaledType.bodyScale || 1);
      const enemy = new Enemy(this.scene3D, def.x, spawnY, scaledType);
      this.enemies.push(enemy);

      // Expand world as needed
      this.expandWorld(def.x + 800);

      // Boss entry text
      if (scaledType.isBoss) {
        this.effects.spawnBossEntryText(scaledType.name);
      }
    }

    // Update enemies
    this.enemies.forEach(enemy => {
      if (enemy.alive) {
        const target = this.getNearestPlayer(enemy.x, enemy.y, enemy);
        enemy.update(scaledDelta, target.x, target.y);

        // Projectiles
        const projData = enemy.updateProjectile(scaledDelta);
        if (projData) {
          this.checkProjectileHitPlayers(projData, enemy);
        }

        // Bombs
        const bombData = enemy.updateBomb(scaledDelta);
        if (bombData) {
          this.handleBombExplosion(bombData);
        }
      } else {
        enemy.update(scaledDelta, 0, 0);
        // Render ragdoll
        if (enemy.ragdoll) {
          this.effects.renderRagdoll(enemy.ragdoll, enemy.type.color);
        }
      }
    });

    // Combat resolution: players attack enemies
    for (const slot of this.players) {
      if (!slot.active) continue;
      this.resolvePlayerAttack(slot.player);
    }

    // Combat resolution: enemies attack players
    this.resolveEnemyAttacks();

    // Combo update
    this.combo.update(scaledDelta);

    // Clean up dead enemies
    this.cleanupDeadEnemies();

    // Camera
    this.updateCamera(scaledDelta);

    // Update HUD
    const activePlayers = this.players.filter(p => p.active);
    const p1 = activePlayers[0];
    const p2 = activePlayers.length > 1 ? activePlayers[1] : null;
    const activeBoss = this.enemies.find(e => e.alive && e.type.isBoss);

    this.hud.update(
      scaledDelta,
      p1 ? p1.player.health : 0,
      p1 ? p1.player.maxHealth : 1,
      this.score,
      this.combo.count,
      this.spawner.currentWave,
      this.spawner.totalWaves,
      this.spawner.showGoPrompt,
      p2 ? { health: p2.player.health, maxHealth: p2.player.maxHealth, name: p2.player.characterConfig.name } : null,
      p1 ? p1.player.characterConfig.name : 'PETER',
      activeBoss ? { health: activeBoss.health, maxHealth: activeBoss.maxHealth, name: activeBoss.type.name } : null,
      activePlayers.length < 2
    );

    // Game over check
    const allDead = this.players.filter(p => p.active).every(p => p.player.health <= 0);
    if (allDead && this.players.some(p => p.active)) {
      this.hud.hide();
      this.game.startScene('GameOverScene', {
        score: this.score,
        maxCombo: this.maxCombo,
        wave: this.spawner.currentWave,
      });
    }

    // Clean up far-behind enemies
    const cleanupX = cameraX - 800;
    this.enemies = this.enemies.filter(e => {
      if (!e.alive && e.x < cleanupX) {
        if (e.ragdoll) this.effects.cleanupRagdoll(e.ragdoll);
        e.destroy();
        return false;
      }
      return true;
    });
  }

  updateWebLine(slot) {
    const player = slot.player;
    if (player.web.active) {
      slot.webLine = this.effects.drawWebLine(
        player.x, player.y - 20,
        player.web.anchorX, player.web.anchorY,
        slot.webLine
      );
    } else {
      this.effects.hideWebLine(slot.webLine);
    }
  }

  spawnPlayer2(config) {
    const camCenter = this.camX + GAME_CONFIG.WIDTH / 2;
    const p2Input = new InputManager(config);
    const p2 = new Player(camCenter, GAME_CONFIG.GROUND_Y - 40, PLAYER_CHARACTERS.MILES, 1);
    p2.addToScene(this.scene3D);
    this.players.push({
      player: p2,
      input: p2Input,
      active: true,
      lastDiveKickState: false,
      config: config,
      webLine: null,
    });
    this.assignedConfigs.push(config);

    // "PLAYER 2 JOINED!" effect
    this.effects.spawnStyleBonus(camCenter, GAME_CONFIG.GROUND_Y - 100, 'PLAYER 2 JOINED!');
  }

  removePlayer(slot) {
    slot.active = false;
    slot.player.removeFromScene(this.scene3D);
    slot.player.destroy();
    const idx = this.assignedConfigs.indexOf(slot.config);
    if (idx !== -1) this.assignedConfigs.splice(idx, 1);
  }

  handleDiveKickLanding(slot) {
    const player = slot.player;
    if (slot.lastDiveKickState && player.state !== PLAYER_STATES.DIVE_KICK) {
      if (player.isGrounded) {
        this.effects.spawnDiveKickShockwave(player.x, GAME_CONFIG.GROUND_Y);
        this.screenEffects.shakeHeavy();
        this.enemies.forEach(enemy => {
          if (!enemy.alive) return;
          const dist = Math.abs(enemy.x - player.x);
          if (dist < 180) {
            const dir = enemy.x > player.x ? 1 : -1;
            const killed = enemy.takeDamage(GAME_CONFIG.DIVE_KICK_DAMAGE, dir * GAME_CONFIG.DIVE_KICK_KNOCKBACK, GAME_CONFIG.DIVE_KICK_LAUNCH);
            if (killed !== false) {
              this.onEnemyHit(enemy, 'diveKick', player);
            }
          }
        });
      }
    }
    slot.lastDiveKickState = player.state === PLAYER_STATES.DIVE_KICK;
  }

  handleWebPull(player, delta) {
    if (player.state !== PLAYER_STATES.WEB_PULL || !player.pullTarget) return;

    const enemy = player.pullTarget;
    if (!enemy.alive) {
      enemy.beingPulled = false;
      player.pullTarget = null;
      return;
    }

    const dx = player.x - enemy.x;
    const dist = Math.abs(dx);
    const dir = Math.sign(dx);

    if (dist > 50) {
      enemy.beingPulled = true;
      const pullSpeed = GAME_CONFIG.WEB_PULL_SPEED;
      enemy.physics.velocity.x = dir * pullSpeed;
    } else {
      enemy.beingPulled = false;
      enemy.physics.velocity.x = 0;
      enemy.stun(GAME_CONFIG.WEB_PULL_STUN);
      player.pullTarget = null;

      this.effects.spawnStyleBonus(enemy.x, enemy.y - 40, 'WEB YANK!');
      this.score += 20;
    }
  }

  getNearestPlayer(x, y, enemy) {
    const activePlayers = this.players.filter(p => p.active && p.player.health > 0);
    if (activePlayers.length === 0) return { x: 0, y: 0 };
    if (activePlayers.length === 1) return activePlayers[0].player;

    const currentTarget = this.enemyTargets.get(enemy);
    if (currentTarget && currentTarget.timer > 0) {
      const slot = activePlayers.find(p => p.player === currentTarget.player);
      if (slot && slot.player.health > 0) {
        currentTarget.timer -= 16;
        return slot.player;
      }
    }

    let nearest = activePlayers[0].player;
    let minDist = Infinity;
    for (const slot of activePlayers) {
      const ddx = slot.player.x - x;
      const ddy = slot.player.y - y;
      const dist = ddx * ddx + ddy * ddy;
      if (dist < minDist) {
        minDist = dist;
        nearest = slot.player;
      }
    }

    this.enemyTargets.set(enemy, { player: nearest, timer: this.targetHysteresis });
    return nearest;
  }

  expandWorld(neededX) {
    if (neededX <= this.worldWidth) return;
    this.worldWidth = neededX + 2000;
    this.background.expandGround(this.worldWidth);
  }

  updateCamera(delta) {
    const activePlayers = this.players.filter(p => p.active && p.player.health > 0);
    if (activePlayers.length === 0) return;

    const camera = this.game.camera;

    if (activePlayers.length === 1) {
      const p = activePlayers[0].player;
      const velX = p.physics.velocity.x;
      const targetX = p.x - GAME_CONFIG.WIDTH / 2 + 100 + velX * 0.15;
      const targetY = p.y - GAME_CONFIG.HEIGHT / 2 - 50;

      this.camX += (targetX - this.camX) * 0.08;
      this.camY += (targetY - this.camY) * 0.05;

      const speed = Math.abs(velX);
      const targetZoom = speed > 400 ? 0.92 : 1;
      this.camZoom += (targetZoom - this.camZoom) * 0.05;
    } else {
      const p1 = activePlayers[0].player;
      const p2 = activePlayers[1].player;
      const midX = (p1.x + p2.x) / 2;
      const midY = (p1.y + p2.y) / 2;
      const separation = Math.abs(p1.x - p2.x);

      const targetX = midX - GAME_CONFIG.WIDTH / 2;
      const targetY = midY - GAME_CONFIG.HEIGHT / 2 - 50;

      this.camX += (targetX - this.camX) * 0.08;
      this.camY += (targetY - this.camY) * 0.05;

      const targetZoom = separation > 400 ? Math.max(0.75, 1 - (separation - 400) / 800) : 1;
      this.camZoom += (targetZoom - this.camZoom) * 0.05;
    }

    // Clamp camera
    const aliveEnemies = this.enemies.filter(e => e.alive);
    let maxCamScrollX = this.worldWidth - GAME_CONFIG.WIDTH;
    if (aliveEnemies.length > 0) {
      const leftmostEnemy = Math.min(...aliveEnemies.map(e => e.x));
      maxCamScrollX = Math.min(maxCamScrollX, leftmostEnemy - 80);
    }
    this.camX = Math.max(0, Math.min(maxCamScrollX, this.camX));
    this.camY = Math.max(0, this.camY);

    // Apply camera position (Three.js: camera looks at center of visible area)
    const viewCenterX = this.camX + GAME_CONFIG.WIDTH / 2;
    const viewCenterY = -(this.camY + GAME_CONFIG.HEIGHT / 2);

    // Apply shake
    const shakeX = this.screenEffects.shakeOffsetX;
    const shakeY = this.screenEffects.shakeOffsetY;

    camera.position.x = viewCenterX + shakeX;
    camera.position.y = viewCenterY + shakeY;

    // Zoom: move camera along Z axis
    const baseZ = 800;
    camera.position.z = baseZ / this.camZoom;
    camera.lookAt(viewCenterX, viewCenterY, 0);

    // Clamp players to screen edges
    const screenLeft = this.camX + 20;
    const screenRight = this.camX + GAME_CONFIG.WIDTH / this.camZoom - 20;
    for (const slot of this.players) {
      if (!slot.active) continue;
      const p = slot.player;
      if (p.physics.x < screenLeft) {
        p.physics.x = screenLeft;
        p.x = p.physics.x;
      }
      if (p.physics.x > screenRight) {
        p.physics.x = screenRight;
        p.physics.velocity.x = 0;
        p.x = p.physics.x;
      }
    }
  }

  resolvePlayerAttack(player) {
    if (!player.isAttacking() || !player.isOnActiveFrame() || player.hasHit) return;

    const hitbox = player.getHitboxRect();
    if (!hitbox) return;

    const attackData = player.getAttackData();
    if (!attackData) return;

    let hitAny = false;
    this.enemies.forEach(enemy => {
      if (!enemy.alive) return;

      const hurtbox = enemy.getHurtboxRect();
      if (!overlaps(hitbox, hurtbox)) return;

      const dmgMultiplier = this.combo.getDamageMultiplier();
      const damage = Math.floor(attackData.damage * dmgMultiplier);
      const dir = player.facingRight ? 1 : -1;

      if (attackData.type === 'webShot') {
        enemy.stun(attackData.stun);
        this.effects.spawnWebHitEffect(enemy.x, enemy.y - 20);
        this.onEnemyHit(enemy, 'webShot', player);
        hitAny = true;
        return;
      }

      if (attackData.type === 'webPull') {
        player.pullTarget = enemy;
        enemy.stun(attackData.stun + GAME_CONFIG.WEB_PULL_DURATION);
        this.effects.spawnWebHitEffect(enemy.x, enemy.y - 20);
        SoundManager.webShoot();
        hitAny = true;
        return;
      }

      const launchY = attackData.launch || -150;
      const killed = enemy.takeDamage(damage, dir * attackData.knockback, launchY);
      if (killed === false) return;

      hitAny = true;
      this.onEnemyHit(enemy, attackData.type, player);

      if (!enemy.alive) {
        this.onEnemyKilled(enemy, attackData.type, player);
      }
    });

    if (hitAny) player.hasHit = true;
  }

  onEnemyHit(enemy, attackType, player) {
    const result = this.combo.hit(GAME_CONFIG.SCORE_PER_HIT);
    this.score += result.score;
    if (this.combo.count > this.maxCombo) this.maxCombo = this.combo.count;

    const hitX = (player.x + enemy.x) / 2;
    const hitY = (player.y + enemy.y) / 2;
    const dir = player.facingRight ? 1 : -1;

    switch (attackType) {
      case 'punch':
        this.effects.spawnHitSparks(hitX, hitY, 0xffff00, 12);
        this.effects.spawnSpeedLines(hitX, hitY, dir, 0xffff00, 4);
        this.screenEffects.shakeMedium();
        this.screenEffects.flash(0xffffff, 0.1, 60);
        player.applyHitstop(GAME_CONFIG.HITSTOP_LIGHT);
        enemy.applyHitstop(GAME_CONFIG.HITSTOP_LIGHT);
        SoundManager.heavyHit();
        break;
      case 'kick':
        this.effects.spawnHitSparks(hitX, hitY, 0xff8800, 16);
        this.effects.spawnSpeedLines(hitX, hitY, dir, 0xff8800, 6);
        this.effects.spawnShockwave(hitX, hitY, 0xff8800, 50);
        this.screenEffects.shakeHeavy();
        this.screenEffects.flash(0xffffff, 0.15, 80);
        player.applyHitstop(GAME_CONFIG.HITSTOP_MEDIUM);
        enemy.applyHitstop(GAME_CONFIG.HITSTOP_MEDIUM);
        SoundManager.heavyHit();
        break;
      case 'diveKick':
        this.effects.spawnHitSparks(hitX, hitY, 0xff4400, 20);
        this.effects.spawnShockwave(hitX, hitY, 0xff4400, 80);
        this.screenEffects.shakeHeavy();
        this.screenEffects.flash(0xff4400, 0.2, 100);
        player.applyHitstop(GAME_CONFIG.HITSTOP_HEAVY);
        enemy.applyHitstop(GAME_CONFIG.HITSTOP_HEAVY);
        SoundManager.heavyHit();
        break;
      case 'swingKick':
        this.effects.spawnHitSparks(hitX, hitY, 0x44aaff, 18);
        this.effects.spawnSpeedLines(hitX, hitY, dir, 0x44aaff, 8);
        this.effects.spawnShockwave(hitX, hitY, 0x44aaff, 70);
        this.screenEffects.shakeHeavy();
        this.screenEffects.flash(0x44aaff, 0.15, 80);
        player.applyHitstop(GAME_CONFIG.HITSTOP_HEAVY);
        enemy.applyHitstop(GAME_CONFIG.HITSTOP_HEAVY);
        SoundManager.heavyHit();
        this.score += GAME_CONFIG.SCORE_SWING_SMASH;
        this.effects.spawnStyleBonus(hitX, hitY - 20, 'SWING SMASH! +50');
        SoundManager.styleBonus();
        break;
      case 'webShot':
      case 'webPull':
        break;
    }

    // Miles venom strike effect on bosses
    if (player.characterConfig.style === 'electric' && enemy.type.isBoss) {
      this.effects.spawnVenomStrikeEffect(hitX, hitY);
    }

    // Combo milestones
    if (this.combo.count === 5) {
      this.screenEffects.slowmo(GAME_CONFIG.SLOWMO_COMBO, GAME_CONFIG.SLOWMO_DURATION);
    }

    // Air combo bonus
    if (!player.isGrounded && this.combo.count >= 3 && attackType !== 'webShot') {
      this.score += GAME_CONFIG.SCORE_AIR_COMBO;
      this.effects.spawnStyleBonus(hitX, hitY - 40, 'AIR COMBO! +30');
    }

    if (this.combo.count > 2) {
      this.effects.spawnComboText(hitX, hitY - 30, `${this.combo.count}x`);
    }
  }

  onEnemyKilled(enemy, attackType, player) {
    this.score += enemy.type.score;
    this.effects.spawnEnemyDeathEffect(enemy.x, enemy.y, enemy.type.color);
    SoundManager.enemyDeath();

    if (attackType === 'webShot' || attackType === 'swingKick') {
      this.score += GAME_CONFIG.SCORE_WEB_FINISHER;
      this.effects.spawnStyleBonus(enemy.x, enemy.y - 50, 'WEB FINISHER! +25');
    }

    const aliveCount = this.enemies.filter(e => e.alive).length;
    if (aliveCount === 0 && this.spawner.waveActive) {
      this.screenEffects.slowmo(GAME_CONFIG.SLOWMO_LAST_KILL, GAME_CONFIG.SLOWMO_DURATION);
      this.screenEffects.flash(0xffffff, 0.2, 150);
    }
  }

  resolveEnemyAttacks() {
    this.enemies.forEach(enemy => {
      if (!enemy.alive || !enemy.isAttacking() || !enemy.isOnActiveFrame() || enemy.hasHit) return;

      const hitbox = enemy.getHitboxRect();
      if (!hitbox) return;

      const attackData = enemy.getAttackData();

      for (const slot of this.players) {
        if (!slot.active || slot.player.health <= 0) continue;

        const playerHurtbox = slot.player.getHurtboxRect();
        if (!overlaps(hitbox, playerHurtbox)) continue;

        enemy.hasHit = true;
        const dir = enemy.facingRight ? 1 : -1;

        if (attackData.isGrab) {
          slot.player.takeDamage(attackData.damage, dir * attackData.knockback);
          this.effects.spawnGrabEffect(slot.player.x, slot.player.y);
          enemy.grabTarget = slot.player;
        } else if (attackData.isShockwave) {
          slot.player.takeDamage(attackData.damage, dir * attackData.knockback);
          this.effects.spawnGroundPoundWave(enemy.x, GAME_CONFIG.GROUND_Y, attackData.range);
        } else {
          slot.player.takeDamage(attackData.damage, dir * attackData.knockback);
        }

        this.effects.spawnHitSparks(slot.player.x, slot.player.y, 0xff0000, 6);
        this.screenEffects.shakeLight();
        SoundManager.enemyHit();
        break;
      }
    });

    // Handle ongoing grab damage
    this.enemies.forEach(enemy => {
      if (!enemy.alive || enemy.state !== 'GRAB' || !enemy.grabTarget) return;
      const target = enemy.grabTarget;
      if (target.health <= 0) {
        enemy.grabTarget = null;
        return;
      }
      if (enemy.grabTimer > 0 && Math.floor(enemy.grabTimer / 500) !== Math.floor((enemy.grabTimer - 16) / 500)) {
        target.takeDamage(enemy.type.grabDamage || 5, 0);
      }
    });
  }

  checkProjectileHitPlayers(projData, enemy) {
    const projRect = makeRect(
      projData.x - projData.radius, projData.y - projData.radius,
      projData.radius * 2, projData.radius * 2
    );

    for (const slot of this.players) {
      if (!slot.active || slot.player.health <= 0) continue;

      const playerHurtbox = slot.player.getHurtboxRect();
      if (overlaps(projRect, playerHurtbox)) {
        slot.player.takeDamage(projData.damage, slot.player.x > enemy.x ? 100 : -100);
        this.effects.spawnHitSparks(slot.player.x, slot.player.y, enemy.type.color, 4);
        this.screenEffects.shakeLight();
        if (enemy.projectile) {
          enemy.projectile.alive = false;
          enemy.projectile = null;
        }
        break;
      }
    }
  }

  handleBombExplosion(bombData) {
    this.effects.spawnShockwave(bombData.x, bombData.y, 0x44cc44, bombData.radius);
    this.effects.spawnHitSparks(bombData.x, bombData.y, 0x44cc44, 10);
    SoundManager.bombExplode();
    this.screenEffects.shakeLight();

    for (const slot of this.players) {
      if (!slot.active || slot.player.health <= 0) continue;

      const dx = slot.player.x - bombData.x;
      const dy = slot.player.y - bombData.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < bombData.radius) {
        const dir = dx > 0 ? 1 : -1;
        slot.player.takeDamage(bombData.damage, dir * 200);
      }
    }
  }

  cleanupDeadEnemies() {
    this.enemies = this.enemies.filter(enemy => {
      if (!enemy.alive && enemy.stateTimer > 3000) {
        this.enemyTargets.delete(enemy);
        if (enemy.ragdoll) this.effects.cleanupRagdoll(enemy.ragdoll);
        enemy.destroy();
        return false;
      }
      return true;
    });
  }

  destroy() {
    // Clean up all enemies
    for (const enemy of this.enemies) {
      if (enemy.ragdoll) this.effects.cleanupRagdoll(enemy.ragdoll);
      enemy.destroy();
    }
    this.enemies = [];

    // Clean up players
    for (const slot of this.players) {
      if (slot.webLine) {
        this.scene3D.remove(slot.webLine);
      }
      slot.player.destroy();
    }
    this.players = [];

    // Clean up effects
    this.effects.destroy();

    // Clean up background
    if (this.background) this.background.destroy();

    // Clean up HUD
    if (this.hud) this.hud.destroy();

    // Dispose scene
    super.destroy();
  }
}
