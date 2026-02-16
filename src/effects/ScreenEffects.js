/**
 * Screen-level effects: shake, hitstop, slowmo, flash
 * Uses camera position offsets instead of Phaser cameras.
 */

export class ScreenEffects {
  constructor() {
    this.slowmoTimer = 0;
    this.slowmoScale = 1;

    // Camera shake
    this.shakeTimer = 0;
    this.shakeDuration = 0;
    this.shakeIntensity = 0;
    this.shakeOffsetX = 0;
    this.shakeOffsetY = 0;

    // Flash
    this.flashMesh = null;
  }

  shake(intensity = 5, duration = 150) {
    this.shakeIntensity = intensity;
    this.shakeDuration = duration;
    this.shakeTimer = duration;
  }

  shakeLight() {
    this.shake(3, 100);
  }

  shakeMedium() {
    this.shake(6, 200);
  }

  shakeHeavy() {
    this.shake(12, 300);
  }

  slowmo(scale, duration) {
    this.slowmoScale = scale;
    this.slowmoTimer = duration;
  }

  update(delta) {
    // Update shake
    if (this.shakeTimer > 0) {
      this.shakeTimer -= delta;
      const t = this.shakeTimer / this.shakeDuration;
      this.shakeOffsetX = (Math.random() - 0.5) * 2 * this.shakeIntensity * t;
      this.shakeOffsetY = (Math.random() - 0.5) * 2 * this.shakeIntensity * t;
      if (this.shakeTimer <= 0) {
        this.shakeOffsetX = 0;
        this.shakeOffsetY = 0;
      }
    }

    // Update slowmo
    if (this.slowmoTimer > 0) {
      this.slowmoTimer -= delta;
      if (this.slowmoTimer <= 0) {
        this.slowmoScale = 1;
      }
    }
  }

  getTimeScale() {
    return this.slowmoScale;
  }

  flash(color = 0xffffff, alpha = 0.3, duration = 100) {
    // Flash is handled via a CSS overlay for simplicity
    const el = document.getElementById('flash-overlay');
    if (!el) return;
    const hex = '#' + color.toString(16).padStart(6, '0');
    el.style.background = hex;
    el.style.opacity = alpha;
    el.style.display = 'block';
    el.style.transition = `opacity ${duration}ms ease-out`;
    requestAnimationFrame(() => {
      el.style.opacity = '0';
      setTimeout(() => { el.style.display = 'none'; }, duration);
    });
  }
}
