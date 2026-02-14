import Phaser from 'phaser';

export const INPUT_CONFIGS = {
  KEYBOARD_1: {
    id: 'KEYBOARD_1',
    type: 'keyboard',
    keys: {
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
      jump: Phaser.Input.Keyboard.KeyCodes.W,
      jumpAlt: Phaser.Input.Keyboard.KeyCodes.SPACE,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      punch: Phaser.Input.Keyboard.KeyCodes.J,
      kick: Phaser.Input.Keyboard.KeyCodes.K,
      web: Phaser.Input.Keyboard.KeyCodes.L,
      webShoot: Phaser.Input.Keyboard.KeyCodes.I,
    },
  },
  KEYBOARD_2: {
    id: 'KEYBOARD_2',
    type: 'keyboard',
    keys: {
      left: Phaser.Input.Keyboard.KeyCodes.LEFT,
      right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
      jump: Phaser.Input.Keyboard.KeyCodes.UP,
      jumpAlt: null,
      down: Phaser.Input.Keyboard.KeyCodes.DOWN,
      punch: Phaser.Input.Keyboard.KeyCodes.NUMPAD_ONE,
      kick: Phaser.Input.Keyboard.KeyCodes.NUMPAD_TWO,
      web: Phaser.Input.Keyboard.KeyCodes.NUMPAD_THREE,
      webShoot: Phaser.Input.Keyboard.KeyCodes.NUMPAD_FOUR,
    },
  },
  GAMEPAD_0: {
    id: 'GAMEPAD_0',
    type: 'gamepad',
    padIndex: 0,
  },
  GAMEPAD_1: {
    id: 'GAMEPAD_1',
    type: 'gamepad',
    padIndex: 1,
  },
};

export class InputManager {
  constructor(scene, config) {
    this.scene = scene;
    this.config = config;

    if (config.type === 'keyboard') {
      this.keys = {};
      for (const [action, keyCode] of Object.entries(config.keys)) {
        if (keyCode !== null) {
          this.keys[action] = scene.input.keyboard.addKey(keyCode);
        }
      }
    }

    this.prevState = {
      jump: false,
      punch: false,
      kick: false,
      web: false,
      webShoot: false,
    };
  }

  getActions(delta) {
    const raw = this.config.type === 'keyboard' ? this.readKeyboard() : this.readGamepad();

    const actions = {
      left: raw.left,
      right: raw.right,
      jump: raw.jump && !this.prevState.jump,
      down: raw.down,
      punch: raw.punch && !this.prevState.punch,
      kick: raw.kick && !this.prevState.kick,
      webShoot: raw.webShoot && !this.prevState.webShoot,
      webHoldStart: raw.web && !this.prevState.web,
      webHold: raw.web,
      webRelease: !raw.web && this.prevState.web,
    };

    this.prevState = {
      jump: raw.jump,
      punch: raw.punch,
      kick: raw.kick,
      web: raw.web,
      webShoot: raw.webShoot,
    };

    return actions;
  }

  readKeyboard() {
    return {
      left: this.keys.left && this.keys.left.isDown,
      right: this.keys.right && this.keys.right.isDown,
      jump: (this.keys.jump && this.keys.jump.isDown) || (this.keys.jumpAlt && this.keys.jumpAlt.isDown),
      down: this.keys.down && this.keys.down.isDown,
      punch: this.keys.punch && this.keys.punch.isDown,
      kick: this.keys.kick && this.keys.kick.isDown,
      web: this.keys.web && this.keys.web.isDown,
      webShoot: this.keys.webShoot && this.keys.webShoot.isDown,
    };
  }

  readGamepad() {
    const none = { left: false, right: false, jump: false, down: false, punch: false, kick: false, web: false, webShoot: false };
    const pads = this.scene.input.gamepad;
    if (!pads) return none;
    const pad = pads.getPad(this.config.padIndex);
    if (!pad || !pad.connected) return none;

    const DEADZONE = 0.3;
    const stickX = pad.leftStick ? pad.leftStick.x : 0;
    const stickY = pad.leftStick ? pad.leftStick.y : 0;
    const btn = (i) => pad.buttons[i] && pad.buttons[i].pressed;
    const trigger = (i) => pad.buttons[i] && pad.buttons[i].value > 0.3;

    return {
      left: pad.left || stickX < -DEADZONE,
      right: pad.right || stickX > DEADZONE,
      jump: btn(0),
      down: pad.down || stickY > DEADZONE,
      punch: btn(2),
      kick: btn(3),
      web: btn(1) || trigger(7),
      webShoot: btn(4) || btn(5), // Bumpers for web shoot
    };
  }

  isConnected() {
    if (this.config.type === 'keyboard') return true;
    const pads = this.scene.input.gamepad;
    if (!pads) return false;
    const pad = pads.getPad(this.config.padIndex);
    return pad && pad.connected;
  }

  static detectAnyPress(scene, excludeConfigs = []) {
    const excludeIds = excludeConfigs.map(c => c.id);

    // Check keyboards
    for (const configKey of ['KEYBOARD_1', 'KEYBOARD_2']) {
      const config = INPUT_CONFIGS[configKey];
      if (excludeIds.includes(config.id)) continue;
      const kb = scene.input.keyboard;
      for (const keyCode of Object.values(config.keys)) {
        if (keyCode !== null) {
          const key = kb.addKey(keyCode, false, false);
          if (key.isDown) return config;
        }
      }
    }

    // Check gamepads
    if (scene.input.gamepad) {
      for (const configKey of ['GAMEPAD_0', 'GAMEPAD_1']) {
        const config = INPUT_CONFIGS[configKey];
        if (excludeIds.includes(config.id)) continue;
        const pad = scene.input.gamepad.getPad(config.padIndex);
        if (!pad || !pad.connected) continue;
        for (let i = 0; i < pad.buttons.length; i++) {
          if (pad.buttons[i] && pad.buttons[i].pressed) return config;
        }
        if (pad.leftStick && (Math.abs(pad.leftStick.x) > 0.5 || Math.abs(pad.leftStick.y) > 0.5)) {
          return config;
        }
      }
    }

    return null;
  }
}
