/**
 * Narrivo Character Engine v1 — Master Assembly & Public API (index.js)
 * High-level NarrivoChar class integrating CharacterRig, Anatomical Illustration,
 * and the Modular Expressions & Viseme Animation System.
 */

import { CharacterRig } from './rig.js';
import { drawArticulatedCharacter, DEFAULT_PALETTE, adjustColor } from './drawing.js';
import {
  EXPRESSIONS,
  VISEMES,
  DEFAULT_FACE_STATE,
  ExpressionController,
  blendFaceStates,
  blendViseme,
} from './expressions.js';

/**
 * Standard Built-in Poses
 */
export const POSES = {
  // Neutral upright standing pose
  stand: {
    hips: { deg: 0 },
    torso: { deg: 0 },
    neck: { deg: 0 },
    head: { deg: 0 },
    upper_arm_l: { deg: 8 },
    forearm_l: { deg: 6 },
    upper_arm_r: { deg: -8 },
    forearm_r: { deg: -6 },
    thigh_l: { deg: 2 },
    shin_l: { deg: 0 },
    foot_l: { deg: 0 },
    thigh_r: { deg: -2 },
    shin_r: { deg: 0 },
    foot_r: { deg: 0 },
    rootOffset: [0, 0],
    handPoseL: 'relax',
    handPoseR: 'relax',
  },

  // Authoritative pointing gesture
  point: {
    hips: { deg: 2 },
    torso: { deg: 4 },
    neck: { deg: -3 },
    head: { deg: -2 },
    upper_arm_l: { deg: 85 },     // Left arm points straight forward
    forearm_l: { deg: 5 },
    upper_arm_r: { deg: -12 },
    forearm_r: { deg: 18 },      // Right arm rests casually at hip
    thigh_l: { deg: 6 },
    shin_l: { deg: 2 },
    foot_l: { deg: 0 },
    thigh_r: { deg: -8 },
    shin_r: { deg: -2 },
    foot_r: { deg: 0 },
    rootOffset: [0, 0],
    handPoseL: 'point',
    handPoseR: 'fist',
  },

  // Seated pose (on chair or bench)
  sit: {
    hips: { deg: 5 },
    torso: { deg: -6 },          // Leans slightly forward to balance center of mass
    neck: { deg: 4 },
    head: { deg: 4 },
    upper_arm_l: { deg: 45 },    // Arms resting forward on thighs
    forearm_l: { deg: 40 },
    upper_arm_r: { deg: 40 },
    forearm_r: { deg: 42 },
    thigh_l: { deg: -78 },       // Thighs extend forward horizontally
    shin_l: { deg: 84 },         // Shins drop vertically down
    foot_l: { deg: 10 },
    thigh_r: { deg: -76 },
    shin_r: { deg: 82 },
    foot_r: { deg: 10 },
    rootOffset: [0, 195],        // Hips drop down to seating plane
    handPoseL: 'relax',
    handPoseR: 'relax',
  },

  // Arms crossed over chest
  armsCrossed: {
    hips: { deg: 0 },
    torso: { deg: 2 },
    neck: { deg: -2 },
    head: { deg: 2 },
    upper_arm_l: { deg: 52 },
    forearm_l: { deg: 94 },      // Forearm folds across chest
    upper_arm_r: { deg: 50 },
    forearm_r: { deg: 96 },
    thigh_l: { deg: 4 },
    shin_l: { deg: 0 },
    foot_l: { deg: 0 },
    thigh_r: { deg: -4 },
    shin_r: { deg: 0 },
    foot_r: { deg: 0 },
    rootOffset: [0, 0],
    handPoseL: 'relax',
    handPoseR: 'relax',
  },

  /**
   * Generates a continuous, natural walking cycle at given phase (radians).
   */
  walk: (phase = 0) => {
    const sin = Math.sin(phase);
    const cos = Math.cos(phase);

    // Leg stride angles (opposite phases for left and right legs)
    const legSwingMax = 28; // degrees
    const thighL = sin * legSwingMax;
    const thighR = -sin * legSwingMax;

    // Knee bend: bend occurs during backward push and forward recovery
    const shinL = Math.max(0, -cos * 34);
    const shinR = Math.max(0, cos * 34);

    // Foot ankle articulation
    const footL = sin * 12;
    const footR = -sin * 12;

    // Arm swing is counter-balanced with opposite legs
    const armSwingMax = 24; // degrees
    const armL = -sin * armSwingMax + 6;
    const armR = sin * armSwingMax - 6;

    // Subtle hip drop/bob (double bounce: 2 cycles per stride)
    const hipBob = Math.abs(sin) * 14 - 6;

    // Torso counter-lean
    const torsoLean = -sin * 2.5;

    return {
      hips: { deg: sin * 3 },
      torso: { deg: torsoLean },
      neck: { deg: -torsoLean * 0.6 },
      head: { deg: -torsoLean * 0.4 },
      upper_arm_l: { deg: armL },
      forearm_l: { deg: Math.max(8, -sin * 18 + 12) },
      upper_arm_r: { deg: armR },
      forearm_r: { deg: Math.max(8, sin * 18 + 12) },
      thigh_l: { deg: thighL },
      shin_l: { deg: shinL },
      foot_l: { deg: footL },
      thigh_r: { deg: thighR },
      shin_r: { deg: shinR },
      foot_r: { deg: footR },
      rootOffset: [0, hipBob],
      handPoseL: 'relax',
      handPoseR: 'relax',
    };
  },
};

/**
 * NarrivoChar master class
 */
export class NarrivoChar {
  constructor(config = {}) {
    this.id = config.id || 'char_' + Math.random().toString(36).substr(2, 6);
    this.palette = { ...DEFAULT_PALETTE, ...(config.palette || {}) };
    this.rig = new CharacterRig(config.proportions || {});

    // World placement (pixels in 2D canvas space)
    this.position = [config.x || 0, config.y || 0];
    this.scale = [config.scaleX || 1, config.scaleY || 1];
    this.rotation = config.rotation || 0;

    // 512 x 1024 native internal offscreen canvas (if in browser DOM)
    this.width = 512;
    this.height = 1024;
    this.canvas = typeof document !== 'undefined' ? document.createElement('canvas') : null;
    this.ctx = this.canvas ? this.canvas.getContext('2d') : null;

    this.currentPose = { ...POSES.stand };
    this.handPoseL = 'relax';
    this.handPoseR = 'relax';

    // Expression & Facial Animation Controller
    this.expressionController = new ExpressionController(config.expression || 'confident');
    this.lastEvaluatedFace = { ...DEFAULT_FACE_STATE };

    this.isDirty = true;
    this.setPose(this.currentPose);
  }

  /**
   * Sets the active facial expression preset immediately
   */
  setExpression(name) {
    this.expressionController.setExpression(name);
    this.isDirty = true;
    return this;
  }

  /**
   * Initiates a smooth, deterministic interpolation to a target expression
   */
  transitionExpression(name, durationSec = 0.4, startTime = 0) {
    this.expressionController.transitionTo(name, durationSec, startTime);
    this.isDirty = true;
    return this;
  }

  /**
   * Sets speech mouth shape (REST, AA, OH, EE, MBP, FV)
   */
  setViseme(name, weight = 1.0) {
    this.expressionController.setViseme(name, weight);
    this.isDirty = true;
    return this;
  }

  /**
   * Sets independent eye gaze direction (dx: -1..1, dy: -1..1)
   */
  setGaze(dx, dy) {
    this.expressionController.setGaze(dx, dy);
    this.isDirty = true;
    return this;
  }

  /**
   * Sets independent head tilt angle override in degrees
   */
  setHeadTilt(deg) {
    this.expressionController.setHeadTilt(deg);
    this.isDirty = true;
    return this;
  }

  /**
   * Updates character pose with smooth joint blending or direct specification
   */
  setPose(poseSpec) {
    if (!poseSpec) return this;
    this.currentPose = { ...this.currentPose, ...poseSpec };
    this.handPoseL = poseSpec.handPoseL || this.handPoseL;
    this.handPoseR = poseSpec.handPoseR || this.handPoseR;

    this.rig.setPose(this.currentPose);
    this.isDirty = true;
    return this;
  }

  /**
   * Sets an individual bone rotation (in degrees or radians)
   */
  setJoint(boneName, val) {
    const b = this.rig.getBone(boneName);
    if (b) {
      if (typeof val === 'number') b.setRotation(val);
      else if (val && typeof val.deg === 'number') b.setRotationDeg(val.deg);
      else if (val && typeof val.rad === 'number') b.setRotation(val.rad);
      this.rig.update();
      this.isDirty = true;
    }
    return this;
  }

  setPosition(x, y) {
    this.position = [x, y];
    return this;
  }

  setScale(sx, sy = sx) {
    this.scale = [sx, sy];
    return this;
  }

  /**
   * Evaluates expressions, head tilt integration, and kinematics at film time t
   */
  update(t = 0) {
    const face = this.expressionController.evaluate(t);
    this.lastEvaluatedFace = face;

    // Apply head tilt from expression to the head bone
    const headBone = this.rig.getBone('head');
    if (headBone && typeof face.headTilt === 'number') {
      const baseHeadDeg = (this.currentPose.head && typeof this.currentPose.head.deg === 'number')
        ? this.currentPose.head.deg
        : 0;
      headBone.setRotationDeg(baseHeadDeg + face.headTilt);
      this.rig.update();
    }

    return face;
  }

  /**
   * Renders the character into its internal 512x1024 canvas texture
   */
  renderInternal(t = 0) {
    const face = this.update(t);

    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.clearRect(0, 0, this.width, this.height);

    drawArticulatedCharacter(this.ctx, this.rig, {
      palette: this.palette,
      pose: this.currentPose,
      face,
      handPoseL: this.handPoseL,
      handPoseR: this.handPoseR,
    });

    this.isDirty = false;
    return this.canvas;
  }

  /**
   * Direct drawing onto any target 2D canvas context with transformation
   */
  draw(targetCtx, x = this.position[0], y = this.position[1], scale = this.scale[0], t = 0) {
    const face = this.update(t);

    targetCtx.save();
    targetCtx.translate(x, y);
    targetCtx.rotate(this.rotation);
    targetCtx.scale(scale * this.scale[0], scale * this.scale[1]);

    // Position origin relative to feet at (256, 960)
    targetCtx.translate(-256, -960);

    drawArticulatedCharacter(targetCtx, this.rig, {
      palette: this.palette,
      pose: this.currentPose,
      face,
      handPoseL: this.handPoseL,
      handPoseR: this.handPoseR,
    });

    targetCtx.restore();
  }
}

export {
  CharacterRig,
  drawArticulatedCharacter,
  DEFAULT_PALETTE,
  adjustColor,
  EXPRESSIONS,
  VISEMES,
  DEFAULT_FACE_STATE,
  ExpressionController,
  blendFaceStates,
  blendViseme,
};
