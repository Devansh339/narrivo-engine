/**
 * Narrivo Character Engine v2 — Lighting & Shading Model (shading.js)
 * Direction 3: Hybrid Dimensional Illustration
 *
 * Implements warm key light (45°), cool environmental rim lighting,
 * and ambient occlusion channels. Supports dynamic runtime adjustments.
 */

class LightingController {
  constructor() {
    this.keyLightAngle = Math.PI * 0.25; // 45° from top-left
    this.keyLightIntensity = 1.0;
    this.keyColor = '#FFF1DC';

    this.rimLightIntensity = 0.85;
    this.rimColor = '#A5E3FF'; // Cool cyan environmental rim

    this.aoIntensity = 0.95;
    this.aoColor = '#1C1412'; // Rich deep warm dark

    // Master Palette definition matching approved model sheet
    this.palette = {
      skin: {
        base: '#DF9F7E',
        highlight: '#F7D2BD',
        shadow: '#9E5D42',
        sss: '#C45A3C',
        stubble: 'rgba(50, 35, 30, 0.25)',
        lips: '#B86F62',
        eyes: {
          sclera: '#ECE8E5',
          scleraShadow: '#C4BCB6',
          irisOuter: '#452A18',
          irisInner: '#945C33',
          pupil: '#160E08',
          specular: '#FFFFFF'
        }
      },
      hair: {
        base: '#1C1715',
        shadow: '#0F0C0B',
        highlight: '#48352C',
        rim: '#7EA2B8'
      },
      leather: {
        base: '#523624',
        highlight: '#7C5338',
        shadow: '#311E13',
        crease: '#1C1009',
        sheen: 'rgba(255, 230, 200, 0.12)'
      },
      fleece: {
        base: '#EFE7DA',
        shadow: '#BCAFA0',
        crevice: '#8A7B6B',
        highlight: '#FFFDF9'
      },
      shirt: {
        base: '#7D7974',
        highlight: '#A39F98',
        shadow: '#504C48',
        crease: '#363330'
      },
      pants: {
        base: '#4E5844',
        highlight: '#6C7A60',
        shadow: '#333D2D',
        crease: '#22291E',
        pocketShade: '#2A3324'
      },
      boots: {
        base: '#3A2518',
        highlight: '#5E3E2A',
        shadow: '#22150D',
        crease: '#140C07',
        sole: '#1A1614',
        eyelet: '#B89047',
        laces: '#2B1A10'
      },
      hardware: {
        brass: '#CFA44C',
        brassHighlight: '#F3D27E',
        brassShadow: '#846222',
        webbing: '#2E2D27',
        webbingHighlight: '#48463D'
      },
      ink: '#1D1716' // Tinted line art ink color
    };
  }

  setLightingParameters({ keyAngle, keyIntensity, rimIntensity, rimColor, aoIntensity }) {
    if (keyAngle !== undefined) this.keyLightAngle = keyAngle;
    if (keyIntensity !== undefined) this.keyLightIntensity = keyIntensity;
    if (rimIntensity !== undefined) this.rimLightIntensity = rimIntensity;
    if (rimColor !== undefined) this.rimColor = rimColor;
    if (aoIntensity !== undefined) this.aoIntensity = aoIntensity;
  }

  /**
   * Helper to create a directional linear gradient across a bounding box
   */
  createLinearGradient(ctx, x1, y1, x2, y2, colorStops) {
    const grad = ctx.createLinearGradient(x1, y1, x2, y2);
    for (const [stop, color] of colorStops) {
      grad.addColorStop(stop, color);
    }
    return grad;
  }

  /**
   * Helper to create a radial highlight or ambient shadow
   */
  createRadialGradient(ctx, x1, y1, r1, x2, y2, r2, colorStops) {
    const grad = ctx.createRadialGradient(x1, y1, r1, x2, y2, r2);
    for (const [stop, color] of colorStops) {
      grad.addColorStop(stop, color);
    }
    return grad;
  }

  /**
   * Applies an ambient occlusion crease line with soft blurred drop
   */
  drawCrease(ctx, pathFn, strokeColor = this.palette.ink, lineWidth = 2, alpha = 0.85) {
    ctx.save();
    ctx.globalAlpha *= alpha * this.aoIntensity;
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    pathFn(ctx);
    ctx.stroke();
    ctx.restore();
  }

  /**
   * Applies a directional rim light edge
   */
  drawRimGlint(ctx, pathFn, lineWidth = 2.5, alpha = 0.75) {
    ctx.save();
    ctx.globalAlpha *= alpha * this.rimLightIntensity;
    ctx.strokeStyle = this.rimColor;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.beginPath();
    pathFn(ctx);
    ctx.stroke();
    ctx.restore();
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { LightingController };
}
