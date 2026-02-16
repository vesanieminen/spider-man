import { Scene } from '../core/Scene.js';

export class BootScene extends Scene {
  constructor() {
    super('BootScene');
  }

  create() {
    // Hide HUD during boot
    document.getElementById('hud').style.display = 'none';
    this._timer = 0;
  }

  update(time, delta) {
    this._timer += delta;
    if (this._timer >= 300) {
      this.game.startScene('TitleScene');
    }
  }
}
