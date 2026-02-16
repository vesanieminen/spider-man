import * as THREE from 'three';
import { GAME_CONFIG } from '../config.js';

// Shared geometries - created once
let sharedCylinderGeo = null;
let sharedSphereGeo = null;
let sharedSmallSphereGeo = null;

function getSharedGeometries() {
  if (!sharedCylinderGeo) {
    sharedCylinderGeo = new THREE.CylinderGeometry(2, 2, 1, 6);
    sharedSphereGeo = new THREE.SphereGeometry(1, 8, 6);
    sharedSmallSphereGeo = new THREE.SphereGeometry(1, 6, 4);
  }
  return { sharedCylinderGeo, sharedSphereGeo, sharedSmallSphereGeo };
}

const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _mid = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);

// Joint names for limb connections
const LIMB_CONNECTIONS = [
  // [from, to, isArm]
  ['neck', 'hip', false],         // torso
  ['shoulderL', 'shoulderR', false], // shoulders
  ['shoulderL', 'elbowL', true],  // upper arm L
  ['elbowL', 'handL', true],      // lower arm L
  ['shoulderR', 'elbowR', true],  // upper arm R
  ['elbowR', 'handR', true],      // lower arm R
  ['hip', 'kneeL', false],        // upper leg L
  ['kneeL', 'footL', false],      // lower leg L
  ['hip', 'kneeR', false],        // upper leg R
  ['kneeR', 'footR', false],      // lower leg R
];

const JOINT_SPHERES = ['elbowL', 'elbowR', 'kneeL', 'kneeR', 'handL', 'handR', 'footL', 'footR'];

export class CharacterModel3D {
  constructor(bodyColor = 0x3366FF, accentColor = 0xEE2222, scale = 1.0) {
    const { sharedCylinderGeo, sharedSphereGeo, sharedSmallSphereGeo } = getSharedGeometries();

    this.group = new THREE.Group();
    this.scale = scale;
    this.bodyColor = bodyColor;
    this.accentColor = accentColor;

    // Materials
    this.bodyMat = new THREE.MeshLambertMaterial({ color: bodyColor });
    this.accentMat = new THREE.MeshLambertMaterial({ color: accentColor });
    this.whiteMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

    // Head
    this.head = new THREE.Mesh(sharedSphereGeo, this.accentMat);
    this.head.scale.setScalar(GAME_CONFIG.HEAD_RADIUS * scale);
    this.group.add(this.head);

    // Eyes
    this.eyeL = new THREE.Mesh(sharedSmallSphereGeo, this.whiteMat);
    this.eyeL.scale.setScalar(2.5);
    this.eyeR = new THREE.Mesh(sharedSmallSphereGeo, this.whiteMat);
    this.eyeR.scale.setScalar(2.5);
    this.group.add(this.eyeL, this.eyeR);

    // Limb cylinders
    this.limbs = [];
    for (let i = 0; i < LIMB_CONNECTIONS.length; i++) {
      const [from, to, isArm] = LIMB_CONNECTIONS[i];
      const mat = (i === 0 || isArm) ? this.bodyMat : // torso + arms = body color
                  (i === 1) ? this.bodyMat : // shoulders = body color
                  this.accentMat; // legs = accent
      const thickness = (i === 0) ? (GAME_CONFIG.LINE_WIDTH + 1) * scale : GAME_CONFIG.LINE_WIDTH * scale;
      const mesh = new THREE.Mesh(sharedCylinderGeo, mat);
      mesh.scale.set(thickness, 1, thickness);
      this.group.add(mesh);
      this.limbs.push({ mesh, from, to, isArm, zOffset: isArm ? 3 : (i > 5 ? -3 : 0) });
    }

    // Joint spheres
    this.joints = [];
    for (const jointName of JOINT_SPHERES) {
      const isLeg = jointName.includes('knee') || jointName.includes('foot');
      const mat = isLeg ? this.accentMat : this.bodyMat;
      const mesh = new THREE.Mesh(sharedSmallSphereGeo, mat);
      const r = (jointName.includes('hand') || jointName.includes('foot')) ? 3 * scale : 2.5 * scale;
      mesh.scale.setScalar(r);
      this.group.add(mesh);
      this.joints.push({ mesh, name: jointName });
    }

    // Extra meshes for boss details (added externally)
    this.extraMeshes = [];

    this.visible = true;
  }

  setColors(bodyColor, accentColor) {
    this.bodyMat.color.setHex(bodyColor);
    this.accentMat.color.setHex(accentColor);
    this.bodyColor = bodyColor;
    this.accentColor = accentColor;
  }

  setVisible(val) {
    this.visible = val;
    this.group.visible = val;
  }

  setPose(pose, facingRight, drawX, drawY) {
    if (!pose) return;

    const dir = facingRight ? 1 : -1;
    const s = this.scale;

    // Convert Phaser coords to Three.js coords
    // drawY in Phaser = hip-area Y. In Three.js, Y is up.
    // threeX = drawX (world X stays the same)
    // threeY = -(phaserY - HEIGHT/2) but we use raw world coords and flip
    const baseX = drawX;
    const baseY = -drawY; // flip Y

    // Build joint positions in 3D
    const positions = {};
    for (const jointName in pose) {
      const jx = pose[jointName].x * dir * s;
      const jy = -pose[jointName].y * s; // flip Y for 3D
      const isArm = jointName.includes('elbow') || jointName.includes('hand') || jointName.includes('shoulder');
      const isLeg = jointName.includes('knee') || jointName.includes('foot');
      const z = isArm ? 3 : (isLeg ? -3 : 0);
      positions[jointName] = new THREE.Vector3(baseX + jx, baseY + jy, z);
    }

    // Head
    const headPos = positions.head;
    this.head.position.copy(headPos);

    // Eyes
    const eyeY = headPos.y - 1 * s;
    const eyeZ = headPos.z + GAME_CONFIG.HEAD_RADIUS * s * 0.8;
    this.eyeL.position.set(headPos.x - 4 * dir * s, eyeY, eyeZ);
    this.eyeR.position.set(headPos.x + 4 * dir * s, eyeY, eyeZ);

    // Limbs
    for (let i = 0; i < this.limbs.length; i++) {
      const limb = this.limbs[i];
      const p1 = positions[limb.from];
      const p2 = positions[limb.to];
      if (!p1 || !p2) continue;

      _mid.lerpVectors(p1, p2, 0.5);
      limb.mesh.position.copy(_mid);

      _dir.subVectors(p2, p1);
      const length = _dir.length();
      limb.mesh.scale.y = length;
      if (length > 0.01) {
        _dir.normalize();
        limb.mesh.quaternion.setFromUnitVectors(_up, _dir);
      }
    }

    // Joint spheres
    for (const joint of this.joints) {
      const pos = positions[joint.name];
      if (pos) joint.mesh.position.copy(pos);
    }

    // Store positions for external use (boss details, web attachment)
    this._lastPositions = positions;
    this._lastBaseX = baseX;
    this._lastBaseY = baseY;
  }

  addToScene(scene3D) {
    scene3D.add(this.group);
  }

  removeFromScene(scene3D) {
    scene3D.remove(this.group);
  }

  dispose() {
    // Don't dispose shared geometries - just materials
    this.bodyMat.dispose();
    this.accentMat.dispose();
    this.whiteMat.dispose();
    for (const extra of this.extraMeshes) {
      if (extra.geometry) extra.geometry.dispose();
      if (extra.material) extra.material.dispose();
    }
  }
}
