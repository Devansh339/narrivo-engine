/**
 * Narrivo Character Engine v2 — Commander Vance Prototype Assembler (vance.js)
 * Direction 3: Hybrid Dimensional Illustration
 *
 * Assembles the full-body modular character using the 7.5-head athletic rig
 * and high-fidelity component renderers. Supports layer toggles and lighting controls.
 */

const { AthleticRigV2, Mat2D } = require('./rig.js');
const { LightingController } = require('./shading.js');
const { HeadRenderer } = require('./parts/head.js');
const { FaceRenderer } = require('./parts/face.js');
const { TorsoRenderer } = require('./parts/torso.js');
const { LimbsRenderer } = require('./parts/limbs.js');
const { HandsRenderer } = require('./parts/hands.js');
const { BootsRenderer } = require('./parts/boots.js');

class CommanderVance {
  constructor(options = {}) {
    this.rig = new AthleticRigV2();
    this.lighting = new LightingController();

    this.head = new HeadRenderer(this.lighting);
    this.face = new FaceRenderer(this.lighting);
    this.torso = new TorsoRenderer(this.lighting);
    this.limbs = new LimbsRenderer(this.lighting);
    this.hands = new HandsRenderer(this.lighting);
    this.boots = new BootsRenderer(this.lighting);

    // Component Visibility Flags for Review & Debugging
    this.visibility = {
      head: true,
      hair: true,
      face: true,
      torso: true,
      fleece: true,
      harness: true,
      arms: true,
      hands: true,
      pants: true,
      boots: true,
      shadow: true,
      rimLight: true
    };

    // State parameters
    this.expression = options.expression || 'neutral';
    this.gazeX = options.gazeX || 0;
    this.gazeY = options.gazeY || 0;

    // Apply default canonical neutral standing pose
    this.rig.applyNeutralStandingPose();
  }

  setVisibility(component, isVisible) {
    if (component in this.visibility) {
      this.visibility[component] = isVisible;
    }
  }

  setLighting(params) {
    this.lighting.setLightingParameters(params);
  }

  setExpression(expr) {
    this.expression = expr;
  }

  setGaze(x, y) {
    this.gazeX = x;
    this.gazeY = y;
  }

  /**
   * Helper to apply a bone's world transform matrix directly to the 2D canvas context
   */
  applyBoneTransform(ctx, boneName) {
    const bone = this.rig.getBone(boneName);
    if (!bone) return;
    const m = bone.worldMatrix;
    ctx.transform(m.a, m.b, m.c, m.d, m.tx, m.ty);
  }

  /**
   * Master render method executing the full Z-order composite
   */
  render(ctx) {
    this.rig.update();

    ctx.save();

    // 0. Ground Contact Drop Shadow
    if (this.visibility.shadow) {
      this.drawDropShadow(ctx);
    }

    // 1. Back Limbs (Far Arm, Far Leg if depth separated)
    // In neutral A-pose, both legs are aligned in lower body layer.
    // Far hair & Back collar go behind torso and head
    if (this.visibility.hair) {
      ctx.save();
      this.applyBoneTransform(ctx, 'head');
      this.head.drawBackHair(ctx);
      ctx.restore();
    }

    if (this.visibility.fleece) {
      ctx.save();
      this.applyBoneTransform(ctx, 'chest');
      this.torso.drawBackCollar(ctx);
      ctx.restore();
    }

    // 2. Lower Body (Legs: Thighs, Shins, Boots)
    if (this.visibility.pants) {
      // Left Leg (viewer right)
      ctx.save();
      this.applyBoneTransform(ctx, 'leftThigh');
      this.limbs.drawThigh(ctx, 1, 192);
      ctx.restore();

      ctx.save();
      this.applyBoneTransform(ctx, 'leftKnee');
      this.limbs.drawShin(ctx, 1, 185);
      ctx.restore();

      // Right Leg (viewer left)
      ctx.save();
      this.applyBoneTransform(ctx, 'rightThigh');
      this.limbs.drawThigh(ctx, -1, 192);
      ctx.restore();

      ctx.save();
      this.applyBoneTransform(ctx, 'rightKnee');
      this.limbs.drawShin(ctx, -1, 185);
      ctx.restore();
    }

    if (this.visibility.boots) {
      // Left Boot (viewer right)
      ctx.save();
      this.applyBoneTransform(ctx, 'leftAnkle');
      this.boots.drawBoot(ctx, 1, 45);
      ctx.restore();

      // Right Boot (viewer left)
      ctx.save();
      this.applyBoneTransform(ctx, 'rightAnkle');
      ctx.scale(-1, 1); // mirror boot silhouette horizontally for right foot
      this.boots.drawBoot(ctx, -1, 45);
      ctx.restore();
    }

    // 3. Torso (Jacket, Henley, Harness)
    if (this.visibility.torso) {
      ctx.save();
      this.applyBoneTransform(ctx, 'chest');
      this.torso.drawTorso(ctx);
      ctx.restore();
    }

    // 4. Arms & Hands
    if (this.visibility.arms) {
      // Left Arm (viewer right)
      ctx.save();
      this.applyBoneTransform(ctx, 'leftShoulder');
      this.limbs.drawUpperArm(ctx, 1, 138);
      ctx.restore();

      ctx.save();
      this.applyBoneTransform(ctx, 'leftElbow');
      this.limbs.drawForearm(ctx, 1, 126);
      ctx.restore();

      // Right Arm (viewer left)
      ctx.save();
      this.applyBoneTransform(ctx, 'rightShoulder');
      this.limbs.drawUpperArm(ctx, -1, 138);
      ctx.restore();

      ctx.save();
      this.applyBoneTransform(ctx, 'rightElbow');
      this.limbs.drawForearm(ctx, -1, 126);
      ctx.restore();
    }

    if (this.visibility.hands) {
      ctx.save();
      this.applyBoneTransform(ctx, 'leftWrist');
      this.hands.drawHand(ctx, 1, 68);
      ctx.restore();

      ctx.save();
      this.applyBoneTransform(ctx, 'rightWrist');
      this.hands.drawHand(ctx, -1, 68);
      ctx.restore();
    }

    // 5. Head Assembly (Neck, Planar Jaw, Ears, Front Fleece Lapels, Face Features, Volumetric Front Hair)
    ctx.save();
    this.applyBoneTransform(ctx, 'head');

    if (this.visibility.head) {
      this.head.drawNeck(ctx);
      this.head.drawHeadBase(ctx);
    }

    if (this.visibility.face) {
      this.face.draw(ctx, this.expression, this.gazeX, this.gazeY);
    }

    if (this.visibility.hair) {
      this.head.drawFrontHair(ctx);
    }

    ctx.restore();

    ctx.restore();
  }

  /**
   * Ground contact drop shadow (soft diffused ellipse under boots)
   */
  drawDropShadow(ctx) {
    const root = this.rig.getBone('root');
    const rx = root ? root.localX : 512;
    const ry = root ? root.localY : 950;

    ctx.save();
    const shadowGrad = ctx.createRadialGradient(rx, ry, 15, rx, ry, 160);
    shadowGrad.addColorStop(0.0, 'rgba(12, 8, 6, 0.75)');
    shadowGrad.addColorStop(0.35, 'rgba(12, 8, 6, 0.45)');
    shadowGrad.addColorStop(0.75, 'rgba(12, 8, 6, 0.15)');
    shadowGrad.addColorStop(1.0, 'transparent');

    ctx.fillStyle = shadowGrad;
    ctx.beginPath();
    ctx.ellipse(rx, ry + 10, 150, 32, 0, 0, Math.PI * 2);
    ctx.fill();

    // Deep contact occlusion spots directly under boot heels & toes
    ctx.fillStyle = 'rgba(8, 4, 3, 0.85)';
    ctx.beginPath();
    ctx.ellipse(rx - 70, ry + 12, 28, 8, -0.05, 0, Math.PI * 2);
    ctx.ellipse(rx + 70, ry + 12, 28, 8, 0.05, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { CommanderVance };
}
