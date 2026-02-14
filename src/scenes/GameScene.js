import Phaser from 'phaser';
import { GAME_CONFIG, PLAYER_STATES, PLAYER_CHARACTERS } from '../config.js';
import { Player } from '../player/Player.js';
import { Enemy } from '../enemies/Enemy.js';
import { EnemySpawner } from '../enemies/EnemySpawner.js';
import { Background } from '../level/Background.js';
import { HUD } from '../ui/HUD.js';
import { ComboMeter } from '../ui/ComboMeter.js';
import { InputManager, INPUT_CONFIGS } from '../input/InputManager.js';
import { ScreenEffects } from '../effects/ScreenEffects.js';
import { SoundManager } from '../audio/SoundManager.js';
import {
  spawnHitSparks,
  spawnSpeedLines,
  spawnDustPuff,
  spawnShockwave,
  spawnWebHitEffect,
  spawnEnemyDeathEffect,
  spawnComboText,
  spawnStyleBonus,
  spawnLandingDust,
  spawnDiveKickShockwave,
  spawnGroundPoundWave,
  spawnBossEntryText,
  spawnVenomStrikeEffect,
  spawnGrabEffect,
} from '../effects/SpecialEffects.js';

export class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  init(data) {
    this.p1InputConfig = (data && data.inputConfig) || INPUT_CONFIGS.KEYBOARD_1;
  }

  create() {
    // World bounds
    this.physics.world.setBounds(0, 0, GAME_CONFIG.LEVEL_WIDTH, GAME_CONFIG.HEIGHT);

    // Ground
    const ground = this.add.rectangle(
      GAME_CONFIG.LEVEL_WIDTH / 2,
      GAME_CONFIG.GROUND_Y + 50,
      GAME_CONFIG.LEVEL_WIDTH,
      100
    );
    this.physics.add.existing(ground, true);
    this.groundBody = ground;

    // Background
    this.background = new Background(this);

    // Players array: { player, input, active, lastDiveKickState }
    this.players = [];

    // Create P1
    const p1Input = new InputManager(this, this.p1InputConfig);
    const p1 = new Player(this, 200, GAME_CONFIG.GROUND_Y - 40, PLAYER_CHARACTERS.PETER, 0);
    this.physics.add.collider(p1.body, ground);
    this.players.push({
      player: p1,
      input: p1Input,
      active: true,
      lastDiveKickState: false,
      config: this.p1InputConfig,
    });

    // Track assigned input configs
    this.assignedConfigs = [this.p1InputConfig];

    // For backward compat, keep this.player pointing to P1
    this.player = p1;

    // Camera
    this.cameras.main.setBounds(0, 0, GAME_CONFIG.LEVEL_WIDTH, GAME_CONFIG.HEIGHT);

    // Enemies
    this.enemies = [];
    this.spawner = new EnemySpawner();

    // Effects
    this.screenEffects = new ScreenEffects(this);

    // Scoring
    this.score = 0;
    this.combo = new ComboMeter();
    this.maxCombo = 0;

    // HUD
    this.hud = new HUD(this);

    // P2 join cooldown (prevent instant join from title screen press)
    this.joinCooldown = 500;

    // Enemy target tracking (hysteresis to prevent flip-flopping)
    this.enemyTargets = new Map();
    this.targetHysteresis = 1000;
  }

  update(time, delta) {
    // Screen effects
    this.screenEffects.update(delta);

    // P2 join detection
    this.joinCooldown -= delta;
    if (this.joinCooldown <= 0 && this.players.filter(p => p.active).length < 2) {
      const detectedConfig = InputManager.detectAnyPress(this, this.assignedConfigs);
      if (detectedConfig) {
        this.spawnPlayer2(detectedConfig);
      }
    }

    // Check gamepad disconnects for gamepad players
    for (const slot of this.players) {
      if (slot.active && slot.config.type === 'gamepad' && !slot.input.isConnected()) {
        this.removePlayer(slot);
      }
    }

    // Update all active players
    for (const slot of this.players) {
      if (!slot.active) continue;
      const actions = slot.input.getActions(delta);
      slot.player.update(delta, actions);

      // Dive kick landing detection (per player)
      this.handleDiveKickLanding(slot);

      // Web pull: move enemy toward player
      this.handleWebPull(slot.player, delta);
    }

    // Spawn enemies based on camera position
    const cameraX = this.cameras.main.scrollX;
    const spawned = this.spawner.update(cameraX, this.enemies.filter(e => e.alive).length);
    for (const def of spawned) {
      const enemy = new Enemy(this, def.x, GAME_CONFIG.GROUND_Y - 40, def.type);
      this.physics.add.collider(enemy.body, this.groundBody);
      this.enemies.push(enemy);

      // Boss entry text
      if (def.type.isBoss) {
        spawnBossEntryText(this, def.type.name);
      }
    }

    // Update enemies - target nearest player
    this.enemies.forEach(enemy => {
      if (enemy.alive) {
        const target = this.getNearestPlayer(enemy.x, enemy.y, enemy);
        enemy.update(delta, target.x, target.y);

        // Update projectiles - check against all players
        const projData = enemy.updateProjectile(delta);
        if (projData) {
          this.checkProjectileHitPlayers(projData, enemy);
        }

        // Update bombs - check against all players
        const bombData = enemy.updateBomb(delta);
        if (bombData) {
          this.handleBombExplosion(bombData);
        }

        // Handle ground pound shockwave effects
        if (enemy.type.hasGroundPound && enemy.state === 'IDLE' && enemy.groundPoundPhase === null) {
          // Ground pound just landed - handled via isOnActiveFrame
        }
      } else {
        enemy.update(delta, 0, 0);
      }
    });

    // Combat resolution: all players attack enemies
    for (const slot of this.players) {
      if (!slot.active) continue;
      this.resolvePlayerAttack(slot.player);
    }

    // Combat resolution: enemies attack all players
    this.resolveEnemyAttacks();

    // Combo update
    this.combo.update(delta);

    // Clean up dead enemies
    this.cleanupDeadEnemies();

    // Camera: manual scroll for multi-player
    this.updateCamera(delta);

    // Update HUD
    const activePlayers = this.players.filter(p => p.active);
    const p1 = activePlayers[0];
    const p2 = activePlayers.length > 1 ? activePlayers[1] : null;
    const activeBoss = this.enemies.find(e => e.alive && e.type.isBoss);

    this.hud.update(
      delta,
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

    // Game over: all active players dead
    const allDead = this.players.filter(p => p.active).every(p => p.player.health <= 0);
    if (allDead && this.players.some(p => p.active)) {
      this.scene.start('GameOverScene', {
        score: this.score,
        maxCombo: this.maxCombo,
        won: false,
      });
    }

    // Win condition
    if (this.spawner.isComplete() && this.enemies.filter(e => e.alive).length === 0) {
      this.scene.start('GameOverScene', {
        score: this.score,
        maxCombo: this.maxCombo,
        won: true,
      });
    }
  }

  spawnPlayer2(config) {
    const camCenter = this.cameras.main.scrollX + GAME_CONFIG.WIDTH / 2;
    const p2Input = new InputManager(this, config);
    const p2 = new Player(this, camCenter, GAME_CONFIG.GROUND_Y - 40, PLAYER_CHARACTERS.MILES, 1);
    this.physics.add.collider(p2.body, this.groundBody);
    this.players.push({
      player: p2,
      input: p2Input,
      active: true,
      lastDiveKickState: false,
      config: config,
    });
    this.assignedConfigs.push(config);

    // "PLAYER 2 JOINED!" text effect
    const txt = this.add.text(camCenter, GAME_CONFIG.GROUND_Y - 100, 'PLAYER 2 JOINED!', {
      fontSize: '32px',
      fontFamily: 'monospace',
      color: '#ffee00',
      fontStyle: 'bold',
      stroke: '#000',
      strokeThickness: 4,
    }).setDepth(60).setOrigin(0.5);

    this.tweens.add({
      targets: txt,
      y: GAME_CONFIG.GROUND_Y - 160,
      alpha: 0,
      duration: 1500,
      ease: 'Power2',
      onComplete: () => txt.destroy(),
    });
  }

  removePlayer(slot) {
    slot.active = false;
    slot.player.destroy();
    const idx = this.assignedConfigs.indexOf(slot.config);
    if (idx !== -1) this.assignedConfigs.splice(idx, 1);
  }

  handleDiveKickLanding(slot) {
    const player = slot.player;
    if (slot.lastDiveKickState && player.state !== PLAYER_STATES.DIVE_KICK) {
      if (player.isGrounded) {
        spawnDiveKickShockwave(this, player.x, GAME_CONFIG.GROUND_Y);
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

    // Move enemy toward player
    const dx = player.x - enemy.x;
    const dist = Math.abs(dx);
    const dir = Math.sign(dx);

    if (dist > 50) {
      // Pull enemy toward player
      enemy.beingPulled = true;
      const pullSpeed = GAME_CONFIG.WEB_PULL_SPEED;
      enemy.body.body.setVelocityX(dir * pullSpeed);
    } else {
      // Enemy arrived - stun them in place
      enemy.beingPulled = false;
      enemy.body.body.setVelocityX(0);
      enemy.stun(GAME_CONFIG.WEB_PULL_STUN);
      player.pullTarget = null;

      // Style bonus
      spawnStyleBonus(this, enemy.x, enemy.y - 40, 'WEB YANK!');
      this.score += 20;
    }
  }

  getNearestPlayer(x, y, enemy) {
    const activePlayers = this.players.filter(p => p.active && p.player.health > 0);
    if (activePlayers.length === 0) return { x: 0, y: 0 };
    if (activePlayers.length === 1) return activePlayers[0].player;

    // Hysteresis: keep current target for a while
    const currentTarget = this.enemyTargets.get(enemy);
    if (currentTarget && currentTarget.timer > 0) {
      const slot = activePlayers.find(p => p.player === currentTarget.player);
      if (slot && slot.player.health > 0) {
        currentTarget.timer -= 16; // approximate frame delta
        return slot.player;
      }
    }

    // Find nearest
    let nearest = activePlayers[0].player;
    let minDist = Infinity;
    for (const slot of activePlayers) {
      const dx = slot.player.x - x;
      const dy = slot.player.y - y;
      const dist = dx * dx + dy * dy;
      if (dist < minDist) {
        minDist = dist;
        nearest = slot.player;
      }
    }

    this.enemyTargets.set(enemy, { player: nearest, timer: this.targetHysteresis });
    return nearest;
  }

  updateCamera(delta) {
    const activePlayers = this.players.filter(p => p.active && p.player.health > 0);
    if (activePlayers.length === 0) return;

    const cam = this.cameras.main;

    if (activePlayers.length === 1) {
      // Single player: follow with lead
      const p = activePlayers[0].player;
      const velX = p.body.body.velocity.x;
      const targetX = p.x - GAME_CONFIG.WIDTH / 2 + 100 + velX * 0.15;
      const targetY = p.y - GAME_CONFIG.HEIGHT / 2 - 50;

      cam.scrollX += (targetX - cam.scrollX) * 0.08;
      cam.scrollY += (targetY - cam.scrollY) * 0.05;

      // Speed zoom
      const speed = Math.abs(velX);
      const targetZoom = speed > 400 ? 0.92 : 1;
      cam.setZoom(cam.zoom + (targetZoom - cam.zoom) * 0.05);
    } else {
      // Two players: follow midpoint, zoom out when far apart
      const p1 = activePlayers[0].player;
      const p2 = activePlayers[1].player;
      const midX = (p1.x + p2.x) / 2;
      const midY = (p1.y + p2.y) / 2;
      const separation = Math.abs(p1.x - p2.x);

      const targetX = midX - GAME_CONFIG.WIDTH / 2;
      const targetY = midY - GAME_CONFIG.HEIGHT / 2 - 50;

      cam.scrollX += (targetX - cam.scrollX) * 0.08;
      cam.scrollY += (targetY - cam.scrollY) * 0.05;

      // Zoom out when players separate
      const targetZoom = separation > 400 ? Math.max(0.75, 1 - (separation - 400) / 800) : 1;
      cam.setZoom(cam.zoom + (targetZoom - cam.zoom) * 0.05);
    }

    // Clamp camera
    cam.scrollX = Math.max(0, Math.min(GAME_CONFIG.LEVEL_WIDTH - GAME_CONFIG.WIDTH, cam.scrollX));
    cam.scrollY = Math.max(0, Math.min(GAME_CONFIG.HEIGHT - GAME_CONFIG.HEIGHT, cam.scrollY));
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
      if (!Phaser.Geom.Rectangle.Overlaps(hitbox, hurtbox)) return;

      const dmgMultiplier = this.combo.getDamageMultiplier();
      const damage = Math.floor(attackData.damage * dmgMultiplier);

      const dir = player.facingRight ? 1 : -1;

      if (attackData.type === 'webShot') {
        enemy.stun(attackData.stun);
        spawnWebHitEffect(this, enemy.x, enemy.y - 20);
        this.onEnemyHit(enemy, 'webShot', player);
        hitAny = true;
        return;
      }

      if (attackData.type === 'webPull') {
        // Attach web to enemy and start pulling them toward player
        player.pullTarget = enemy;
        enemy.stun(attackData.stun + GAME_CONFIG.WEB_PULL_DURATION);
        spawnWebHitEffect(this, enemy.x, enemy.y - 20);
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
        spawnHitSparks(this, hitX, hitY, 0xffff00, 12);
        spawnSpeedLines(this, hitX, hitY, dir, 0xffff00, 4);
        this.screenEffects.shakeMedium();
        this.screenEffects.flash(0xffffff, 0.1, 60);
        player.applyHitstop(GAME_CONFIG.HITSTOP_LIGHT);
        enemy.applyHitstop(GAME_CONFIG.HITSTOP_LIGHT);
        SoundManager.heavyHit();
        break;
      case 'kick':
        spawnHitSparks(this, hitX, hitY, 0xff8800, 16);
        spawnSpeedLines(this, hitX, hitY, dir, 0xff8800, 6);
        spawnShockwave(this, hitX, hitY, 0xff8800, 50);
        this.screenEffects.shakeHeavy();
        this.screenEffects.flash(0xffffff, 0.15, 80);
        player.applyHitstop(GAME_CONFIG.HITSTOP_MEDIUM);
        enemy.applyHitstop(GAME_CONFIG.HITSTOP_MEDIUM);
        SoundManager.heavyHit();
        break;
      case 'diveKick':
        spawnHitSparks(this, hitX, hitY, 0xff4400, 20);
        spawnShockwave(this, hitX, hitY, 0xff4400, 80);
        this.screenEffects.shakeHeavy();
        this.screenEffects.flash(0xff4400, 0.2, 100);
        player.applyHitstop(GAME_CONFIG.HITSTOP_HEAVY);
        enemy.applyHitstop(GAME_CONFIG.HITSTOP_HEAVY);
        SoundManager.heavyHit();
        break;
      case 'swingKick':
        spawnHitSparks(this, hitX, hitY, 0x44aaff, 18);
        spawnSpeedLines(this, hitX, hitY, dir, 0x44aaff, 8);
        spawnShockwave(this, hitX, hitY, 0x44aaff, 70);
        this.screenEffects.shakeHeavy();
        this.screenEffects.flash(0x44aaff, 0.15, 80);
        player.applyHitstop(GAME_CONFIG.HITSTOP_HEAVY);
        enemy.applyHitstop(GAME_CONFIG.HITSTOP_HEAVY);
        SoundManager.heavyHit();
        this.score += GAME_CONFIG.SCORE_SWING_SMASH;
        spawnStyleBonus(this, hitX, hitY - 20, 'SWING SMASH! +50');
        SoundManager.styleBonus();
        break;
      case 'webShot':
        break;
      case 'webPull':
        break;
    }

    // Miles venom strike effect on bosses
    if (player.characterConfig.style === 'electric' && enemy.type.isBoss) {
      spawnVenomStrikeEffect(this, hitX, hitY);
    }

    // Combo milestones
    if (this.combo.count === 5) {
      this.screenEffects.slowmo(GAME_CONFIG.SLOWMO_COMBO, GAME_CONFIG.SLOWMO_DURATION);
    }

    // Air combo bonus
    if (!player.isGrounded && this.combo.count >= 3 && attackType !== 'webShot') {
      this.score += GAME_CONFIG.SCORE_AIR_COMBO;
      spawnStyleBonus(this, hitX, hitY - 40, 'AIR COMBO! +30');
    }

    if (this.combo.count > 2) {
      spawnComboText(this, hitX, hitY - 30, `${this.combo.count}x`);
    }
  }

  onEnemyKilled(enemy, attackType, player) {
    this.score += enemy.type.score;
    spawnEnemyDeathEffect(this, enemy.x, enemy.y, enemy.type.color);
    SoundManager.enemyDeath();

    if (attackType === 'webShot' || attackType === 'swingKick') {
      this.score += GAME_CONFIG.SCORE_WEB_FINISHER;
      spawnStyleBonus(this, enemy.x, enemy.y - 50, 'WEB FINISHER! +25');
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

      // Check against all active players
      for (const slot of this.players) {
        if (!slot.active || slot.player.health <= 0) continue;

        const playerHurtbox = slot.player.getHurtboxRect();
        if (!Phaser.Geom.Rectangle.Overlaps(hitbox, playerHurtbox)) continue;

        enemy.hasHit = true;
        const dir = enemy.facingRight ? 1 : -1;

        if (attackData.isGrab) {
          // Grab: lock player in HIT state, deal tick damage
          slot.player.takeDamage(attackData.damage, dir * attackData.knockback);
          spawnGrabEffect(this, slot.player.x, slot.player.y);
          enemy.grabTarget = slot.player;
        } else if (attackData.isShockwave) {
          // Ground pound shockwave
          slot.player.takeDamage(attackData.damage, dir * attackData.knockback);
          spawnGroundPoundWave(this, enemy.x, GAME_CONFIG.GROUND_Y, attackData.range);
        } else {
          slot.player.takeDamage(attackData.damage, dir * attackData.knockback);
        }

        spawnHitSparks(this, slot.player.x, slot.player.y, 0xff0000, 6);
        this.screenEffects.shakeLight();
        SoundManager.enemyHit();
        break; // Only hit one player per attack
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
      // Tick damage every 500ms
      if (enemy.grabTimer > 0 && Math.floor(enemy.grabTimer / 500) !== Math.floor((enemy.grabTimer - 16) / 500)) {
        target.takeDamage(enemy.type.grabDamage || 5, 0);
      }
    });
  }

  checkProjectileHitPlayers(projData, enemy) {
    const projRect = new Phaser.Geom.Rectangle(
      projData.x - projData.radius, projData.y - projData.radius,
      projData.radius * 2, projData.radius * 2
    );

    for (const slot of this.players) {
      if (!slot.active || slot.player.health <= 0) continue;

      const playerHurtbox = slot.player.getHurtboxRect();
      if (Phaser.Geom.Rectangle.Overlaps(projRect, playerHurtbox)) {
        slot.player.takeDamage(projData.damage, slot.player.x > enemy.x ? 100 : -100);
        spawnHitSparks(this, slot.player.x, slot.player.y, enemy.type.color, 4);
        this.screenEffects.shakeLight();
        if (enemy.projectile) {
          enemy.projectile.alive = false;
          if (enemy.projectile.graphics) enemy.projectile.graphics.destroy();
          enemy.projectile = null;
        }
        break;
      }
    }
  }

  handleBombExplosion(bombData) {
    spawnShockwave(this, bombData.x, bombData.y, 0x44cc44, bombData.radius);
    spawnHitSparks(this, bombData.x, bombData.y, 0x44cc44, 10);
    SoundManager.bombExplode();
    this.screenEffects.shakeLight();

    // Check all active players
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
        enemy.destroy();
        return false;
      }
      return true;
    });
  }
}
