/**
 * Screen-level effects: shake, hitstop, slowmo
 */

export class ScreenEffects {
  constructor(scene) {
    this.scene = scene;
    this.slowmoTimer = 0;
    this.slowmoScale = 1;
  }

  shake(intensity = 0.01, duration = 150) {
    this.scene.cameras.main.shake(duration, intensity);
  }

  shakeLight() {
    this.shake(0.005, 100);
  }

  shakeMedium() {
    this.shake(0.012, 200);
  }

  shakeHeavy() {
    this.shake(0.025, 300);
  }

  slowmo(scale, duration) {
    this.slowmoScale = scale;
    this.slowmoTimer = duration;
    this.scene.time.timeScale = scale;
    this.scene.physics.world.timeScale = 1 / scale;
  }

  update(delta) {
    if (this.slowmoTimer > 0) {
      this.slowmoTimer -= delta;
      if (this.slowmoTimer <= 0) {
        this.scene.time.timeScale = 1;
        this.scene.physics.world.timeScale = 1;
        this.slowmoScale = 1;
      }
    }
  }

  flash(color = 0xffffff, alpha = 0.3, duration = 100) {
    const cam = this.scene.cameras.main;
    const g = this.scene.add.graphics().setDepth(100).setScrollFactor(0);
    g.fillStyle(color, alpha);
    g.fillRect(0, 0, cam.width, cam.height);
    this.scene.tweens.add({ targets: g, alpha: 0, duration, onComplete: () => g.destroy() });
  }
}
