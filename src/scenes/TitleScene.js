import * as THREE from 'three';
import { Scene } from '../core/Scene.js';
import { GAME_CONFIG } from '../config.js';
import { SoundManager } from '../audio/SoundManager.js';
import { InputManager, INPUT_CONFIGS } from '../input/InputManager.js';
import { Background3D } from '../level/Background3D.js';

export class TitleScene extends Scene {
  constructor() {
    super('TitleScene');
  }

  create() {
    // Lighting
    const ambient = new THREE.AmbientLight(0x404060, 1);
    this.scene3D.add(ambient);
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
    dirLight.position.set(200, 200, 400);
    this.scene3D.add(dirLight);

    // Background
    this.background = new Background3D(this.scene3D);

    // Swinging figure params
    this.swingAngle = 0;
    const cx = GAME_CONFIG.WIDTH / 2;
    this.webAnchorX = cx + 50;
    this.webAnchorY = 100;

    // Web line
    const webMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7 });
    const webGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 5),
      new THREE.Vector3(0, 0, 5),
    ]);
    this.webLine = new THREE.Line(webGeo, webMat);
    this.scene3D.add(this.webLine);

    // Simple stick figure using basic meshes
    this.figureMeshes = [];
    const bodyColor = 0x3366ff;
    const accentColor = 0xee2222;

    // Head
    const headGeo = new THREE.SphereGeometry(10, 8, 6);
    const headMat = new THREE.MeshLambertMaterial({ color: accentColor });
    this.head = new THREE.Mesh(headGeo, headMat);
    this.scene3D.add(this.head);
    this.figureMeshes.push(this.head);

    // Eyes
    const eyeGeo = new THREE.SphereGeometry(2.5, 6, 4);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    this.eyeL = new THREE.Mesh(eyeGeo, eyeMat);
    this.eyeR = new THREE.Mesh(eyeGeo, eyeMat);
    this.scene3D.add(this.eyeL);
    this.scene3D.add(this.eyeR);
    this.figureMeshes.push(this.eyeL, this.eyeR);

    // Body + limb cylinders
    const cylGeo = new THREE.CylinderGeometry(2, 2, 1, 6);
    const bodyMat = new THREE.MeshLambertMaterial({ color: bodyColor });
    const legMat = new THREE.MeshLambertMaterial({ color: accentColor });

    this.torso = new THREE.Mesh(cylGeo, bodyMat);
    this.armL = new THREE.Mesh(cylGeo, bodyMat);
    this.armR = new THREE.Mesh(cylGeo, bodyMat);
    this.legL = new THREE.Mesh(cylGeo, legMat);
    this.legR = new THREE.Mesh(cylGeo, legMat);
    for (const m of [this.torso, this.armL, this.armR, this.legL, this.legR]) {
      m.scale.set(3, 1, 3);
      this.scene3D.add(m);
      this.figureMeshes.push(m);
    }

    // Create CSS overlay for title text
    this.overlay = document.createElement('div');
    this.overlay.id = 'title-overlay';
    this.overlay.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;font-family:monospace;';
    this.overlay.innerHTML = `
      <div style="text-align:center;margin-top:80px;font-size:64px;color:#ff3333;font-weight:bold;text-shadow:0 0 6px #000,0 0 6px #000;">WEB SLINGER</div>
      <div style="text-align:center;margin-top:10px;font-size:20px;color:#6688ff;text-shadow:0 0 3px #000,0 0 3px #000;">A Spider Beat 'Em Up</div>
      <div style="text-align:center;margin-top:120px;font-size:14px;color:#aaa;text-shadow:0 0 3px #000;line-height:1.8;">
        P1: WASD + JKLI &nbsp;&nbsp; P2: Arrows + Numpad 1-4<br>
        Move - Jump - Punch - Kick - Web Swing - Web Shoot<br>
        I - Web Shot &nbsp;&nbsp; Down+I - Web Pull (yank enemy!)<br>
        Hold L - Web Swing &nbsp;&nbsp; Down+K (air) - Dive Kick<br>
        Gamepad: Bumpers = Web Shoot &nbsp;&nbsp; Supported!
      </div>
      <div style="text-align:center;margin-top:20px;font-size:16px;color:#ffee00;text-shadow:0 0 3px #000;">2-PLAYER CO-OP: Player 2 can join anytime!</div>
      <div id="title-start" style="text-align:center;margin-top:30px;font-size:24px;color:#ffff00;text-shadow:0 0 4px #000;">Press Any Key to Start</div>
    `;
    document.getElementById('game-container').appendChild(this.overlay);

    // Hide game HUD on title screen
    document.getElementById('hud').style.display = 'none';

    this.started = false;
    this.startDelay = 300;
  }

  startGame(inputConfig) {
    if (this.started) return;
    this.started = true;
    SoundManager.menuSelect();
    if (this.overlay && this.overlay.parentNode) {
      this.overlay.parentNode.removeChild(this.overlay);
    }
    this.game.startScene('GameScene', { inputConfig });
  }

  update(time, delta) {
    // Animate swinging figure
    this.swingAngle = Math.sin(time / 600) * 0.8;
    const ropeLen = 160;
    const px = this.webAnchorX + Math.sin(this.swingAngle) * ropeLen;
    const py = this.webAnchorY + Math.cos(this.swingAngle) * ropeLen;

    // Convert to Three.js coords (flip Y)
    const tpx = px;
    const tpy = -py;
    const anchorTy = -this.webAnchorY;

    // Web line
    const webPos = this.webLine.geometry.attributes.position.array;
    webPos[0] = tpx; webPos[1] = tpy + 20; webPos[2] = 5;
    webPos[3] = this.webAnchorX; webPos[4] = anchorTy; webPos[5] = 5;
    this.webLine.geometry.attributes.position.needsUpdate = true;

    // Head
    this.head.position.set(tpx, tpy + 48, 5);
    this.eyeL.position.set(tpx - 4, tpy + 47, 14);
    this.eyeR.position.set(tpx + 4, tpy + 47, 14);

    // Torso (neck to hip)
    const _up = new THREE.Vector3(0, 1, 0);
    this._orientCylinder(this.torso, tpx, tpy + 38, tpx, tpy + 4, 5);

    // Arms
    const armAngle = this.swingAngle * 0.5;
    this._orientCylinder(this.armL, tpx, tpy + 34, tpx - 15, tpy + 20, 5);
    this._orientCylinder(this.armR, tpx, tpy + 34, tpx + Math.sin(armAngle + 0.5) * 20, tpy + 50, 5);

    // Legs
    const legSwing = Math.sin(this.swingAngle * 2) * 8;
    this._orientCylinder(this.legL, tpx, tpy + 4, tpx - 8 + legSwing, tpy - 26, 5);
    this._orientCylinder(this.legR, tpx, tpy + 4, tpx + 8 - legSwing, tpy - 26, 5);

    // Blink start text
    const startEl = document.getElementById('title-start');
    if (startEl) {
      startEl.style.opacity = 0.5 + Math.sin(time / 300) * 0.5;
    }

    // Input detection
    this.startDelay -= delta;
    if (this.startDelay <= 0 && !this.started) {
      const config = InputManager.detectAnyPress([]);
      if (config) {
        this.startGame(config);
      }
    }
  }

  _orientCylinder(mesh, x1, y1, x2, y2, z) {
    const mx = (x1 + x2) / 2;
    const my = (y1 + y2) / 2;
    mesh.position.set(mx, my, z);
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.sqrt(dx * dx + dy * dy);
    mesh.scale.y = len;
    if (len > 0.01) {
      const dir = new THREE.Vector3(dx, dy, 0).normalize();
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    }
  }

  destroy() {
    super.destroy();
    if (this.overlay && this.overlay.parentNode) {
      this.overlay.parentNode.removeChild(this.overlay);
    }
    if (this.background) this.background.destroy();
  }
}
