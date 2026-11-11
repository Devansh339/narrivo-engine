/**
 * Narrivo Character Engine v1 — Hierarchical Skeletal Rig (rig.js)
 * Forward Kinematics 2D Skeletal Tree with parent-child matrix transforms.
 *
 * Canvas reference dimensions: 512 x 1024 px.
 * Ground contact plane: Y ≈ 960 px.
 * Centerline: X ≈ 256 px.
 */

// 2D Transformation Matrix Utilities (Row-major 3x3 affine transform: [a, c, tx, b, d, ty, 0, 0, 1])
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
      y: this.b * x + this.d * y + this.ty,
    };
  }

  getRotation() {
    return Math.atan2(this.b, this.a);
  }
}

/**
 * Skeletal Bone node
 */
export class Bone {
  constructor(name, config = {}) {
    this.name = name;
    this.parent = null;
    this.children = [];

    // Local attachment offset relative to parent origin or parent tip
    this.offsetX = config.offsetX || 0;
    this.offsetY = config.offsetY || 0;

    // Bone length along its local +X axis
    this.length = config.length || 0;

    // Default base angle (in radians)
    this.baseAngle = config.baseAngle || 0;

    // Active local rotation added to baseAngle (in radians)
    this.rotation = 0;

    // Active scale
    this.scaleX = 1;
    this.scaleY = 1;

    // World transform matrices
    this.worldMatrix = new Mat2D();
    this.localMatrix = new Mat2D();

    // Cache of solved world positions
    this.worldStart = { x: 0, y: 0 };
    this.worldEnd = { x: 0, y: 0 };
    this.worldAngle = 0;
  }

  addChild(child) {
    child.parent = this;
    this.children.push(child);
    return child;
  }

  setRotation(rad) {
    this.rotation = rad;
  }

  setRotationDeg(deg) {
    this.rotation = (deg * Math.PI) / 180;
  }

  /**
   * Updates local and world transforms recursively.
   */
  update(parentWorldMatrix = null) {
    this.localMatrix.identity();
    this.localMatrix.translate(this.offsetX, this.offsetY);
    this.localMatrix.rotate(this.baseAngle + this.rotation);
    this.localMatrix.scale(this.scaleX, this.scaleY);

    if (parentWorldMatrix) {
      this.worldMatrix.copy(parentWorldMatrix).multiply(this.localMatrix);
    } else {
      this.worldMatrix.copy(this.localMatrix);
    }

    this.worldStart = this.worldMatrix.transformPoint(0, 0);
    this.worldEnd = this.worldMatrix.transformPoint(this.length, 0);
    this.worldAngle = this.worldMatrix.getRotation();

    for (const child of this.children) {
      child.update(this.worldMatrix);
    }
  }
}

/**
 * Complete Hierarchical Rig for Narrivo Characters
 */
export class CharacterRig {
  constructor(proportions = {}) {
    this.proportions = {
      hipsY: 570,            // Ground-relative hip pivot
      torsoLen: 180,         // Length of torso up to clavicle line
      neckLen: 46,           // Length of neck
      headLen: 140,          // Length of head up to crown
      clavicleWidth: 64,     // Half-width from center to shoulder joint
      upperArmLen: 145,      // Shoulder to elbow
      forearmLen: 135,       // Elbow to wrist
      handLen: 50,           // Wrist to fingers
      hipWidth: 36,          // Half-width from center to hip socket
      thighLen: 185,         // Hip socket to knee
      shinLen: 175,          // Knee to ankle
      footLen: 65,           // Ankle to toe
      ...proportions,
    };

    this.bones = new Map();
    this.root = null;
    this._buildSkeleton();
  }

  _buildSkeleton() {
    const P = this.proportions;

    // 1. Root / Pelvis (Center baseline at x=256)
    // Base coordinate system: +X right, +Y down.
    // Angles: 0 = +X (right), PI/2 = +Y (down), -PI/2 = -Y (up), PI = -X (left).
    const root = new Bone('root', { offsetX: 256, offsetY: P.hipsY, length: 0, baseAngle: 0 });
    this.root = root;
    this.bones.set('root', root);

    // Hips bone (controls pelvis tilt & shift)
    const hips = root.addChild(new Bone('hips', { offsetX: 0, offsetY: 0, length: 0, baseAngle: 0 }));
    this.bones.set('hips', hips);

    // Torso (aims upwards, -PI/2)
    const torso = hips.addChild(new Bone('torso', { offsetX: 0, offsetY: 0, length: P.torsoLen, baseAngle: -Math.PI / 2 }));
    this.bones.set('torso', torso);

    // Neck (extends upwards from end of torso: tip of torso is at local (length, 0))
    const neck = torso.addChild(new Bone('neck', { offsetX: P.torsoLen, offsetY: 0, length: P.neckLen, baseAngle: 0 }));
    this.bones.set('neck', neck);

    // Head (extends from end of neck)
    const head = neck.addChild(new Bone('head', { offsetX: P.neckLen, offsetY: 0, length: P.headLen, baseAngle: 0 }));
    this.bones.set('head', head);

    // Left Arm Hierarchy (In character's local torso frame: +X is UP, +Y is character's LEFT)
    const clavicleL = torso.addChild(new Bone('clavicle_l', { offsetX: P.torsoLen - 10, offsetY: P.clavicleWidth, length: 0, baseAngle: 0 }));
    this.bones.set('clavicle_l', clavicleL);

    // Upper Arm Left: hangs DOWN in world space (+PI/2 in world).
    // In Torso space (which is rotated -PI/2 relative to world), DOWN is rotation +PI relative to torso axis (+X up -> +X down is PI)
    const upperArmL = clavicleL.addChild(new Bone('upper_arm_l', { offsetX: 0, offsetY: 0, length: P.upperArmLen, baseAngle: Math.PI }));
    this.bones.set('upper_arm_l', upperArmL);

    const forearmL = upperArmL.addChild(new Bone('forearm_l', { offsetX: P.upperArmLen, offsetY: 0, length: P.forearmLen, baseAngle: 0 }));
    this.bones.set('forearm_l', forearmL);

    const handL = forearmL.addChild(new Bone('hand_l', { offsetX: P.forearmLen, offsetY: 0, length: P.handLen, baseAngle: 0 }));
    this.bones.set('hand_l', handL);

    // Right Arm Hierarchy (In character's local torso frame: -Y is character's RIGHT)
    const clavicleR = torso.addChild(new Bone('clavicle_r', { offsetX: P.torsoLen - 10, offsetY: -P.clavicleWidth, length: 0, baseAngle: 0 }));
    this.bones.set('clavicle_r', clavicleR);

    const upperArmR = clavicleR.addChild(new Bone('upper_arm_r', { offsetX: 0, offsetY: 0, length: P.upperArmLen, baseAngle: Math.PI }));
    this.bones.set('upper_arm_r', upperArmR);

    const forearmR = upperArmR.addChild(new Bone('forearm_r', { offsetX: P.upperArmLen, offsetY: 0, length: P.forearmLen, baseAngle: 0 }));
    this.bones.set('forearm_r', forearmR);

    const handR = forearmR.addChild(new Bone('hand_r', { offsetX: P.forearmLen, offsetY: 0, length: P.handLen, baseAngle: 0 }));
    this.bones.set('hand_r', handR);

    // Left Leg Hierarchy (Character's Left = +X screen right if facing forward)
    // In Hips frame (angle 0 = right, PI/2 = down), Thigh extends down (+PI/2)
    const thighL = hips.addChild(new Bone('thigh_l', { offsetX: P.hipWidth, offsetY: 0, length: P.thighLen, baseAngle: Math.PI / 2 }));
    this.bones.set('thigh_l', thighL);

    const shinL = thighL.addChild(new Bone('shin_l', { offsetX: P.thighLen, offsetY: 0, length: P.shinLen, baseAngle: 0 }));
    this.bones.set('shin_l', shinL);

    // Foot extends forward (90 degrees outward from shin)
    const footL = shinL.addChild(new Bone('foot_l', { offsetX: P.shinLen, offsetY: 0, length: P.footLen, baseAngle: -Math.PI / 2 + 0.3 }));
    this.bones.set('foot_l', footL);

    // Right Leg Hierarchy (Character's Right = -X screen left)
    const thighR = hips.addChild(new Bone('thigh_r', { offsetX: -P.hipWidth, offsetY: 0, length: P.thighLen, baseAngle: Math.PI / 2 }));
    this.bones.set('thigh_r', thighR);

    const shinR = thighR.addChild(new Bone('shin_r', { offsetX: P.thighLen, offsetY: 0, length: P.shinLen, baseAngle: 0 }));
    this.bones.set('shin_r', shinR);

    const footR = shinR.addChild(new Bone('foot_r', { offsetX: P.shinLen, offsetY: 0, length: P.footLen, baseAngle: -Math.PI / 2 - 0.3 }));
    this.bones.set('foot_r', footR);

    // Initialize initial solved world positions
    this.update();
  }

  getBone(name) {
    return this.bones.get(name) || null;
  }

  /**
   * Sets joint angles from a declarative pose specification
   * Angles can be given in degrees or radians.
   */
  setPose(pose = {}) {
    // Root translation / offset
    if (pose.rootOffset) {
      this.root.offsetX = 256 + (pose.rootOffset[0] || 0);
      this.root.offsetY = this.proportions.hipsY + (pose.rootOffset[1] || 0);
    } else {
      this.root.offsetX = 256;
      this.root.offsetY = this.proportions.hipsY;
    }

    const setRot = (boneName, val) => {
      const b = this.getBone(boneName);
      if (!b) return;
      if (typeof val === 'number') {
        b.rotation = val; // assumed radians
      } else if (val && typeof val.deg === 'number') {
        b.setRotationDeg(val.deg);
      } else if (val && typeof val.rad === 'number') {
        b.setRotation(val.rad);
      }
    };

    for (const [key, val] of Object.entries(pose)) {
      if (key === 'rootOffset') continue;
      setRot(key, val);
    }

    this.update();
  }

  /**
   * Resets all joint rotations to neutral zero
   */
  resetPose() {
    for (const bone of this.bones.values()) {
      bone.rotation = 0;
      bone.scaleX = 1;
      bone.scaleY = 1;
    }
    this.root.offsetX = 256;
    this.root.offsetY = this.proportions.hipsY;
    this.update();
  }

  /**
   * Re-solves all Forward Kinematics world matrices
   */
  update() {
    this.root.update(null);
  }

  /**
   * Retrieves world-space joint anchor coordinates
   */
  getJoint(name) {
    const b = this.getBone(name);
    return b ? b.worldStart : { x: 0, y: 0 };
  }

  /**
   * Retrieves world-space tip coordinates of a bone segment
   */
  getTip(name) {
    const b = this.getBone(name);
    return b ? b.worldEnd : { x: 0, y: 0 };
  }

  /**
   * Renders skeletal debug lines (bones and joint circles) for visual inspection
   */
  debugDraw(ctx) {
    ctx.save();
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';

    for (const [name, bone] of this.bones.entries()) {
      if (bone.length > 0) {
        ctx.strokeStyle = name.includes('_l') ? '#3C6FB6' : name.includes('_r') ? '#D8343F' : '#E2B33C';
        ctx.beginPath();
        ctx.moveTo(bone.worldStart.x, bone.worldStart.y);
        ctx.lineTo(bone.worldEnd.x, bone.worldEnd.y);
        ctx.stroke();
      }

      // Joint circle
      ctx.fillStyle = '#1F1C33';
      ctx.beginPath();
      ctx.arc(bone.worldStart.x, bone.worldStart.y, 6, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}
