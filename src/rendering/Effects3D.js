import * as THREE from 'three';
import { GAME_CONFIG } from '../config.js';
import { TweenManager } from '../core/TweenManager.js';

/**
 * 3D visual effects system - replaces SpecialEffects.js
 * All effects self-clean after their lifetime.
 */

export class Effects3D {
  constructor(scene3D) {
    this.scene3D = scene3D;
    this.activeEffects = [];
  }

  update(delta) {
    for (let i = this.activeEffects.length - 1; i >= 0; i--) {
      const effect = this.activeEffects[i];
      effect.timer += delta;
      if (effect.update) effect.update(delta);
      if (effect.timer >= effect.duration) {
        this.removeEffect(effect);
        this.activeEffects.splice(i, 1);
      }
    }
  }

  removeEffect(effect) {
    if (effect.objects) {
      for (const obj of effect.objects) {
        this.scene3D.remove(obj);
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) obj.material.dispose();
      }
    }
  }

  spawnHitSparks(x, y, color = 0xffff00, count = 8) {
    const positions = new Float32Array(count * 3);
    const sparks = [];
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 100 + Math.random() * 200;
      positions[i * 3] = x;
      positions[i * 3 + 1] = -y;
      positions[i * 3 + 2] = GAME_CONFIG.Z_EFFECTS;
      sparks.push({
        vx: Math.cos(angle) * speed,
        vy: -(Math.sin(angle) * speed - 50),
        idx: i,
      });
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({ color, size: 4, sizeAttenuation: true, transparent: true, opacity: 1 });
    const points = new THREE.Points(geo, mat);
    this.scene3D.add(points);

    this.activeEffects.push({
      timer: 0, duration: 250, objects: [points],
      update: (dt) => {
        const posArr = geo.attributes.position.array;
        for (const s of sparks) {
          posArr[s.idx * 3] += s.vx * dt / 1000;
          posArr[s.idx * 3 + 1] += s.vy * dt / 1000;
        }
        geo.attributes.position.needsUpdate = true;
        mat.opacity = Math.max(0, 1 - points._effectTimer / 250);
        points._effectTimer = (points._effectTimer || 0) + dt;
      },
    });
    points._effectTimer = 0;
  }

  spawnSpeedLines(x, y, dirX, color = 0xffffff, count = 5) {
    const objects = [];
    const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.6 });
    for (let i = 0; i < count; i++) {
      const ly = -y + (-30 + Math.random() * 60);
      const lx = x - dirX * (10 + i * 12);
      const len = 20 + Math.random() * 25;
      const geo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(lx, ly, GAME_CONFIG.Z_EFFECTS),
        new THREE.Vector3(lx - dirX * len, ly, GAME_CONFIG.Z_EFFECTS),
      ]);
      const line = new THREE.Line(geo, mat.clone());
      line.material.opacity = 0.6 - i * 0.08;
      this.scene3D.add(line);
      objects.push(line);
    }
    this.activeEffects.push({
      timer: 0, duration: 200, objects,
      update: (dt) => {
        const t = Math.min(1, objects[0]._timer / 200);
        for (const obj of objects) obj.material.opacity *= (1 - t);
        objects[0]._timer = (objects[0]._timer || 0) + dt;
      },
    });
    objects[0]._timer = 0;
  }

  spawnShockwave(x, y, color = 0xffaa00, maxRadius = 80) {
    const geo = new THREE.RingGeometry(10, 13, 32);
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8, side: THREE.DoubleSide });
    const ring = new THREE.Mesh(geo, mat);
    ring.position.set(x, -y, GAME_CONFIG.Z_EFFECTS + 1);
    this.scene3D.add(ring);

    this.activeEffects.push({
      timer: 0, duration: 400, objects: [ring],
      update: (dt) => {
        const t = ring._timer / 400;
        const r = 10 + (maxRadius - 10) * t;
        ring.scale.setScalar(r / 10);
        mat.opacity = (1 - t) * 0.8;
        ring._timer = (ring._timer || 0) + dt;
      },
    });
    ring._timer = 0;
  }

  spawnWebHitEffect(x, y) {
    const objects = [];
    const mat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 });
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const len = 8 + Math.random() * 12;
      const geo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(x, -y, GAME_CONFIG.Z_EFFECTS),
        new THREE.Vector3(x + Math.cos(angle) * len, -y - Math.sin(angle) * len, GAME_CONFIG.Z_EFFECTS),
      ]);
      const line = new THREE.Line(geo, mat.clone());
      this.scene3D.add(line);
      objects.push(line);
    }
    // Center dot
    const dotGeo = new THREE.SphereGeometry(3, 6, 4);
    const dotMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6 });
    const dot = new THREE.Mesh(dotGeo, dotMat);
    dot.position.set(x, -y, GAME_CONFIG.Z_EFFECTS);
    this.scene3D.add(dot);
    objects.push(dot);

    this.activeEffects.push({
      timer: 0, duration: 600, objects,
      update: (dt) => {
        const t = objects[0]._timer / 600;
        for (const obj of objects) {
          if (obj.material) obj.material.opacity = Math.max(0, 1 - t);
        }
        objects[0]._timer = (objects[0]._timer || 0) + dt;
      },
    });
    objects[0]._timer = 0;
  }

  spawnEnemyDeathEffect(x, y, color) {
    const objects = [];
    const pieces = [];
    for (let i = 0; i < 12; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 150 + Math.random() * 250;
      const size = 2 + Math.random() * 5;
      const geo = new THREE.BoxGeometry(size, size, size);
      const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(x, -y, GAME_CONFIG.Z_EFFECTS);
      this.scene3D.add(mesh);
      objects.push(mesh);
      pieces.push({
        mesh,
        vx: Math.cos(angle) * speed,
        vy: -(Math.sin(angle) * speed - 100),
        rotSpeed: (Math.random() - 0.5) * 10,
      });
    }
    this.activeEffects.push({
      timer: 0, duration: 600, objects,
      update: (dt) => {
        const t = objects[0]._timer / 600;
        for (const p of pieces) {
          p.vy -= 400 * dt / 1000; // gravity (flipped Y)
          p.mesh.position.x += p.vx * dt / 1000;
          p.mesh.position.y += p.vy * dt / 1000;
          p.mesh.rotation.z += p.rotSpeed * dt / 1000;
          p.mesh.material.opacity = Math.max(0, 1 - t);
        }
        objects[0]._timer = (objects[0]._timer || 0) + dt;
      },
    });
    objects[0]._timer = 0;
  }

  spawnComboText(x, y, text, color = 0xffff00) {
    const sprite = this._createTextSprite(text, color, 24);
    sprite.position.set(x, -y, GAME_CONFIG.Z_EFFECTS + 2);
    this.scene3D.add(sprite);

    const startY = -y;
    this.activeEffects.push({
      timer: 0, duration: 800, objects: [sprite],
      update: (dt) => {
        const t = sprite._timer / 800;
        sprite.position.y = startY + t * 40;
        sprite.material.opacity = Math.max(0, 1 - t);
        const sc = 1 + t * 0.3;
        sprite.scale.setScalar(sc);
        sprite._timer = (sprite._timer || 0) + dt;
      },
    });
    sprite._timer = 0;
  }

  spawnStyleBonus(x, y, text) {
    const sprite = this._createTextSprite(text, 0xff6600, 20);
    sprite.position.set(x, -(y - 30), GAME_CONFIG.Z_EFFECTS + 2);
    this.scene3D.add(sprite);

    const startY = -(y - 30);
    this.activeEffects.push({
      timer: 0, duration: 1000, objects: [sprite],
      update: (dt) => {
        const t = sprite._timer / 1000;
        sprite.position.y = startY + t * 40;
        sprite.material.opacity = Math.max(0, 1 - t);
        const sc = 1 + t * 0.5;
        sprite.scale.setScalar(sc);
        sprite._timer = (sprite._timer || 0) + dt;
      },
    });
    sprite._timer = 0;
  }

  spawnDustPuff(x, y, color = 0xaaaaaa) {
    const objects = [];
    for (let i = 0; i < 6; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 5 + Math.random() * 15;
      const size = 3 + Math.random() * 4;
      const geo = new THREE.SphereGeometry(size, 6, 4);
      const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.4 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(x + Math.cos(angle) * dist, -y - Math.sin(angle) * dist, GAME_CONFIG.Z_EFFECTS);
      this.scene3D.add(mesh);
      objects.push(mesh);
    }
    this.activeEffects.push({
      timer: 0, duration: 400, objects,
      update: (dt) => {
        const t = objects[0]._timer / 400;
        for (const obj of objects) obj.material.opacity = Math.max(0, 0.4 * (1 - t));
        objects[0]._timer = (objects[0]._timer || 0) + dt;
      },
    });
    objects[0]._timer = 0;
  }

  spawnLandingDust(x, y) {
    this.spawnDustPuff(x, y, 0x888888);
  }

  spawnDiveKickShockwave(x, y) {
    this.spawnShockwave(x, y, 0xff4400, 100);
    this.spawnDustPuff(x - 20, y, 0x666666);
    this.spawnDustPuff(x + 20, y, 0x666666);
  }

  spawnVenomStrikeEffect(x, y) {
    this.spawnHitSparks(x, y, 0xffee00, 12);
  }

  spawnGrabEffect(x, y) {
    // Tendrils wrapping - simple lines rotating
    const objects = [];
    const mat = new THREE.LineBasicMaterial({ color: 0x444444, transparent: true, opacity: 0.7 });
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const r = 15;
      const geo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(x + Math.cos(angle) * r, -y - Math.sin(angle) * r, GAME_CONFIG.Z_EFFECTS),
        new THREE.Vector3(x + Math.cos(angle + 0.5) * (r + 8), -y - Math.sin(angle + 0.5) * (r + 8), GAME_CONFIG.Z_EFFECTS),
      ]);
      const line = new THREE.Line(geo, mat.clone());
      this.scene3D.add(line);
      objects.push(line);
    }
    this.activeEffects.push({
      timer: 0, duration: 500, objects,
      update: (dt) => {
        const t = objects[0]._timer / 500;
        for (const obj of objects) obj.material.opacity = Math.max(0, 0.7 * (1 - t));
        objects[0]._timer = (objects[0]._timer || 0) + dt;
      },
    });
    objects[0]._timer = 0;
  }

  spawnGroundPoundWave(x, y, range = 120) {
    this.spawnShockwave(x, y, 0x888888, range);
    this.spawnDustPuff(x - 30, y, 0x666666);
    this.spawnDustPuff(x + 30, y, 0x666666);
    this.spawnDustPuff(x, y, 0x888888);
  }

  spawnBossEntryText(name) {
    const sprite = this._createTextSprite(name.toUpperCase(), 0xff3333, 48);
    sprite.material.opacity = 0;
    // Position at screen center - will be updated by camera
    sprite.position.set(0, 0, GAME_CONFIG.Z_EFFECTS + 5);
    sprite._isScreenSpace = true;
    this.scene3D.add(sprite);

    this.activeEffects.push({
      timer: 0, duration: 1800, objects: [sprite],
      update: (dt) => {
        const t = sprite._timer / 1800;
        if (t < 0.17) sprite.material.opacity = t / 0.17;
        else if (t < 0.83) sprite.material.opacity = 1;
        else sprite.material.opacity = Math.max(0, 1 - (t - 0.83) / 0.17);
        sprite._timer = (sprite._timer || 0) + dt;
      },
    });
    sprite._timer = 0;
  }

  // Renders ragdoll pieces for a dead enemy
  renderRagdoll(ragdoll, color) {
    if (!ragdoll || !ragdoll._meshes) {
      // Create meshes on first call
      if (!ragdoll) return;
      ragdoll._meshes = [];
      for (const part of ragdoll) {
        const size = part.size || 5;
        const geo = part.name === 'head'
          ? new THREE.SphereGeometry(size, 8, 6)
          : new THREE.BoxGeometry(part.w || size, part.h || part.len || size, size);
        const mat = new THREE.MeshLambertMaterial({ color });
        const mesh = new THREE.Mesh(geo, mat);
        this.scene3D.add(mesh);
        ragdoll._meshes.push(mesh);
      }
    }
    // Update positions
    for (let i = 0; i < ragdoll.length; i++) {
      const part = ragdoll[i];
      const mesh = ragdoll._meshes[i];
      if (mesh) {
        mesh.position.set(part.x, -part.y, GAME_CONFIG.Z_CHARACTERS);
        mesh.rotation.z = part.rot;
      }
    }
  }

  cleanupRagdoll(ragdoll) {
    if (!ragdoll || !ragdoll._meshes) return;
    for (const mesh of ragdoll._meshes) {
      this.scene3D.remove(mesh);
      if (mesh.geometry) mesh.geometry.dispose();
      if (mesh.material) mesh.material.dispose();
    }
    ragdoll._meshes = null;
  }

  // Web line between player and anchor point
  drawWebLine(fromX, fromY, toX, toY, webLine) {
    if (!webLine) {
      const mat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7 });
      const geo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, 0, 0),
      ]);
      webLine = new THREE.Line(geo, mat);
      this.scene3D.add(webLine);
    }
    const posArr = webLine.geometry.attributes.position.array;
    posArr[0] = fromX; posArr[1] = -fromY; posArr[2] = GAME_CONFIG.Z_EFFECTS;
    posArr[3] = toX; posArr[4] = -toY; posArr[5] = GAME_CONFIG.Z_EFFECTS;
    webLine.geometry.attributes.position.needsUpdate = true;
    webLine.visible = true;
    return webLine;
  }

  hideWebLine(webLine) {
    if (webLine) webLine.visible = false;
  }

  _createTextSprite(text, color, fontSize) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.font = `bold ${fontSize * 2}px monospace`;
    const metrics = ctx.measureText(text);
    canvas.width = Math.ceil(metrics.width) + 20;
    canvas.height = fontSize * 3;

    ctx.font = `bold ${fontSize * 2}px monospace`;
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 6;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.strokeText(text, canvas.width / 2, canvas.height / 2);
    ctx.fillStyle = '#' + color.toString(16).padStart(6, '0');
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);

    const tex = new THREE.CanvasTexture(canvas);
    tex.minFilter = THREE.LinearFilter;
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(canvas.width / 2, canvas.height / 2, 1);
    return sprite;
  }

  destroy() {
    for (const effect of this.activeEffects) {
      this.removeEffect(effect);
    }
    this.activeEffects = [];
  }
}
