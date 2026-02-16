export const INPUT_CONFIGS = {
  KEYBOARD_1: {
    id: 'KEYBOARD_1',
    type: 'keyboard',
    keys: {
      left: 'KeyA',
      right: 'KeyD',
      jump: 'KeyW',
      jumpAlt: 'Space',
      down: 'KeyS',
      punch: 'KeyJ',
      kick: 'KeyK',
      web: 'KeyL',
      webShoot: 'KeyI',
    },
  },
  KEYBOARD_2: {
    id: 'KEYBOARD_2',
    type: 'keyboard',
    keys: {
      left: 'ArrowLeft',
      right: 'ArrowRight',
      jump: 'ArrowUp',
      jumpAlt: null,
      down: 'ArrowDown',
      punch: 'Numpad1',
      kick: 'Numpad2',
      web: 'Numpad3',
      webShoot: 'Numpad4',
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

// Global key state - shared across all InputManager instances
const keyState = {};

// Set up global listeners once
let listenersInstalled = false;
function installKeyListeners() {
  if (listenersInstalled) return;
  listenersInstalled = true;
  window.addEventListener('keydown', (e) => {
    keyState[e.code] = true;
    // Prevent default for game keys to stop scrolling
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
      e.preventDefault();
    }
  });
  window.addEventListener('keyup', (e) => {
    keyState[e.code] = false;
  });
}

export class InputManager {
  constructor(config) {
    this.config = config;
    installKeyListeners();

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
    const k = this.config.keys;
    return {
      left: !!keyState[k.left],
      right: !!keyState[k.right],
      jump: !!keyState[k.jump] || (k.jumpAlt && !!keyState[k.jumpAlt]),
      down: !!keyState[k.down],
      punch: !!keyState[k.punch],
      kick: !!keyState[k.kick],
      web: !!keyState[k.web],
      webShoot: !!keyState[k.webShoot],
    };
  }

  readGamepad() {
    const none = { left: false, right: false, jump: false, down: false, punch: false, kick: false, web: false, webShoot: false };
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    const pad = pads[this.config.padIndex];
    if (!pad || !pad.connected) return none;

    const DEADZONE = 0.3;
    const stickX = pad.axes[0] || 0;
    const stickY = pad.axes[1] || 0;
    const btn = (i) => pad.buttons[i] && pad.buttons[i].pressed;
    const trigger = (i) => pad.buttons[i] && pad.buttons[i].value > 0.3;

    return {
      left: (pad.buttons[14] && pad.buttons[14].pressed) || stickX < -DEADZONE,
      right: (pad.buttons[15] && pad.buttons[15].pressed) || stickX > DEADZONE,
      jump: btn(0),
      down: (pad.buttons[13] && pad.buttons[13].pressed) || stickY > DEADZONE,
      punch: btn(2),
      kick: btn(3),
      web: btn(1) || trigger(7),
      webShoot: btn(4) || btn(5),
    };
  }

  isConnected() {
    if (this.config.type === 'keyboard') return true;
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    const pad = pads[this.config.padIndex];
    return pad && pad.connected;
  }

  static detectAnyPress(excludeConfigs = []) {
    installKeyListeners();
    const excludeIds = excludeConfigs.map(c => c.id);

    // Check keyboards
    for (const configKey of ['KEYBOARD_1', 'KEYBOARD_2']) {
      const config = INPUT_CONFIGS[configKey];
      if (excludeIds.includes(config.id)) continue;
      for (const keyCode of Object.values(config.keys)) {
        if (keyCode !== null && keyState[keyCode]) return config;
      }
    }

    // Check gamepads
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    for (const configKey of ['GAMEPAD_0', 'GAMEPAD_1']) {
      const config = INPUT_CONFIGS[configKey];
      if (excludeIds.includes(config.id)) continue;
      const pad = pads[config.padIndex];
      if (!pad || !pad.connected) continue;
      for (let i = 0; i < pad.buttons.length; i++) {
        if (pad.buttons[i] && pad.buttons[i].pressed) return config;
      }
      if (Math.abs(pad.axes[0] || 0) > 0.5 || Math.abs(pad.axes[1] || 0) > 0.5) {
        return config;
      }
    }

    return null;
  }
}
