import * as THREE from 'three';

export class Scene {
  constructor(key) {
    this.key = key;
    this.scene3D = new THREE.Scene();
    this.active = false;
    this._initData = null;
  }

  init(data) {
    // Override in subclass
  }

  create() {
    // Override in subclass
  }

  update(time, delta) {
    // Override in subclass
  }

  destroy() {
    // Dispose all objects in the scene
    while (this.scene3D.children.length > 0) {
      const obj = this.scene3D.children[0];
      this.scene3D.remove(obj);
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) {
          obj.material.forEach(m => m.dispose());
        } else {
          obj.material.dispose();
        }
      }
    }
  }
}
