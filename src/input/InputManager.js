import Phaser from 'phaser';

export class InputManager {
  constructor(scene) {
    this.scene = scene;
    this.gamepad = null;

    this.keys = {
      left: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      jump: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      jumpAlt: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
      down: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      punch: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.J),
      kick: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.K),
      web: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.L),
    };

    this.prevState = {
      jump: false,
      punch: false,
      kick: false,
      web: false,
    };

    // Track web key hold time for tap vs hold
    this.webHoldTime = 0;
    this.webWasDown = false;

    if (scene.input.gamepad) {
      scene.input.gamepad.on('connected', (pad) => {
        if (!this.gamepad) this.gamepad = pad;
      });
      if (scene.input.gamepad.pad1) {
        this.gamepad = scene.input.gamepad.pad1;
      }
    }
  }

  getActions(delta) {
    const kb = this.readKeyboard();
    const gp = this.readGamepad();

    const raw = {
      left: kb.left || gp.left,
      right: kb.right || gp.right,
      jump: kb.jump || gp.jump,
      down: kb.down || gp.down,
      punch: kb.punch || gp.punch,
      kick: kb.kick || gp.kick,
      web: kb.web || gp.web,
      webHold: kb.web || gp.webHold,
    };

    // Track web hold duration
    if (raw.web) {
      this.webHoldTime += delta;
    } else {
      this.webHoldTime = 0;
    }

    const webJustPressed = raw.web && !this.prevState.web;
    const webJustReleased = !raw.web && this.prevState.web;
    const webIsHeld = raw.web && this.webHoldTime > 100;

    const actions = {
      left: raw.left,
      right: raw.right,
      jump: raw.jump && !this.prevState.jump,
      down: raw.down,
      punch: raw.punch && !this.prevState.punch,
      kick: raw.kick && !this.prevState.kick,
      webTap: webJustReleased && this.webHoldTime < 150 && this.webWasDown,
      webHoldStart: webJustPressed,
      webHold: webIsHeld,
      webRelease: webJustReleased && this.webHoldTime >= 150,
    };

    this.prevState = {
      jump: raw.jump,
      punch: raw.punch,
      kick: raw.kick,
      web: raw.web,
    };
    this.webWasDown = raw.web;

    return actions;
  }

  readKeyboard() {
    return {
      left: this.keys.left.isDown,
      right: this.keys.right.isDown,
      jump: this.keys.jump.isDown || this.keys.jumpAlt.isDown,
      down: this.keys.down.isDown,
      punch: this.keys.punch.isDown,
      kick: this.keys.kick.isDown,
      web: this.keys.web.isDown,
    };
  }

  readGamepad() {
    const pad = this.gamepad;
    const none = { left: false, right: false, jump: false, down: false, punch: false, kick: false, web: false, webHold: false };
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
      webHold: trigger(7),
    };
  }
}
