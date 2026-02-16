import * as THREE from 'three';
import { GAME_CONFIG } from '../config.js';

export class Background3D {
  constructor(scene3D) {
    this.scene3D = scene3D;
    this.meshes = [];

    this.createSky();
    this.createStars();
    this.createMoon();
    this.createBuildings();
    this.createGround(GAME_CONFIG.LEVEL_WIDTH);
  }

  createSky() {
    // Very large plane that covers more than the camera can ever see
    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 0, 256);
    gradient.addColorStop(0, '#1a1a4e');
    gradient.addColorStop(0.5, '#141438');
    gradient.addColorStop(1, '#0a0a20');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 2, 256);

    const tex = new THREE.CanvasTexture(canvas);
    // Make sky plane enormous to always fill the view regardless of camera position
    const geo = new THREE.PlaneGeometry(12000, 4000);
    const mat = new THREE.MeshBasicMaterial({ map: tex, side: THREE.FrontSide });
    this.sky = new THREE.Mesh(geo, mat);
    this.sky.position.set(GAME_CONFIG.LEVEL_WIDTH / 2, 0, GAME_CONFIG.Z_SKY);
    this.scene3D.add(this.sky);
    this.meshes.push(this.sky);
  }

  createStars() {
    const count = 300;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = Math.random() * 10000 - 2000;
      positions[i * 3 + 1] = Math.random() * 800 - 100;
      positions[i * 3 + 2] = GAME_CONFIG.Z_STARS + Math.random() * 50;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({ color: 0xffffff, size: 2, sizeAttenuation: true });
    const stars = new THREE.Points(geo, mat);
    this.scene3D.add(stars);
    this.meshes.push(stars);
  }

  createMoon() {
    const geo = new THREE.SphereGeometry(25, 16, 12);
    const mat = new THREE.MeshBasicMaterial({ color: 0xeeeedd });
    const moon = new THREE.Mesh(geo, mat);
    moon.position.set(1200, 280, GAME_CONFIG.Z_MOON);
    this.scene3D.add(moon);
    this.meshes.push(moon);

    // Crescent shadow
    const shadowGeo = new THREE.SphereGeometry(22, 16, 12);
    const shadowMat = new THREE.MeshBasicMaterial({ color: 0x0a0a1e });
    const shadow = new THREE.Mesh(shadowGeo, shadowMat);
    shadow.position.set(1210, 285, GAME_CONFIG.Z_MOON + 5);
    this.scene3D.add(shadow);
    this.meshes.push(shadow);
  }

  createBuildings() {
    const layers = [
      { z: GAME_CONFIG.Z_BUILDING_FAR, color: 0x1a1a38, minH: 100, maxH: 250, minW: 60, maxW: 120 },
      { z: GAME_CONFIG.Z_BUILDING_MID, color: 0x222248, minH: 80, maxH: 180, minW: 50, maxW: 100 },
      { z: GAME_CONFIG.Z_BUILDING_NEAR, color: 0x2a2a55, minH: 60, maxH: 140, minW: 40, maxW: 80 },
    ];

    const groundY = -GAME_CONFIG.GROUND_Y;

    for (const layer of layers) {
      let x = -500;
      const totalWidth = GAME_CONFIG.LEVEL_WIDTH + 2000;

      while (x < totalWidth) {
        const w = layer.minW + Math.random() * (layer.maxW - layer.minW);
        const h = layer.minH + Math.random() * (layer.maxH - layer.minH);

        const geo = new THREE.BoxGeometry(w, h, 40);
        const mat = new THREE.MeshLambertMaterial({ color: layer.color });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(x + w / 2, groundY + h / 2, layer.z);
        this.scene3D.add(mesh);
        this.meshes.push(mesh);

        this.addWindows(x, w, h, groundY, layer.z);

        if (Math.random() < 0.15) {
          this.addNeonSign(x + w / 2, groundY + h - 20, layer.z + 21);
        }

        x += w + 2 + Math.random() * 20;
      }
    }
  }

  addWindows(bx, bw, bh, groundY, z) {
    const cols = Math.floor(bw / 16);
    const rows = Math.floor(bh / 20);
    if (cols <= 0 || rows <= 0) return;

    const windowGeo = new THREE.PlaneGeometry(8, 10);

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (Math.random() > 0.4) continue;
        const lit = Math.random() < 0.4;
        const color = lit ? (Math.random() < 0.5 ? 0xffdd88 : 0x88ccff) : 0x333355;
        const alpha = lit ? 0.9 : 0.4;
        const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: alpha });
        const mesh = new THREE.Mesh(windowGeo, mat);
        const wx = bx + (bw - cols * 16) / 2 + 4 + c * 16 + 4;
        const wy = groundY + bh - 15 - r * 20;
        mesh.position.set(wx, wy, z + 21);
        this.scene3D.add(mesh);
        this.meshes.push(mesh);
      }
    }
  }

  addNeonSign(x, y, z) {
    const colors = [0xff0066, 0x00ffaa, 0xff6600, 0x6666ff, 0xffff00];
    const color = colors[Math.floor(Math.random() * colors.length)];
    const geo = new THREE.SphereGeometry(4, 8, 6);
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    this.scene3D.add(mesh);
    this.meshes.push(mesh);

    const light = new THREE.PointLight(color, 0.5, 80);
    light.position.set(x, y, z + 10);
    this.scene3D.add(light);
  }

  createGround(width) {
    this.groundWidth = width;
    const groundY = -GAME_CONFIG.GROUND_Y;
    // Extend ground well beyond level boundaries so edges are never visible
    const extraWidth = width + 2000;
    const groundDepth = GAME_CONFIG.HEIGHT;

    // Main ground plane
    const geo = new THREE.PlaneGeometry(extraWidth, groundDepth);
    const mat = new THREE.MeshLambertMaterial({ color: 0x2a2a44 });
    this.groundMesh = new THREE.Mesh(geo, mat);
    this.groundMesh.position.set(extraWidth / 2 - 500, groundY - groundDepth / 2, GAME_CONFIG.Z_GROUND);
    this.scene3D.add(this.groundMesh);
    this.meshes.push(this.groundMesh);

    // Road line at top of ground
    const lineGeo = new THREE.PlaneGeometry(extraWidth, 3);
    const lineMat = new THREE.MeshBasicMaterial({ color: 0x444466 });
    this.roadLine = new THREE.Mesh(lineGeo, lineMat);
    this.roadLine.position.set(extraWidth / 2 - 500, groundY - 1.5, GAME_CONFIG.Z_GROUND + 1);
    this.scene3D.add(this.roadLine);
    this.meshes.push(this.roadLine);
  }

  expandGround(newWidth) {
    if (newWidth <= this.groundWidth) return;
    if (this.groundMesh) {
      this.scene3D.remove(this.groundMesh);
      this.groundMesh.geometry.dispose();
    }
    if (this.roadLine) {
      this.scene3D.remove(this.roadLine);
      this.roadLine.geometry.dispose();
    }
    this.createGround(newWidth);
  }

  destroy() {
    for (const mesh of this.meshes) {
      this.scene3D.remove(mesh);
      if (mesh.geometry) mesh.geometry.dispose();
      if (mesh.material) mesh.material.dispose();
    }
    this.meshes = [];
  }
}
