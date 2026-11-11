/**
 * Narrivo Character Engine v2 — 7.5-Head Athletic Skeletal Rig (rig.js)
 * Forward Kinematics 2D Skeletal Hierarchy for Commander Vance.
 *
 * Canvas Coordinate Reference: 1024 x 1024
 * Ground plane: Y = 950
 * Total Height ≈ 802 px (~7.56 heads where 1 head ≈ 106 px)
 * Unified Coordinate Convention: +Y is DOWN (matches standard Canvas2D)
 */

class Mat2D {
  constructor() {
    this.a = 1; this.c = 0; this.tx = 0;
    this.b = 0; this.d = 1; this.ty = 0;
  }

  identity() {
    this.a = 1; this.c = 0; this.tx = 0;
    this.b = 0; this.d = 1; this.ty = 0;
    return this;
  }

  set(a, b, c, d, tx, ty) {
    this.a = a; this.b = b; this.c = c; this.d = d; this.tx = tx; this.ty = ty;
    return this;
  }

  copy(m) {
    this.a = m.a; this.b = m.b; this.c = m.c; this.d = m.d; this.tx = m.tx; this.ty = m.ty;
    return this;
  }

  multiply(m) {
    const a = this.a * m.a + this.c * m.b;
    const b = this.b * m.a + this.d * m.b;
    const c = this.a * m.c + this.c * m.d;
    const d = this.b * m.c + this.d * m.d;
    const tx = this.a * m.tx + this.c * m.ty + this.tx;
    const ty = this.b * m.tx + this.d * m.ty + this.ty;
    this.a = a; this.b = b; this.c = c; this.d = d; this.tx = tx; this.ty = ty;
    return this;
  }

  translate(x, y) {
    this.tx += this.a * x + this.c * y;
    this.ty += this.b * x + this.d * y;
    return this;
  }

  rotate(radians) {
    const cos = Math.cos(radians);
    const sin = Math.sin(radians);
    const a = this.a * cos + this.c * sin;
    const b = this.b * cos + this.d * sin;
    const c = this.a * -sin + this.c * cos;
    const d = this.b * -sin + this.d * cos;
    this.a = a; this.b = b; this.c = c; this.d = d;
    return this;
  }

  scale(sx, sy) {
    this.a *= sx; this.b *= sx;
    this.c *= sy; this.d *= sy;
    return this;
  }

  transformPoint(x, y) {
    return {
      x: this.a * x + this.c * y + this.tx,
      y: this.b * x + this.d * y + this.ty
    };
  }
}

class Bone {
  constructor(name, parent = null, length = 100, localX = 0, localY = 0, localRotation = 0) {
    this.name = name;
    this.parent = parent;
    this.length = length;
    this.localX = localX;
    this.localY = localY;
    this.localRotation = localRotation; // in radians
    this.localScaleX = 1;
    this.localScaleY = 1;

    this.localMatrix = new Mat2D();
    this.worldMatrix = new Mat2D();
    this.children = [];

    if (parent) {
      parent.children.push(this);
    }
  }

  updateTransforms() {
    this.localMatrix.identity();
    this.localMatrix.translate(this.localX, this.localY);
    if (this.localRotation !== 0) {
      this.localMatrix.rotate(this.localRotation);
    }
    if (this.localScaleX !== 1 || this.localScaleY !== 1) {
      this.localMatrix.scale(this.localScaleX, this.localScaleY);
    }

    if (this.parent) {
      this.worldMatrix.copy(this.parent.worldMatrix).multiply(this.localMatrix);
    } else {
      this.worldMatrix.copy(this.localMatrix);
    }

    for (const child of this.children) {
      child.updateTransforms();
    }
  }

  getWorldOrigin() {
    return this.worldMatrix.transformPoint(0, 0);
  }

  getWorldTip() {
    return this.worldMatrix.transformPoint(0, this.length);
  }
}

class AthleticRigV2 {
  constructor() {
    this.bones = new Map();
    this.rootX = 512;
    this.rootY = 950;
    this.buildHierarchy();
    this.applyNeutralStandingPose();
  }

  buildHierarchy() {
    // Root at ground plane (512, 950)
    const root = new Bone('root', null, 0, this.rootX, this.rootY, 0);
    this.bones.set('root', root);

    // Hips / Pelvis sits at (512, 530)
    const hips = new Bone('hips', root, 60, 0, -420, 0);
    this.bones.set('hips', hips);

    // Chest / Upper Torso: child of hips, at (512, 350) -> localY = -180
    const chest = new Bone('chest', hips, 140, 0, -180, 0);
    this.bones.set('chest', chest);

    // Neck: child of chest, at (512, 315) -> localY = -35
    const neck = new Bone('neck', chest, 35, 0, -35, 0);
    this.bones.set('neck', neck);

    // Head: child of neck, at (512, 280) -> localY = -35
    const head = new Bone('head', neck, 114, 0, -35, 0);
    this.bones.set('head', head);

    // Clavicles & Arms (+Y is DOWN)
    // Left Shoulder attaches seamlessly to chest scye at (60, 15)
    const lClavicle = new Bone('leftClavicle', chest, 35, 30, 10, 0.08);
    this.bones.set('leftClavicle', lClavicle);

    const lShoulder = new Bone('leftShoulder', chest, 140, 60, 15, 0.10);
    this.bones.set('leftShoulder', lShoulder);

    const lElbow = new Bone('leftElbow', lShoulder, 130, 0, 140, 0.04);
    this.bones.set('leftElbow', lElbow);

    const lWrist = new Bone('leftWrist', lElbow, 68, 0, 130, -0.02);
    this.bones.set('leftWrist', lWrist);

    // Right Shoulder attaches to right chest scye at (-60, 15)
    const rClavicle = new Bone('rightClavicle', chest, 35, -30, 10, -0.08);
    this.bones.set('rightClavicle', rClavicle);

    const rShoulder = new Bone('rightShoulder', chest, 140, -60, 15, -0.10);
    this.bones.set('rightShoulder', rShoulder);

    const rElbow = new Bone('rightElbow', rShoulder, 130, 0, 140, -0.04);
    this.bones.set('rightElbow', rElbow);

    const rWrist = new Bone('rightWrist', rElbow, 68, 0, 130, 0.02);
    this.bones.set('rightWrist', rWrist);

    // Legs (+Y is DOWN)
    // Left Leg (viewer right)
    const lHip = new Bone('leftHip', hips, 20, 28, 12, 0);
    this.bones.set('leftHip', lHip);

    const lThigh = new Bone('leftThigh', lHip, 195, 0, 10, 0.04);
    this.bones.set('leftThigh', lThigh);

    const lKnee = new Bone('leftKnee', lThigh, 180, 0, 195, -0.02);
    this.bones.set('leftKnee', lKnee);

    const lAnkle = new Bone('leftAnkle', lKnee, 45, 0, 180, -0.02);
    this.bones.set('leftAnkle', lAnkle);

    // Right Leg (viewer left)
    const rHip = new Bone('rightHip', hips, 20, -28, 12, 0);
    this.bones.set('rightHip', rHip);

    const rThigh = new Bone('rightThigh', rHip, 195, 0, 10, -0.04);
    this.bones.set('rightThigh', rThigh);

    const rKnee = new Bone('rightKnee', rThigh, 180, 0, 195, 0.02);
    this.bones.set('rightKnee', rKnee);

    const rAnkle = new Bone('rightAnkle', rKnee, 45, 0, 180, 0.02);
    this.bones.set('rightAnkle', rAnkle);
  }

  getBone(name) {
    return this.bones.get(name) || null;
  }

  setBoneRotation(name, radians) {
    const bone = this.bones.get(name);
    if (bone) {
      bone.localRotation = radians;
    }
  }

  update() {
    const root = this.bones.get('root');
    if (root) {
      root.localX = this.rootX;
      root.localY = this.rootY;
      root.updateTransforms();
    }
  }

  applyNeutralStandingPose() {
    this.setBoneRotation('hips', 0);
    this.setBoneRotation('chest', 0);
    this.setBoneRotation('neck', 0);
    this.setBoneRotation('head', 0);

    // Natural arm posture with slight clearance at waist
    this.setBoneRotation('leftShoulder', 0.10);
    this.setBoneRotation('leftElbow', 0.04);
    this.setBoneRotation('leftWrist', -0.02);

    this.setBoneRotation('rightShoulder', -0.10);
    this.setBoneRotation('rightElbow', -0.04);
    this.setBoneRotation('rightWrist', 0.02);

    // Sturdy grounded stance
    this.setBoneRotation('leftThigh', 0.04);
    this.setBoneRotation('leftKnee', -0.02);
    this.setBoneRotation('leftAnkle', -0.02);

    this.setBoneRotation('rightThigh', -0.04);
    this.setBoneRotation('rightKnee', 0.02);
    this.setBoneRotation('rightAnkle', 0.02);

    this.update();
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { AthleticRigV2, Bone, Mat2D };
}
