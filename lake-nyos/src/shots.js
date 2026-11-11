// THE LAKE THAT STOLE THE AIR — LAKE NYOS, CAMEROON (1986)
// Visual Style: Paper Atlas (vintage illustrated atlas, layered paper-cutout landscapes, topographic maps,
// geological cross-sections, animated cartographic routes, archival headlines/labels, scientific diagrams).
import { ctx, W, H, TAU, clamp, lerp, seg, eo, eio, eob, rnd, rr, circle, ell, line } from './core/lib.js';
import { L, Wd, T } from './core/timing.js';
import * as K from './core/kit.js';
const { P, cut, P_rr, P_poly, P_circ } = K;

// ── Story Palette: aged parchment, deep blue lake water, muted earth tones, restrained atmospheric grey ──
const PAL = {
  parchLight: '#F3E9D2',
  parchMid: '#E9DCBC',
  parchDark: '#D6C39B',
  lakeSurface: '#3B6E8C',
  lakeMid: '#244D6E',
  lakeDeep: '#16324A',
  lakeAbyss: '#0E2235',
  earthLight: '#B59672',
  earthMid: '#8F6F4E',
  earthDark: '#6B4F35',
  earthBedrock: '#4E3824',
  ridgeFar: '#9C8B74',
  ridgeMid: '#7E8B5A',
  ridgeNear: '#586949',
  greyMist: '#B8BFC4',
  greyCloud: '#959FA6',
  greyDense: '#768087',
  twilightWash: '#243447',
  ink: '#3E2C1E',
  crimson: '#A8322D',
  gold: '#C8952F',
  edge: '#F7EFDC',
};

const SERIF = 'Caladea';

// ── Shared Atlas Framing & Backgrounds ──
function atlasFrame(titleText, plateNo = 'PLATE I') {
  ctx.save();
  ctx.strokeStyle = 'rgba(62,44,30,0.45)';
  ctx.lineWidth = 4;
  ctx.strokeRect(44, 64, W - 88, 1380);
  ctx.lineWidth = 2;
  ctx.strokeRect(56, 76, W - 112, 1356);
  for (const [cx, cy] of [[56, 76], [W - 56, 76], [56, 1432], [W - 56, 1432]]) {
    circle(cx, cy, 6, PAL.ink);
  }
  if (plateNo) {
    ctx.font = `700 26px ${SERIF}`;
    ctx.fillStyle = 'rgba(62,44,30,0.72)';
    ctx.textAlign = 'left';
    ctx.fillText(plateNo, 76, 110);
  }
  if (titleText) {
    ctx.font = `700 26px ${SERIF}`;
    ctx.fillStyle = 'rgba(62,44,30,0.72)';
    ctx.textAlign = 'right';
    ctx.fillText(titleText, W - 76, 110);
  }
  ctx.restore();
}

function twilightParchment(seed = 1, alpha = 0.55) {
  K.parchment(seed);
  ctx.save();
  ctx.globalAlpha = alpha;
  const g = ctx.createLinearGradient(0, 0, 0, 1450);
  g.addColorStop(0, '#1D2C3D');
  g.addColorStop(0.65, '#2E4358');
  g.addColorStop(1, '#4A4035');
  ctx.fillStyle = g;
  ctx.fillRect(-300, -300, W + 600, H + 600);
  ctx.restore();
  for (let i = 0; i < 22; i++) {
    const sx = 90 + rnd(i * 3 + seed) * 900;
    const sy = 90 + rnd(i * 7 + seed) * 420;
    circle(sx, sy, 2 + rnd(i) * 2.2, 'rgba(247,239,220,0.65)');
  }
}

function cartoGrid(x0 = 56, y0 = 76, w = W - 112, h = 1356, step = 120) {
  ctx.save();
  ctx.strokeStyle = 'rgba(62,44,30,0.14)';
  ctx.lineWidth = 2;
  for (let x = x0 + step; x < x0 + w; x += step) {
    ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x, y0 + h); ctx.stroke();
  }
  for (let y = y0 + step; y < y0 + h; y += step) {
    ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x0 + w, y); ctx.stroke();
  }
  ctx.restore();
}

// ── Layered Paper-Cutout Landscape & Crater Lake with Parallax ──
function craterLandscape(panX = 0, waterColor = PAL.lakeMid, mistLevel = 0, t = 0) {
  const p1 = panX * 0.25;
  cut(P_poly([
    [-300, 1100], [-100 + p1, 670], [180 + p1, 560], [420 + p1, 650],
    [690 + p1, 520], [950 + p1, 610], [1380, 720], [1380, 1150]
  ]), PAL.ridgeFar, { shadow: 0.6, edge: 5 });

  const p2 = panX * 0.55;
  cut(P_poly([
    [-300, 1180], [-60 + p2, 760], [210 + p2, 680], [480 + p2, 790],
    [640 + p2, 780], [880 + p2, 660], [1160 + p2, 750], [1380, 1180]
  ]), PAL.ridgeMid, { shadow: 0.7, edge: 5 });

  const p3 = panX * 0.85;
  cut(P_poly([
    [130 + p3, 910], [950 + p3, 910], [980 + p3, 1250], [100 + p3, 1250]
  ]), waterColor, { shadow: 0.8, edge: 5 });

  cut(P_poly([
    [220 + p3, 960], [860 + p3, 960], [820 + p3, 1160], [260 + p3, 1160]
  ]), PAL.lakeDeep, { shadow: 0.4, edge: 3 });

  ctx.save();
  ctx.strokeStyle = 'rgba(247,239,220,0.45)';
  ctx.lineWidth = 3;
  for (let r = 0; r < 3; r++) {
    const wy = 985 + r * 52;
    const waveShift = Math.sin(t * 2 + r) * 14;
    ctx.beginPath();
    ctx.moveTo(280 + p3 + waveShift, wy);
    ctx.quadraticCurveTo(540 + p3, wy - 10, 800 + p3 + waveShift, wy);
    ctx.stroke();
  }
  ctx.restore();

  cut(P_poly([
    [-300, 1340], [-300, 820], [110 + p3, 830], [250 + p3, 1080], [320 + p3, 1280]
  ]), PAL.earthMid, { shadow: 0.85, edge: 5 });
  cut(P_poly([
    [1380, 1340], [1380, 810], [970 + p3, 820], [830 + p3, 1080], [760 + p3, 1280]
  ]), PAL.earthMid, { shadow: 0.85, edge: 5 });

  const p4 = panX * 1.15;
  cut(P_poly([
    [-300, 1500], [-300, 1230], [260 + p4, 1190], [540 + p4, 1245],
    [840 + p4, 1185], [1380, 1230], [1380, 1500]
  ]), PAL.earthDark, { shadow: 0.9, edge: 6 });

  if (mistLevel > 0) {
    ctx.save();
    ctx.globalAlpha = clamp(mistLevel, 0, 0.92);
    const mShift = Math.sin(t * 1.4) * 18;
    cut(P_poly([
      [140 + p3 - 60 * mistLevel + mShift, 920 - 30 * mistLevel],
      [940 + p3 + 60 * mistLevel + mShift, 920 - 30 * mistLevel],
      [1040 + p3 + 120 * mistLevel, 1220 + 60 * mistLevel],
      [40 + p3 - 120 * mistLevel, 1220 + 60 * mistLevel]
    ]), PAL.greyMist, { shadow: 0.6, edge: 4 });
    ctx.restore();
  }

  cut(P_rr(-300, 1432, W + 600, 600, 0), PAL.parchDark, { shadow: 0, edge: 0 });
}

// ── Archival Newspaper / Survey Clipping Header ──
function newspaperClipping(headline, subhead, x, y, sc = 1, rot = -0.015) {
  if (sc <= 0) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.scale(sc, sc);
  const w = 860, h = 230;
  cut(P_rr(-w / 2, -h / 2, w, h, 6), PAL.parchLight, { shadow: 0.9, edge: 4 });
  ctx.strokeStyle = PAL.ink;
  ctx.lineWidth = 4;
  ctx.strokeRect(-w / 2 + 18, -h / 2 + 18, w - 36, h - 36);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-w / 2 + 34, -h / 2 + 66);
  ctx.lineTo(w / 2 - 34, -h / 2 + 66);
  ctx.stroke();

  ctx.font = `700 24px ${SERIF}`;
  ctx.fillStyle = PAL.crimson;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('ARCHIVAL DISPATCH · WEST AFRICA · AUGUST 1986', 0, -h / 2 + 44);

  ctx.font = `700 46px ${SERIF}`;
  ctx.fillStyle = PAL.ink;
  ctx.fillText(headline, 0, 8);

  if (subhead) {
    ctx.font = `700 28px ${SERIF}`;
    ctx.fillStyle = PAL.earthDark;
    ctx.fillText(subhead, 0, 64);
  }
  circle(-w / 2 + 36, -h / 2 + 36, 9, PAL.crimson);
  circle(w / 2 - 36, -h / 2 + 36, 9, PAL.crimson);
  ctx.restore();
}

// ── Paper-Cutout Mist Plume / Gas Cloud ──
function gasPlume(x, y, w, h, alpha = 0.85, fill = PAL.greyMist) {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = clamp(alpha, 0, 1);
  ctx.translate(x, y);
  cut(() => {
    ctx.beginPath();
    ctx.moveTo(-w * 0.48, h * 0.35);
    ctx.bezierCurveTo(-w * 0.62, -h * 0.1, -w * 0.35, -h * 0.55, -w * 0.08, -h * 0.48);
    ctx.bezierCurveTo(w * 0.05, -h * 0.68, w * 0.38, -h * 0.55, w * 0.46, -h * 0.18);
    ctx.bezierCurveTo(w * 0.62, h * 0.08, w * 0.52, h * 0.38, w * 0.32, h * 0.38);
    ctx.closePath();
  }, fill, { shadow: 0.5, edge: 4 });
  ctx.restore();
}

// ── Small Paper-Cutout Village Roofs (No stick figures or low-poly characters) ──
function villageCluster(cx, cy, s = 1) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(s, s);
  for (const [dx, dy, bw, bh] of [[-95, 10, 74, 52], [0, 0, 86, 60], [95, 14, 70, 48]]) {
    cut(P_rr(dx - bw / 2, dy - bh, bw, bh, 3), PAL.earthLight, { shadow: 0.5, edge: 3 });
    cut(P_poly([[dx - bw / 2 - 10, dy - bh + 2], [dx, dy - bh - 34], [dx + bw / 2 + 10, dy - bh + 2]]), PAL.earthDark, { shadow: 0.5, edge: 3 });
  }
  ctx.restore();
}

// ── Geological Cross-Section of Lake Nyos Maar Crater ──
function geologicalCrossSection(bubbleProg = 0, showCap = false, overturnProg = 0, t = 0) {
  const strata = [
    [1160, 1432, PAL.earthBedrock, 'GRANITIC BASEMENT ROCK'],
    [960, 1160, PAL.earthDark, 'DEEP FRACTURED STRATA'],
    [760, 960, PAL.earthMid, 'VOLCANIC MAAR RIM'],
  ];
  for (const [y0, y1, col] of strata) {
    cut(P_rr(56, y0, W - 112, y1 - y0, 0), col, { shadow: 0.5, edge: 4 });
  }

  // Deep volcanic conduit / fault pipe beneath crater
  cut(P_poly([
    [475, 1140], [605, 1140], [645, 1432], [435, 1432]
  ]), '#3A2618', { shadow: 0.4, edge: 3 });

  // Stratified Crater Lake Basin (3 distinct blue paper layers)
  // 1. Deep cold CO2-saturated bottom water (960..1150)
  cut(P_poly([
    [330, 960], [750, 960], [630, 1150], [450, 1150]
  ]), PAL.lakeAbyss, { shadow: 0.6, edge: 4 });

  // 2. Mid water layer (830..960)
  cut(P_poly([
    [250, 830], [830, 830], [750, 960], [330, 960]
  ]), PAL.lakeDeep, { shadow: 0.5, edge: 4 });

  // 3. Warm upper surface layer (720..830)
  cut(P_poly([
    [180, 720], [900, 720], [830, 830], [250, 830]
  ]), PAL.lakeSurface, { shadow: 0.5, edge: 4 });

  // Left and right crater rim shoulders above y=720
  cut(P_poly([
    [56, 760], [56, 640], [140, 620], [210, 720], [180, 760]
  ]), PAL.ridgeNear, { shadow: 0.6, edge: 4 });
  cut(P_poly([
    [W - 56, 760], [W - 56, 630], [940, 615], [870, 720], [900, 760]
  ]), PAL.ridgeNear, { shadow: 0.6, edge: 4 });

  // Rising CO2 bubbles seeping from conduit into deep layer (kept strictly inside central column x=470..610, y=975..1270)
  if (bubbleProg > 0) {
    const nBub = 20;
    for (let i = 0; i < nBub; i++) {
      const cycle = (t * 0.55 + i / nBub) % 1;
      const by = lerp(1265, 975, cycle);
      const bx = 540 + Math.sin(i * 4.1 + cycle * 6) * 58;
      const r = 7 + (i % 3) * 3;
      if (by > 968) {
        circle(bx, by, r, i % 3 === 0 ? PAL.crimson : PAL.greyMist);
        ctx.strokeStyle = PAL.edge;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }
  }

  // Clean Depth Scale Callout Tags on the right earth wall (outside the bubble zone)
  for (const [txt, yTag] of [['0m SURFACE', 775], ['100m MID', 895], ['208m BOTTOM', 1055]]) {
    ctx.save();
    cut(P_rr(790, yTag - 22, 205, 44, 4), PAL.parchLight, { shadow: 0.4, edge: 2 });
    ctx.font = `700 22px ${SERIF}`;
    ctx.fillStyle = PAL.ink;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(txt, 892, yTag + 1);
    ctx.restore();
  }

  if (showCap) {
    ctx.save();
    ctx.strokeStyle = PAL.gold;
    ctx.lineWidth = 8;
    ctx.setLineDash([18, 12]);
    ctx.beginPath();
    ctx.moveTo(315, 955);
    ctx.lineTo(765, 955);
    ctx.stroke();
    ctx.setLineDash([]);
    for (const ax of [390, 540, 690]) {
      line([[ax, 845], [ax, 935]], PAL.gold, 8);
      cut(P_poly([[ax, 950], [ax - 18, 920], [ax + 18, 920]]), PAL.gold, { shadow: 0.4, edge: 2 });
    }
    ctx.restore();
  }

  if (overturnProg > 0) {
    const p = clamp(overturnProg, 0, 1);
    K.dashedRoute([[500, 1110], [490, 920], [450, 710], [320, 560]], p);
    K.dashedRoute([[580, 1110], [590, 920], [630, 710], [760, 560]], p);
    if (p > 0.35) {
      const fp = (p - 0.35) / 0.65;
      gasPlume(540, 650 - fp * 130, 420 * fp + 120, 220 * fp + 80, 0.9, PAL.greyMist);
      gasPlume(370, 690 - fp * 70, 280 * fp + 80, 150 * fp + 50, 0.85, PAL.greyCloud);
      gasPlume(710, 690 - fp * 70, 280 * fp + 80, 150 * fp + 50, 0.85, PAL.greyCloud);
    }
  }
}

export function buildShots() {
  const S = [], CUES = [], add = (o) => (S.push(o), o), cue = (t, type, o = {}) => CUES.push({ t: +t.toFixed(3), type, ...o });
  const cut_ = (i) => (i === 0 ? 0 : L(i) - 0.06);

  // ═══════════════════════════════════════════════════════════════════════════
  // SHOT 1 (Line 0): "A lake killed at least seventeen hundred people in a single night."
  // ═══════════════════════════════════════════════════════════════════════════
  {
    const w1700 = Wd('seventeen', 0), wNight = Wd('night', 0);
    add({
      id: 'S01', at: 0, cam: [540, 820], zoom: 0.09,
      note: 'Hook: Archival dispatch headline + deep blue crater lake in cut-paper mountains + 1,700 tally card',
      draw(lt, d, t) {
        twilightParchment(1, 0.48);
        cartoGrid();
        const pan = lerp(-35, 35, eio(lt / d));
        craterLandscape(pan, PAL.lakeDeep, 0.25, t);
        atlasFrame('CAMEROON HIGHLANDS', 'PLATE I · ARCHIVAL RECORD');

        const hScale = eob(seg(lt, 0.05, 0.42));
        newspaperClipping(
          'THE LAKE THAT STOLE THE AIR',
          'CAMEROON CRATER DISASTER · AUGUST 1986',
          540, 285, hScale, -0.012
        );

        const rProg = (t * 0.7) % 1;
        ctx.save();
        ctx.strokeStyle = PAL.crimson;
        ctx.lineWidth = 5;
        ctx.globalAlpha = 1 - rProg;
        ctx.beginPath();
        ctx.ellipse(540 + pan * 0.8, 1045, 90 + rProg * 230, 28 + rProg * 65, 0, 0, TAU);
        ctx.stroke();
        ctx.restore();

        if (t >= w1700 - 0.08) {
          const sc = eob(seg(t, w1700 - 0.08, w1700 + 0.28));
          ctx.save();
          ctx.translate(540, 560);
          ctx.scale(sc, sc);
          cut(P_rr(-330, -78, 660, 156, 8), PAL.crimson, { shadow: 0.9, edge: 5 });
          ctx.font = `700 62px ${SERIF}`;
          ctx.fillStyle = PAL.parchLight;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('AT LEAST 1,700 PEOPLE', 0, -14);
          ctx.font = `700 28px ${SERIF}`;
          ctx.fillStyle = PAL.gold;
          ctx.fillText('IN A SINGLE NIGHT · LAKE NYOS', 0, 42);
          ctx.restore();
        }

        if (t >= wNight - 0.05) {
          K.seal(885, 560, eob(seg(t, wNight - 0.05, wNight + 0.25)) * 0.78, 'N');
        }
      }
    });
    cue(0.08, 'whoosh', { gain: 0.8 });
    cue(0.18, 'thud', { gain: 0.7 });
    cue(w1700, 'slam', { gain: 0.75 });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SHOT 2 (Line 1): "And the killer was invisible."
  // ═══════════════════════════════════════════════════════════════════════════
  {
    const st = cut_(1), wInv = Wd('invisible', 1) - st;
    add({
      id: 'S02', at: st, cam: [540, 830], zoom: 0.10,
      note: 'Invisible danger: translucent atmospheric grey paper mist creeping down terraced valley',
      draw(lt, d, t) {
        twilightParchment(2, 0.58);
        cartoGrid();
        const pan = lerp(30, -30, eio(lt / d));

        // Distant highland ridge
        cut(P_poly([
          [-200, 680], [180 + pan * 0.4, 520], [540 + pan * 0.4, 575],
          [890 + pan * 0.4, 495], [1280, 680], [1280, 1432], [-200, 1432]
        ]), PAL.earthDark, { shadow: 0.7, edge: 5 });

        // Mid valley terrace
        cut(P_poly([
          [-200, 980], [280 + pan * 0.7, 890], [780 + pan * 0.7, 920],
          [1280, 860], [1280, 1432], [-200, 1432]
        ]), PAL.ridgeNear, { shadow: 0.75, edge: 5 });

        // Foreground valley ridge
        cut(P_poly([
          [-200, 1432], [-200, 1210], [340 + pan, 1165], [760 + pan, 1220], [1280, 1170], [1280, 1432]
        ]), PAL.earthMid, { shadow: 0.8, edge: 5 });

        villageCluster(330 + pan * 0.8, 935, 1.05);
        villageCluster(740 + pan * 0.8, 955, 0.95);

        const flow = eio(clamp(lt / (d * 0.85)));
        for (let k = 0; k < 3; k++) {
          const gx = lerp(520, 320 + k * 220, flow) + Math.sin(t * 1.5 + k) * 20;
          const gy = lerp(650, 900 + k * 55, flow);
          gasPlume(gx, gy, 480 + k * 90, 160 + k * 25, 0.55 + 0.12 * k, k % 2 ? PAL.greyMist : PAL.greyCloud);
        }

        const ringSc = eob(seg(lt, 0.2, 0.55));
        ctx.save();
        ctx.translate(540, 880);
        ctx.scale(ringSc, ringSc);
        ctx.strokeStyle = PAL.crimson;
        ctx.lineWidth = 6;
        ctx.setLineDash([20, 14]);
        ctx.beginPath();
        ctx.ellipse(0, 0, 370, 155, 0, 0, TAU);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();

        K.slip('AN ALMOST INVISIBLE CO₂ CLOUD', 540, 240, eob(seg(lt, 0.05, 0.35)), -0.012, 34);
        K.slip('SPREAD THROUGH THE VALLEYS', 540, 400, eob(seg(lt, 0.25, 0.55)), 0.018, 38);

        cut(P_rr(-300, 1432, W + 600, 600, 0), PAL.parchDark, { shadow: 0, edge: 0 });
        atlasFrame('VALLEY FLOOR SURVEY', 'PLATE II · ATMOSPHERIC ANOMALY');
      }
    });
    cue(st, 'whoosh', { gain: 0.7 });
    cue(st + Math.max(0.05, wInv), 'inhale', { dur: 1.1, gain: 0.85 });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SHOT 3 (Line 2): "On August twenty-first, nineteen eighty-six, at Lake Nyos in Cameroon,"
  // ═══════════════════════════════════════════════════════════════════════════
  {
    const st = cut_(2), wNyos = Wd('nyos', 2) - st, wCam = Wd('cameroon', 2) - st;
    add({
      id: 'S03', at: st, cam: [540, 820], zoom: 0.11,
      note: 'Cartographic map of Cameroon with gold date ribbon AUG 21, 1986 and Lake Nyos crater marker',
      draw(lt, d, t) {
        K.parchment(3);
        cut(P_poly([
          [56, 980], [360, 1020], [420, 1432], [56, 1432]
        ]), P.sea, { shadow: 0.4, edge: 5 });
        cartoGrid();

        cut(P_poly([
          [56, 76], [1024, 76], [1024, 1432], [390, 1432], [330, 1040], [56, 990]
        ]), PAL.parchDark, { shadow: 0.4, edge: 4 });

        const camPts = [
          [340, 1180], [295, 1040], [345, 920], [405, 800], [470, 690],
          [555, 560], [630, 430], [705, 390], [735, 500], [690, 650],
          [755, 790], [790, 960], [835, 1140], [620, 1190], [440, 1195]
        ];
        cut(P_poly(camPts), PAL.earthLight, { shadow: 0.85, edge: 6 });
        P_poly(camPts)();
        ctx.strokeStyle = PAL.crimson;
        ctx.lineWidth = 6;
        ctx.stroke();

        for (const [rx, ry, col] of [[155, 110, PAL.earthMid], [105, 75, PAL.ridgeMid], [52, 38, PAL.lakeMid]]) {
          cut(() => {
            ctx.beginPath();
            ctx.ellipse(475, 825, rx, ry, -0.35, 0, TAU);
          }, col, { shadow: 0.45, edge: 3 });
        }

        const rp = eio(clamp(lt / (d * 0.7)));
        K.dashedRoute([[335, 1085], [395, 965], [475, 825]], rp);

        const pulse = 1 + 0.15 * Math.sin(t * 7);
        ctx.save();
        ctx.translate(475, 825);
        ctx.scale(pulse, pulse);
        circle(0, 0, 16, PAL.crimson);
        ctx.strokeStyle = PAL.edge;
        ctx.lineWidth = 4;
        ctx.stroke();
        ctx.restore();

        K.label('GULF OF GUINEA', 220, 1285, 28, PAL.ink);
        K.compass(880, 1270, 0.62);

        K.ribbon('AUG 21, 1986', 540, 235, eob(seg(lt, 0.06, 0.42)), 76);

        if (lt >= wNyos - 0.1) {
          K.slip('LAKE NYOS · 1,091m', 495, 675, eob(seg(lt, wNyos - 0.1, wNyos + 0.25)), -0.02, 42);
        }
        if (lt >= wCam - 0.1) {
          K.slip('CAMEROON', 675, 985, eob(seg(lt, wCam - 0.1, wCam + 0.25)), 0.025, 46);
        }

        cut(P_rr(-300, 1432, W + 600, 600, 0), PAL.parchDark, { shadow: 0, edge: 0 });
        atlasFrame('6°26′N · 10°18′E', 'PLATE III · CARTOGRAPHIC SURVEY');
      }
    });
    cue(st, 'whoosh');
    cue(st + 0.12, 'pop', { gain: 0.6 });
    cue(st + Math.max(0.1, wNyos), 'pop', { gain: 0.65 });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SHOT 4 (Line 3): "a massive cloud of carbon dioxide suddenly burst from the deep crater lake."
  // ═══════════════════════════════════════════════════════════════════════════
  {
    const st = cut_(3), wBurst = Wd('burst', 3) - st;
    add({
      id: 'S04', at: st, cam: [540, 800], zoom: 0.12,
      note: 'Sudden CO2 release: towering fountain of water foam and grey carbon dioxide bursting from Lake Nyos',
      draw(lt, d, t) {
        twilightParchment(4, 0.52);
        cartoGrid();
        const pan = lerp(-20, 20, eio(lt / d));
        craterLandscape(pan, PAL.lakeMid, 0.35, t);

        const bStart = Math.max(0.15, wBurst - 0.35);
        const bp = eob(seg(lt, bStart, bStart + 0.55));
        if (bp > 0) {
          ctx.save();
          ctx.translate(540 + pan * 0.85, 980);
          cut(P_poly([
            [-150 * bp, 40], [-75 * bp, -390 * bp], [0, -470 * bp],
            [75 * bp, -390 * bp], [150 * bp, 40]
          ]), PAL.parchLight, { shadow: 0.75, edge: 5 });
          cut(P_poly([
            [-95 * bp, 40], [-45 * bp, -310 * bp], [0, -370 * bp],
            [45 * bp, -310 * bp], [95 * bp, 40]
          ]), PAL.greyMist, { shadow: 0.5, edge: 4 });
          ctx.restore();

          gasPlume(540, 470 - bp * 60, 620 * bp, 250 * bp, 0.92, PAL.greyMist);
          gasPlume(330, 540 - bp * 40, 380 * bp, 170 * bp, 0.85, PAL.greyCloud);
          gasPlume(750, 540 - bp * 40, 380 * bp, 170 * bp, 0.85, PAL.greyCloud);

          for (const dx of [-170, 0, 170]) {
            const ay0 = 920, ay1 = 920 - 330 * bp;
            line([[540 + dx, ay0], [540 + dx, ay1]], PAL.crimson, 8);
            cut(P_poly([[540 + dx, ay1 - 24], [540 + dx - 18, ay1 + 8], [540 + dx + 18, ay1 + 8]]), PAL.crimson, { shadow: 0.4, edge: 2 });
          }
        }

        K.slip('CARBON DIOXIDE (CO₂)', 540, 220, eob(seg(lt, 0.08, 0.38)), -0.01, 44);
        if (lt >= bStart) {
          K.slip('300 FT FOUNTAIN & MIST', 540, 1295, eob(seg(lt, bStart, bStart + 0.3)), 0.015, 38);
        }

        cut(P_rr(-300, 1432, W + 600, 600, 0), PAL.parchDark, { shadow: 0, edge: 0 });
        atlasFrame('GAS RELEASE EVENT', 'PLATE IV · HYDROTHERMAL RELEASE');
      }
    });
    cue(st, 'whoosh');
    cue(st + Math.max(0.1, wBurst - 0.1), 'slam', { gain: 0.8 });
    cue(st + Math.max(0.15, wBurst), 'bubbles', { dur: 2.2, gain: 0.85 });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SHOT 5 (Line 4): "Heavier than air, an almost invisible carbon dioxide cloud spread through the valleys,"
  // ═══════════════════════════════════════════════════════════════════════════
  {
    const st = cut_(4), wRise = Wd('spread', 4) - st;
    add({
      id: 'S05', at: st, cam: [540, 810], zoom: 0.08,
      note: 'Illustrated scientific diagram: CO2 density (1.5x heavier than air) sinking instead of rising',
      draw(lt, d, t) {
        K.parchment(5);
        cartoGrid();

        cut(P_rr(96, 160, W - 192, 270, 8), '#D8CEB4', { shadow: 0.5, edge: 4 });
        K.label('UPPER SKY · LIGHTER AIR (O₂ / N₂)', 540, 215, 32, PAL.ink);

        for (const ax of [300, 540, 780]) {
          line([[ax, 400], [ax, 265]], PAL.ridgeFar, 6);
          if (lt >= wRise - 0.15) {
            const xp = eob(seg(lt, wRise - 0.15, wRise + 0.2));
            ctx.save();
            ctx.translate(ax, 332);
            ctx.scale(xp, xp);
            line([[-34, -34], [34, 34]], PAL.crimson, 10);
            line([[34, -34], [-34, 34]], PAL.crimson, 10);
            ctx.restore();
          }
        }

        const sinkP = eio(clamp(lt / (d * 0.75)));
        cut(P_rr(115, 510 - sinkP * 35, 380, 260, 10), PAL.parchLight, { shadow: 0.75, edge: 5 });
        K.label('NORMAL AIR', 305, 570 - sinkP * 35, 34, PAL.lakeMid);
        K.label('1.20 kg/m³', 305, 635 - sinkP * 35, 42, PAL.ink);
        K.label('LIGHTER · RISES', 305, 705 - sinkP * 35, 26, PAL.ridgeNear);

        cut(P_rr(585, 510 + sinkP * 75, 380, 260, 10), PAL.greyMist, { shadow: 0.85, edge: 5 });
        K.label('CARBON DIOXIDE', 775, 570 + sinkP * 75, 34, PAL.crimson);
        K.label('1.98 kg/m³', 775, 635 + sinkP * 75, 44, PAL.ink);
        K.label('1.5× HEAVIER · SINKS', 775, 705 + sinkP * 75, 26, PAL.crimson);

        cut(P_poly([
          [96, 1360], [96, 980], [360, 960], [540, 1090], [820, 1180], [984, 1210], [984, 1360]
        ]), PAL.earthMid, { shadow: 0.7, edge: 5 });

        K.dashedRoute([[260, 920], [490, 1030], [740, 1125], [930, 1160]], sinkP);
        gasPlume(340 + sinkP * 380, 1010 + sinkP * 110, 420, 130, 0.85, PAL.greyDense);

        K.slip('DENSITY: 1.5× HEAVIER THAN AIR', 540, 1320, eob(seg(lt, 0.1, 0.4)), -0.01, 40);

        cut(P_rr(-300, 1432, W + 600, 600, 0), PAL.parchDark, { shadow: 0, edge: 0 });
        atlasFrame('ATMOSPHERIC DENSITY DIAGRAM', 'FIG. I · SPECIFIC GRAVITY');
      }
    });
    cue(st, 'whoosh');
    cue(st + 0.2, 'slide', { dur: 1.3, gain: 0.7 });
    cue(st + Math.max(0.15, wRise), 'thud', { gain: 0.65 });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SHOT 6 (Line 5): "Instead, it poured down nearby valleys and displaced breathable oxygen."
  // ═══════════════════════════════════════════════════════════════════════════
  {
    const st = cut_(5), wOxy = Wd('oxygen', 5) - st;
    add({
      id: 'S06', at: st, cam: [540, 815], zoom: 0.09,
      note: 'Topographic valley map: crimson gas routes flowing down into Nyos, Subum & Cha + oxygen displacement meter',
      draw(lt, d, t) {
        K.parchment(6);
        cartoGrid();

        cut(P_rr(76, 255, 640, 1125, 8), PAL.ridgeFar, { shadow: 0.5, edge: 4 });
        cut(P_poly([
          [340, 1180], [450, 1180], [430, 740], [630, 390], [520, 350],
          [380, 660], [200, 370], [120, 420], [310, 740]
        ]), PAL.parchMid, { shadow: 0.4, edge: 4 });

        ctx.save();
        ctx.strokeStyle = 'rgba(62,44,30,0.35)';
        ctx.lineWidth = 3;
        ctx.setLineDash([12, 8]);
        for (let r = 1; r <= 4; r++) {
          ctx.beginPath();
          ctx.arc(395, 1160, 90 + r * 145, Math.PI * 1.1, Math.PI * 1.9);
          ctx.stroke();
        }
        ctx.setLineDash([]);
        ctx.restore();

        cut(P_circ(395, 1160, 78), PAL.lakeDeep, { shadow: 0.7, edge: 5 });
        K.label('LAKE NYOS', 395, 1280, 32, PAL.ink);

        const fp = eio(clamp(lt / (d * 0.8)));
        const h1 = K.dashedRoute([[395, 1120], [385, 920], [350, 720], [175, 415]], fp);
        const h2 = K.dashedRoute([[395, 1120], [405, 920], [440, 720], [565, 395]], fp);

        gasPlume(h1[0], h1[1], 210, 95, 0.78, PAL.greyDense);
        gasPlume(h2[0], h2[1], 210, 95, 0.78, PAL.greyDense);

        for (const [name, vx, vy] of [['CHA', 180, 385], ['SUBUM', 565, 365]]) {
          circle(vx, vy, 11, PAL.crimson);
          K.label(name, vx, vy - 34, 28, PAL.ink);
        }
        // Pinned slip for NYOS VALLEY so it stands cleanly above the route
        K.slip('NYOS VALLEY', 235, 865, 1, -0.02, 28);

        // Right-side Illustrated Oxygen Displacement Column (x: 745..990)
        cut(P_rr(745, 255, 245, 1125, 8), PAL.parchLight, { shadow: 0.8, edge: 5 });
        K.label('VALLEY AIR', 867, 305, 28, PAL.ink);
        const co2H = lerp(120, 620, fp);
        cut(P_rr(775, 355, 185, 820 - co2H, 4), PAL.lakeSurface, { shadow: 0.3, edge: 3 });
        K.label('O₂ AIR', 867, 355 + (820 - co2H) / 2, 32, PAL.parchLight);
        cut(P_rr(775, 1175 - co2H, 185, co2H, 4), PAL.greyDense, { shadow: 0.4, edge: 3 });
        K.label('DENSE CO₂', 867, 1175 - co2H / 2, 32, PAL.parchLight);
        K.label('ASPHYXIATION', 867, 1235, 22, PAL.crimson);

        K.slip('CO₂ CLOUD TRAVELED DOWN VALLEYS — UP TO ~15 KM', 540, 185, eob(seg(lt, 0.15, 0.55)), -0.008, 28);

        cut(P_rr(-300, 1432, W + 600, 600, 0), PAL.parchDark, { shadow: 0, edge: 0 });
        atlasFrame('TOPOGRAPHIC VALLEY DRAINAGE', 'PLATE V · GAS FLOW ROUTES');
      }
    });
    cue(st, 'whoosh');
    cue(st + 0.15, 'slide', { dur: 1.8, gain: 0.75 });
    cue(st + Math.max(0.2, wOxy), 'pop', { gain: 0.6 });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SHOT 7 (Line 6): "For decades, volcanic gas from deep underground had seeped into the cold bottom water,"
  // ═══════════════════════════════════════════════════════════════════════════
  {
    const st = cut_(6), wSeep = Wd('seeped', 6) - st;
    add({
      id: 'S07', at: st, cam: [540, 840], zoom: 0.10,
      note: 'Geological cross-section: magmatic CO2 seeping through fault line into 208m deep bottom water over decades',
      draw(lt, d, t) {
        K.parchment(7);
        cartoGrid();

        const p = eio(clamp(lt / (d * 0.85)));
        geologicalCrossSection(0.3 + 0.7 * p, false, 0, t);

        K.timeline(['1950s', '1960s', '1970s', '1986'], 160, 220, 760, p, Math.min(3, Math.floor(p * 3.99)));

        K.slip('DEEP MAGMATIC CO₂ SEEPAGE', 540, 1355, eob(seg(lt, 0.1, 0.4)), 0.01, 38);
        if (lt >= wSeep - 0.1) {
          K.slip('COLD BOTTOM WATER · 208m DEEP', 540, 420, eob(seg(lt, wSeep - 0.1, wSeep + 0.25)), -0.015, 40);
        }

        cut(P_rr(-300, 1432, W + 600, 600, 0), PAL.parchDark, { shadow: 0, edge: 0 });
        atlasFrame('GEOLOGICAL CROSS-SECTION', 'FIG. II · SUBSURFACE ACCUMULATION');
      }
    });
    cue(st, 'whoosh');
    cue(st + 0.2, 'bubbles', { dur: 2.5, gain: 0.75 });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SHOT 8 (Line 7): "trapped under immense pressure like a giant sealed bottle."
  // ═══════════════════════════════════════════════════════════════════════════
  {
    const st = cut_(7), wBottle = Wd('bottle', 7) - st;
    add({
      id: 'S08', at: st, cam: [540, 820], zoom: 0.09,
      note: 'Scientific pressure diagram: 20-bar water column cap + sealed pressurized bottle + pressure gauge',
      draw(lt, d, t) {
        K.parchment(8);
        cartoGrid();

        // Left Panel: Lake Pressure Column Diagram
        cut(P_rr(84, 190, 430, 1020, 8), PAL.parchLight, { shadow: 0.75, edge: 5 });
        K.label('CRATER WATER COLUMN', 299, 250, 28, PAL.ink);
        cut(P_rr(124, 310, 350, 360, 4), PAL.lakeSurface, { shadow: 0.4, edge: 4 });
        K.label('UPPER WATER CAP', 299, 430, 28, PAL.parchLight);
        for (const ax of [200, 299, 398]) {
          line([[ax, 500], [ax, 630]], PAL.gold, 8);
          cut(P_poly([[ax, 650], [ax - 16, 620], [ax + 16, 620]]), PAL.gold, { shadow: 0.3, edge: 2 });
        }
        // Lower high-pressure dissolved CO2 layer
        cut(P_rr(124, 680, 350, 470, 4), PAL.lakeAbyss, { shadow: 0.5, edge: 4 });
        // Bubbles kept in top/bottom bands of chamber so center labels are 100% clear
        for (let i = 0; i < 6; i++) {
          circle(165 + i * 52, 735 + (i % 2) * 35, 9, i % 2 ? PAL.crimson : PAL.greyMist);
          circle(165 + i * 52, 1025 + ((i + 1) % 2) * 45, 9, i % 2 ? PAL.greyMist : PAL.crimson);
        }
        K.label('TRAPPED CO₂', 299, 865, 34, PAL.crimson);
        K.label('20 BARS PRESSURE', 299, 930, 28, PAL.gold);

        // Right Panel: Vintage Illustrated Sealed Bottle
        const bScale = lt >= wBottle - 0.35 ? eob(seg(lt, wBottle - 0.35, wBottle + 0.15)) : 0.92;
        ctx.save();
        ctx.translate(765, 700);
        ctx.scale(bScale, bScale);
        cut(P_rr(-215, -510, 430, 1020, 8), PAL.parchLight, { shadow: 0.75, edge: 5 });
        K.label('SEALED BOTTLE ANALOGY', 0, -450, 26, PAL.ink);

        cut(P_poly([
          [-55, -340], [55, -340], [65, -210], [135, -110],
          [135, 340], [-135, 340], [-135, -110], [-65, -210]
        ]), PAL.lakeMid, { shadow: 0.7, edge: 5 });
        cut(P_rr(-48, -395, 96, 65, 6), PAL.gold, { shadow: 0.5, edge: 4 });
        line([[-55, -340], [55, -340]], PAL.crimson, 10);

        for (let i = 0; i < 16; i++) {
          const by = 290 - ((t * 60 + i * 28) % 380);
          const bx = Math.sin(i * 3.7 + t * 3) * 85;
          circle(bx, by, 8 + (i % 3) * 3, i % 3 === 0 ? PAL.crimson : PAL.parchLight);
        }
        K.label('HIGH PRESSURE', 0, 415, 32, PAL.crimson);
        ctx.restore();

        const gp = eio(clamp(lt / (d * 0.75)));
        ctx.save();
        ctx.translate(540, 1295);
        cut(P_circ(0, 0, 92), PAL.gold, { shadow: 0.7, edge: 5 });
        cut(P_circ(0, 0, 74), PAL.parchLight, { shadow: 0, edge: 3 });
        const ang = lerp(-Math.PI * 0.8, Math.PI * 0.25, gp);
        line([[0, 0], [Math.cos(ang) * 56, Math.sin(ang) * 56]], PAL.crimson, 8);
        circle(0, 0, 10, PAL.ink);
        ctx.restore();

        cut(P_rr(-300, 1432, W + 600, 600, 0), PAL.parchDark, { shadow: 0, edge: 0 });
        atlasFrame('HYDROSTATIC PRESSURE MODEL', 'FIG. III · GAS SATURATION');
      }
    });
    cue(st, 'whoosh');
    cue(st + 0.15, 'tock', { gain: 0.7 });
    cue(st + Math.max(0.2, wBottle), 'pop', { gain: 0.7 });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SHOT 9 (Line 8): "Investigators found no lava, no ash, and no direct volcanic eruption,"
  // ═══════════════════════════════════════════════════════════════════════════
  {
    const st = cut_(8);
    add({
      id: 'S09', at: st, cam: [540, 820], zoom: 0.08,
      note: 'Scientific investigation checklist: NO LAVA, NO ASH, NO DIRECT VOLCANIC ERUPTION',
      draw(lt, d, t) {
        K.parchment(9);
        cartoGrid();

        const pan = lerp(-20, 20, eio(lt / d));
        cut(P_rr(84, 150, W - 168, 430, 8), '#DFD1B0', { shadow: 0.6, edge: 5 });
        cut(P_poly([
          [84, 580], [84, 380], [270 + pan, 320], [420 + pan, 420],
          [660 + pan, 420], [810 + pan, 310], [W - 84, 380], [W - 84, 580]
        ]), PAL.earthMid, { shadow: 0.5, edge: 4 });
        cut(P_rr(280 + pan, 415, 520, 130, 6), PAL.lakeMid, { shadow: 0.4, edge: 4 });
        K.label('LAKE NYOS BASIN · NO VOLCANIC CRATER CONE', 540, 210, 30, PAL.ink);

        const items = [
          ['NO LAVA FLOWS', 'CRATER ROCK UNMELTED', 690, 0.25],
          ['NO VOLCANIC ASH', 'NO TEPHRA OR CINDER LAYER', 920, 1.05],
          ['NO DIRECT ERUPTION', 'NOT A CONVENTIONAL VOLCANIC ERUPTION', 1150, 1.85],
        ];
        items.forEach(([title, sub, cy, trig]) => {
          const active = lt >= trig;
          const sc = active ? eob(seg(lt, trig, trig + 0.28)) : 0.92;
          ctx.save();
          ctx.translate(540, cy);
          ctx.scale(sc, sc);
          cut(P_rr(-420, -82, 840, 164, 8), active ? PAL.parchLight : PAL.parchDark, { shadow: 0.75, edge: 5 });
          cut(P_rr(-385, -52, 104, 104, 6), active ? PAL.crimson : PAL.earthMid, { shadow: 0.4, edge: 3 });
          ctx.font = `700 64px ${SERIF}`;
          ctx.fillStyle = PAL.parchLight;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(active ? '✕' : '·', -333, 4);

          ctx.textAlign = 'left';
          ctx.font = `700 42px ${SERIF}`;
          ctx.fillStyle = active ? PAL.crimson : PAL.ink;
          ctx.fillText(title, -245, -16);
          ctx.font = `700 26px ${SERIF}`;
          ctx.fillStyle = PAL.earthDark;
          ctx.fillText(sub, -245, 34);
          ctx.restore();
        });

        cut(P_rr(-300, 1432, W + 600, 600, 0), PAL.parchDark, { shadow: 0, edge: 0 });
        atlasFrame('USGS FIELD INVESTIGATION · 1986', 'PLATE VI · FORENSIC FINDINGS');
      }
    });
    cue(st, 'whoosh');
    cue(st + 0.25, 'thud', { gain: 0.65 });
    cue(st + 1.05, 'thud', { gain: 0.65 });
    cue(st + 1.85, 'slam', { gain: 0.7 });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SHOT 10 (Line 9): "and the exact trigger remained undetermined."
  // ═══════════════════════════════════════════════════════════════════════════
  {
    const st = cut_(9), wUndet = Wd('undetermined', 9) - st;
    add({
      id: 'S10', at: st, cam: [540, 820], zoom: 0.09,
      note: 'Scientific hypothesis diagram: Rockslide? Rain? Wind? -> Exact trigger UNDETERMINED',
      draw(lt, d, t) {
        K.parchment(10);
        cartoGrid();

        const hyps = [
          ['ROCKSLIDE?', 'CLIFF COLLAPSE', 225, 425, 0.08],
          ['COLD RAIN?', 'SURFACE COOLING', 540, 295, 0.22],
          ['TREMOR?', 'SEISMIC SHIFT', 855, 425, 0.36],
        ];
        hyps.forEach(([labelTxt, subTxt, hx, hy, delay]) => {
          const sc = eob(seg(lt, delay, delay + 0.35));
          if (sc <= 0) return;
          K.dashedRoute([[hx, hy + 120], [540, 820]], sc);
          ctx.save();
          ctx.translate(hx, hy);
          ctx.scale(sc, sc);
          cut(P_circ(0, 0, 136), PAL.parchLight, { shadow: 0.8, edge: 5 });
          ctx.strokeStyle = PAL.ink;
          ctx.lineWidth = 3;
          ctx.beginPath(); ctx.arc(0, 0, 120, 0, TAU); ctx.stroke();
          K.label(labelTxt, 0, -14, 26, PAL.crimson);
          K.label(subTxt, 0, 28, 19, PAL.earthDark);
          ctx.restore();
        });

        cut(P_circ(540, 860, 210), PAL.lakeDeep, { shadow: 0.9, edge: 6 });
        cut(P_circ(540, 860, 155), PAL.lakeAbyss, { shadow: 0.4, edge: 4 });
        K.seal(540, 860, 1.35, '?');

        const uSc = lt >= wUndet - 0.15 ? eob(seg(lt, wUndet - 0.15, wUndet + 0.25)) : 0.85;
        K.ribbon('UNDETERMINED', 540, 1245, uSc, 78);

        cut(P_rr(-300, 1432, W + 600, 600, 0), PAL.parchDark, { shadow: 0, edge: 0 });
        atlasFrame('TRIGGERING MECHANISM ANALYSIS', 'FIG. IV · OPEN SCIENTIFIC QUESTION');
      }
    });
    cue(st, 'whoosh');
    cue(st + 0.12, 'pop', { gain: 0.55 });
    cue(st + 0.26, 'pop', { gain: 0.55 });
    cue(st + Math.max(0.2, wUndet), 'thud', { gain: 0.75 });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SHOT 11 (Line 10): "Scientists called this rare phenomenon a limnic eruption:"
  // ═══════════════════════════════════════════════════════════════════════════
  {
    const st = cut_(10), wLimnic = Wd('limnic', 10) - st;
    add({
      id: 'S11', at: st, cam: [540, 830], zoom: 0.11,
      note: 'Illustrated scientific diagram of a Limnic Eruption (lake overturn) with gold title ribbon',
      draw(lt, d, t) {
        K.parchment(11);
        cartoGrid();

        const ovProg = eio(clamp(lt / (d * 0.85)));
        geologicalCrossSection(1.0, false, ovProg, t);

        ctx.save();
        ctx.strokeStyle = PAL.gold;
        ctx.lineWidth = 7;
        ctx.beginPath();
        ctx.arc(430, 930, 85, Math.PI * 0.3, Math.PI * 1.6);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(650, 930, 85, Math.PI * 1.4, Math.PI * 0.7);
        ctx.stroke();
        ctx.restore();

        const rSc = lt >= wLimnic - 0.15 ? eob(seg(lt, wLimnic - 0.15, wLimnic + 0.28)) : eob(seg(lt, 0.08, 0.4));
        K.ribbon('LIMNIC ERUPTION', 540, 235, rSc, 76);

        K.slip('RARE LAKE OVERTURN PHENOMENON', 540, 390, eob(seg(lt, 0.15, 0.45)), -0.01, 38);

        cut(P_rr(-300, 1432, W + 600, 600, 0), PAL.parchDark, { shadow: 0, edge: 0 });
        atlasFrame('CLASSIFICATION · LIMNOLOGY', 'PLATE VII · LIMNIC ERUPTION');
      }
    });
    cue(st, 'whoosh');
    cue(st + Math.max(0.1, wLimnic), 'sparkle', { dur: 1.1, gain: 0.7 });
    cue(st + 0.25, 'bubbles', { dur: 2.0, gain: 0.7 });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SHOT 12 (Line 11): "the night a quiet lake overturned and stole the air."
  // ═══════════════════════════════════════════════════════════════════════════
  {
    const st = cut_(11), wAir = Wd('air', 11) - st;
    add({
      id: 'S12', at: st, cam: [540, 820], zoom: 0.08,
      note: 'Closing plate: serene Lake Nyos in cut paper, drifting mist, date ribbon & respectful memorial slip',
      draw(lt, d, t) {
        twilightParchment(12, 0.50);
        cartoGrid();
        const pan = lerp(25, -25, eio(lt / d));
        craterLandscape(pan, PAL.lakeDeep, 0.45, t);

        K.ribbon('LAKE NYOS · 1986', 540, 250, eob(seg(lt, 0.06, 0.4)), 76);
        K.slip('IN MEMORY · AT LEAST 1,700 PEOPLE', 540, 430, eob(seg(lt, 0.18, 0.52)), 0.0, 38);

        if (lt >= wAir - 0.2) {
          K.seal(540, 630, eob(seg(lt, wAir - 0.2, wAir + 0.2)) * 1.05, 'N');
        }

        cut(P_rr(-300, 1432, W + 600, 600, 0), PAL.parchDark, { shadow: 0, edge: 0 });
        atlasFrame('CAMEROON · AUGUST 21, 1986', 'PLATE VIII · ARCHIVAL CONCLUSION');
      }
    });
    cue(st, 'whoosh');
    cue(st + Math.max(0.15, wAir - 0.1), 'thud', { gain: 0.65 });
  }

  return { shots: S, cues: CUES };
}
