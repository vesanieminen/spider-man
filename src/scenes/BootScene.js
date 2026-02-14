import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  create() {
    // Quick loading text
    const text = this.add.text(640, 360, 'Loading...', {
      fontSize: '24px',
      fontFamily: 'monospace',
      color: '#ffffff',
    }).setOrigin(0.5);

    this.time.delayedCall(300, () => {
      this.scene.start('TitleScene');
    });
  }
}
