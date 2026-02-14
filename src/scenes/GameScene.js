import Phaser from 'phaser';
import { GAME_CONFIG, PLAYER_STATES } from '../config.js';
import { Player } from '../player/Player.js';
import { Enemy } from '../enemies/Enemy.js';
import { EnemySpawner } from '../enemies/EnemySpawner.js';
import { Background } from '../level/Background.js';
import { HUD } from '../ui/HUD.js';
import { ComboMeter } from '../ui/ComboMeter.js';
import { InputManager } from '../input/InputManager.js';
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
} from '../effects/SpecialEffects.js';

export class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  create() {
    // World bounds
    this.physics.world.setBounds(0, 0, GAME_CONFIG.LEVEL_WIDTH, GAME_CONFIG.HEIGHT);

    // Ground - invisible physics platform
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

    // Player
    this.player = new Player(this, 200, GAME_CONFIG.GROUND_Y - 40);
    this.physics.add.collider(this.player.body, ground);

    // Camera
    this.cameras.main.setBounds(0, 0, GAME_CONFIG.LEVEL_WIDTH, GAME_CONFIG.HEIGHT);
    this.cameras.main.startFollow(this.player.body, true, 0.08, 0.05);
    this.cameras.main.setFollowOffset(-100, 50);

    // Enemies
    this.enemies = [];
    this.spawner = new EnemySpawner();

    // Input
    this.inputManager = new InputManager(this);

    // Effects
    this.screenEffects = new ScreenEffects(this);

    // Scoring
    this.score = 0;
    this.combo = new ComboMeter();
    this.maxCombo = 0;

    // HUD
    this.hud = new HUD(this);

    // Track last dive kick landing for shockwave
    this.lastDiveKickState = false;
  }

  update(time, delta) {
    // Screen effects
    this.screenEffects.update(delta);

    // Input
    const actions = this.inputManager.getActions(delta);

    // Player update
    this.player.update(delta, actions);

    // Dive kick landing detection
    if (this.lastDiveKickState && this.player.state !== PLAYER_STATES.DIVE_KICK) {
      if (this.player.isGrounded) {
        spawnDiveKickShockwave(this, this.player.x, GAME_CONFIG.GROUND_Y);
        this.screenEffects.shakeHeavy();
        // Damage nearby enemies - massive shockwave launches them
        this.enemies.forEach(enemy => {
          if (!enemy.alive) return;
          const dist = Math.abs(enemy.x - this.player.x);
          if (dist < 180) {
            const dir = enemy.x > this.player.x ? 1 : -1;
            const killed = enemy.takeDamage(GAME_CONFIG.DIVE_KICK_DAMAGE, dir * GAME_CONFIG.DIVE_KICK_KNOCKBACK, GAME_CONFIG.DIVE_KICK_LAUNCH);
            if (killed !== false) {
              this.onEnemyHit(enemy, 'diveKick');
            }
          }
        });
      }
    }
    this.lastDiveKickState = this.player.state === PLAYER_STATES.DIVE_KICK;

    // Spawn enemies based on camera position
    const cameraX = this.cameras.main.scrollX;
    const spawned = this.spawner.update(cameraX, this.enemies.filter(e => e.alive).length);
    for (const def of spawned) {
      const enemy = new Enemy(this, def.x, GAME_CONFIG.GROUND_Y - 40, def.type);
      this.physics.add.collider(enemy.body, this.groundBody);
      this.enemies.push(enemy);
    }

    // Update enemies
    this.enemies.forEach(enemy => {
      if (enemy.alive) {
        enemy.update(delta, this.player.x, this.player.y);

        // Update projectiles
        const projData = enemy.updateProjectile(delta);
        if (projData) {
          this.checkProjectileHitPlayer(projData, enemy);
        }

        // Update bombs
        const bombData = enemy.updateBomb(delta);
        if (bombData) {
          this.handleBombExplosion(bombData);
        }
      } else {
        // Update dead enemies for ragdoll animation
        enemy.update(delta, 0, 0);
      }
    });

    // Combat resolution: player attacks enemies
    this.resolvePlayerAttacks();

    // Combat resolution: enemies attack player
    this.resolveEnemyAttacks();

    // Combo update
    this.combo.update(delta);

    // Clean up dead enemies
    this.cleanupDeadEnemies();

    // Camera lead based on player velocity
    const velX = this.player.body.body.velocity.x;
    this.cameras.main.setFollowOffset(-100 - velX * 0.15, 50);

    // Speed zoom
    const speed = Math.abs(velX);
    const targetZoom = speed > 400 ? 0.92 : 1;
    const currentZoom = this.cameras.main.zoom;
    this.cameras.main.setZoom(currentZoom + (targetZoom - currentZoom) * 0.05);

    // Update HUD
    this.hud.update(
      delta,
      this.player.health,
      this.player.maxHealth,
      this.score,
      this.combo.count,
      this.spawner.currentWave,
      this.spawner.totalWaves,
      this.spawner.showGoPrompt
    );

    // Game over conditions
    if (this.player.health <= 0) {
      this.scene.start('GameOverScene', {
        score: this.score,
        maxCombo: this.maxCombo,
        won: false,
      });
    }

    // Win condition: all waves done, no enemies alive
    if (this.spawner.isComplete() && this.enemies.filter(e => e.alive).length === 0) {
      this.scene.start('GameOverScene', {
        score: this.score,
        maxCombo: this.maxCombo,
        won: true,
      });
    }
  }

  resolvePlayerAttacks() {
    if (!this.player.isAttacking() || !this.player.isOnActiveFrame() || this.player.hasHit) return;

    const hitbox = this.player.getHitboxRect();
    if (!hitbox) return;

    const attackData = this.player.getAttackData();
    if (!attackData) return;

    // Spider-man cleaves through ALL enemies in range
    let hitAny = false;
    this.enemies.forEach(enemy => {
      if (!enemy.alive) return;

      const hurtbox = enemy.getHurtboxRect();
      if (!Phaser.Geom.Rectangle.Overlaps(hitbox, hurtbox)) return;

      // Apply combo damage multiplier
      const dmgMultiplier = this.combo.getDamageMultiplier();
      const damage = Math.floor(attackData.damage * dmgMultiplier);

      const dir = this.player.facingRight ? 1 : -1;

      if (attackData.type === 'webShot') {
        // Web shot stuns ALL enemies in line
        enemy.stun(attackData.stun);
        spawnWebHitEffect(this, enemy.x, enemy.y - 20);
        this.onEnemyHit(enemy, 'webShot');
        hitAny = true;
        return;
      }

      const launchY = attackData.launch || -150;
      const killed = enemy.takeDamage(damage, dir * attackData.knockback, launchY);
      if (killed === false) return; // Dodged

      hitAny = true;
      this.onEnemyHit(enemy, attackData.type);

      if (!enemy.alive) {
        this.onEnemyKilled(enemy, attackData.type);
      }
    });

    if (hitAny) this.player.hasHit = true;
  }

  onEnemyHit(enemy, attackType) {
    // Score and combo
    const result = this.combo.hit(GAME_CONFIG.SCORE_PER_HIT);
    this.score += result.score;
    if (this.combo.count > this.maxCombo) this.maxCombo = this.combo.count;

    // Visual effects based on attack type
    const hitX = (this.player.x + enemy.x) / 2;
    const hitY = (this.player.y + enemy.y) / 2;

    const dir = this.player.facingRight ? 1 : -1;
    switch (attackType) {
      case 'punch':
        spawnHitSparks(this, hitX, hitY, 0xffff00, 12);
        spawnSpeedLines(this, hitX, hitY, dir, 0xffff00, 4);
        this.screenEffects.shakeMedium();
        this.screenEffects.flash(0xffffff, 0.1, 60);
        this.player.applyHitstop(GAME_CONFIG.HITSTOP_LIGHT);
        enemy.applyHitstop(GAME_CONFIG.HITSTOP_LIGHT);
        SoundManager.heavyHit();
        break;
      case 'kick':
        spawnHitSparks(this, hitX, hitY, 0xff8800, 16);
        spawnSpeedLines(this, hitX, hitY, dir, 0xff8800, 6);
        spawnShockwave(this, hitX, hitY, 0xff8800, 50);
        this.screenEffects.shakeHeavy();
        this.screenEffects.flash(0xffffff, 0.15, 80);
        this.player.applyHitstop(GAME_CONFIG.HITSTOP_MEDIUM);
        enemy.applyHitstop(GAME_CONFIG.HITSTOP_MEDIUM);
        SoundManager.heavyHit();
        break;
      case 'diveKick':
        spawnHitSparks(this, hitX, hitY, 0xff4400, 20);
        spawnShockwave(this, hitX, hitY, 0xff4400, 80);
        this.screenEffects.shakeHeavy();
        this.screenEffects.flash(0xff4400, 0.2, 100);
        this.player.applyHitstop(GAME_CONFIG.HITSTOP_HEAVY);
        enemy.applyHitstop(GAME_CONFIG.HITSTOP_HEAVY);
        SoundManager.heavyHit();
        break;
      case 'swingKick':
        spawnHitSparks(this, hitX, hitY, 0x44aaff, 18);
        spawnSpeedLines(this, hitX, hitY, dir, 0x44aaff, 8);
        spawnShockwave(this, hitX, hitY, 0x44aaff, 70);
        this.screenEffects.shakeHeavy();
        this.screenEffects.flash(0x44aaff, 0.15, 80);
        this.player.applyHitstop(GAME_CONFIG.HITSTOP_HEAVY);
        enemy.applyHitstop(GAME_CONFIG.HITSTOP_HEAVY);
        SoundManager.heavyHit();
        // Style bonus
        this.score += GAME_CONFIG.SCORE_SWING_SMASH;
        spawnStyleBonus(this, hitX, hitY - 20, 'SWING SMASH! +50');
        SoundManager.styleBonus();
        break;
      case 'webShot':
        // Already handled
        break;
    }

    // Combo milestones
    if (this.combo.count === 5) {
      this.screenEffects.slowmo(GAME_CONFIG.SLOWMO_COMBO, GAME_CONFIG.SLOWMO_DURATION);
    }

    // Air combo bonus
    if (!this.player.isGrounded && this.combo.count >= 3 && attackType !== 'webShot') {
      this.score += GAME_CONFIG.SCORE_AIR_COMBO;
      spawnStyleBonus(this, hitX, hitY - 40, 'AIR COMBO! +30');
    }

    // Combo count display
    if (this.combo.count > 2) {
      spawnComboText(this, hitX, hitY - 30, `${this.combo.count}x`);
    }
  }

  onEnemyKilled(enemy, attackType) {
    this.score += enemy.type.score;
    spawnEnemyDeathEffect(this, enemy.x, enemy.y, enemy.type.color);
    SoundManager.enemyDeath();

    // Web finisher bonus
    if (attackType === 'webShot' || attackType === 'swingKick') {
      this.score += GAME_CONFIG.SCORE_WEB_FINISHER;
      spawnStyleBonus(this, enemy.x, enemy.y - 50, 'WEB FINISHER! +25');
    }

    // Last enemy kill slowmo
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

      const playerHurtbox = this.player.getHurtboxRect();
      if (!Phaser.Geom.Rectangle.Overlaps(hitbox, playerHurtbox)) return;

      enemy.hasHit = true;
      const attackData = enemy.getAttackData();
      const dir = enemy.facingRight ? 1 : -1;
      this.player.takeDamage(attackData.damage, dir * attackData.knockback);

      spawnHitSparks(this, this.player.x, this.player.y, 0xff0000, 6);
      this.screenEffects.shakeLight();
      SoundManager.enemyHit();
    });
  }

  checkProjectileHitPlayer(projData, enemy) {
    const playerHurtbox = this.player.getHurtboxRect();
    const projRect = new Phaser.Geom.Rectangle(
      projData.x - projData.radius, projData.y - projData.radius,
      projData.radius * 2, projData.radius * 2
    );

    if (Phaser.Geom.Rectangle.Overlaps(projRect, playerHurtbox)) {
      this.player.takeDamage(projData.damage, this.player.x > enemy.x ? 100 : -100);
      spawnHitSparks(this, this.player.x, this.player.y, enemy.type.color, 4);
      this.screenEffects.shakeLight();
      // Destroy projectile
      if (enemy.projectile) {
        enemy.projectile.alive = false;
        if (enemy.projectile.graphics) enemy.projectile.graphics.destroy();
        enemy.projectile = null;
      }
    }
  }

  handleBombExplosion(bombData) {
    // Visual explosion
    spawnShockwave(this, bombData.x, bombData.y, 0x44cc44, bombData.radius);
    spawnHitSparks(this, bombData.x, bombData.y, 0x44cc44, 10);
    SoundManager.bombExplode();
    this.screenEffects.shakeLight();

    // Check if player is in blast radius
    const dx = this.player.x - bombData.x;
    const dy = this.player.y - bombData.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < bombData.radius) {
      const dir = dx > 0 ? 1 : -1;
      this.player.takeDamage(bombData.damage, dir * 200);
    }
  }

  cleanupDeadEnemies() {
    this.enemies = this.enemies.filter(enemy => {
      if (!enemy.alive && enemy.stateTimer > 3000) {
        enemy.destroy();
        return false;
      }
      return true;
    });
  }
}
