import * as THREE from 'three';
import { GAME_CONFIG } from '../config.js';
import { TweenManager } from './TweenManager.js';

export class Game {
  constructor(container, scenes) {
    this.container = container;
    this.width = GAME_CONFIG.WIDTH;
    this.height = GAME_CONFIG.HEIGHT;

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(this.width, this.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x0a0a1e);
    container.insertBefore(this.renderer.domElement, container.firstChild);

    // Camera
    this.camera = new THREE.PerspectiveCamera(45, this.width / this.height, 1, 2000);
    this.camera.position.set(this.width / 2, -this.height / 2 + this.height / 2, 800);
    this.camera.lookAt(this.width / 2, -this.height / 2 + this.height / 2, 0);

    // Scenes
    this.scenes = {};
    this.activeScene = null;
    for (const SceneClass of scenes) {
      const instance = new SceneClass();
      this.scenes[instance.key] = instance;
      instance.game = this;
    }

    // Clock
    this.clock = new THREE.Clock();
    this.lastTime = 0;

    // Start loop
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  startScene(key, data) {
    if (this.activeScene) {
      this.activeScene.active = false;
      this.activeScene.destroy();
    }

    const scene = this.scenes[key];
    scene.active = true;
    scene._initData = data;
    // Recreate the 3D scene to clear old objects
    scene.scene3D = new THREE.Scene();
    scene.init(data || {});
    scene.create();
    this.activeScene = scene;
  }

  animate(timestamp) {
    requestAnimationFrame(this.animate);

    const delta = Math.min(this.clock.getDelta() * 1000, 50); // ms, capped at 50ms

    TweenManager.update(timestamp);

    if (this.activeScene) {
      this.activeScene.update(timestamp, delta);
      this.renderer.render(this.activeScene.scene3D, this.camera);
    }
  }
}
