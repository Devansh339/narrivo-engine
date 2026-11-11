// THE SOLDIER WHO FOUGHT FOR 29 YEARS — Night File 3D (Authentic Historical Remaster)
// Hiroo Onoda on Lubang Island, Philippines (1945–1974).
// High-detail 3D soldier with Imperial Japanese Army uniform, cap with neck flaps, and Arisaka rifle.
// Authentic jungle, bunker, and case file sets with dramatic cinematic lighting.
import * as THREE from 'three';
import { ctx, setCtx, W, H, clamp, lerp, seg, eo, eio, eob, rr } from './core/lib.js';
import { L, Wd, T } from './core/timing.js';
import { camera } from './core/engine.js';
import { Human } from './core/human.js';
import * as K from './core/kit.js';

const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const lerpV = (a, b, k) => a.clone().lerp(b, k);

const NIGHT = { exposure: 1.25, bloom: 0.65, bloomThreshold: 0.6, vignette: 0.65, grain: 0.05, warm: 0.02 };
const JUNGLE_LOOK = { exposure: 1.2, bloom: 0.55, bloomThreshold: 0.65, vignette: 0.7, grain: 0.06, warm: -0.04 };
const BUNKER_LOOK = { exposure: 1.35, bloom: 0.7, bloomThreshold: 0.55, vignette: 0.6, grain: 0.04, warm: 0.12 };

// ── Materials Helper ────────────────────────────────────────────────────────
const std = (color, rough = 0.8, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: rough, ...extra });

// ── 3D Accessory Builders ───────────────────────────────────────────────────

/** Imperial Japanese Army Field Cap (Boshi) with neck flaps (Tare) */
function makeArmyCap({ officer = false } = {}) {
  const g = new THREE.Group();
  const capColor = officer ? '#38422A' : '#4E533B';
  const capMat = std(capColor, 0.85);
  const leatherMat = std('#261A12', 0.45, { metalness: 0.2 });
  const goldMat = std('#D4AF37', 0.35, { metalness: 0.8 });

  // Crown
  const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.135, 0.085, 24), capMat);
  crown.position.set(0, 0.225, -0.015);
  crown.rotation.x = -0.08;
  crown.castShadow = true;
  g.add(crown);

  // Top cap crown
  const top = new THREE.Mesh(new THREE.SphereGeometry(0.125, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.4), capMat);
  top.position.set(0, 0.26, -0.015);
  top.rotation.x = -0.08;
  g.add(top);

  // Visor
  const visor = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.145, 0.014, 16, 1, false, -1.2, 2.4), leatherMat);
  visor.position.set(0, 0.19, 0.065);
  visor.rotation.x = 0.28;
  visor.castShadow = true;
  g.add(visor);

  // Chinstrap
  const strap = new THREE.Mesh(new THREE.CylinderGeometry(0.136, 0.136, 0.012, 16, 1, true, -1.3, 2.6), officer ? goldMat : leatherMat);
  strap.position.set(0, 0.205, 0.04);
  strap.rotation.x = -0.08;
  g.add(strap);

  // Star Emblem (Imperial Army 5-point star)
  const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.014), goldMat);
  star.position.set(0, 0.235, 0.118);
  star.rotation.z = Math.PI / 4;
  g.add(star);

  // Havelock Neck Flaps (3 cloth panels hanging behind the cap for jungle protection)
  if (!officer) {
    const flapMat = std('#484D35', 0.95);
    const flapGeo = new THREE.PlaneGeometry(0.075, 0.16);
    // Left flap
    const fL = new THREE.Mesh(flapGeo, flapMat);
    fL.position.set(-0.09, 0.12, -0.06);
    fL.rotation.set(-0.1, 0.8, -0.15);
    // Center back flap
    const fC = new THREE.Mesh(flapGeo, flapMat);
    fC.position.set(0, 0.12, -0.135);
    fC.rotation.set(-0.25, 0, 0);
    // Right flap
    const fR = new THREE.Mesh(flapGeo, flapMat);
    fR.position.set(0.09, 0.12, -0.06);
    fR.rotation.set(-0.1, -0.8, 0.15);
    g.add(fL, fC, fR);
  }

  return g;
}

/** Arisaka Type 99 Rifle (WW2 Japanese Infantry Bolt-Action) */
function makeArisakaRifle() {
  const g = new THREE.Group();
  const wood = std('#462C1A', 0.65);
  const steel = std('#24282F', 0.4, { metalness: 0.85 });

  // Wooden stock
  const stock = new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.075, 0.88), wood);
  stock.position.set(0, 0, 0);
  stock.castShadow = true;
  g.add(stock);

  // Steel barrel
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.013, 0.96, 12), steel);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.028, 0.18);
  barrel.castShadow = true;
  g.add(barrel);

  // Receiver & bolt handle
  const bolt = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.035, 0.14), steel);
  bolt.position.set(0, 0.045, -0.1);
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.05), steel);
  handle.rotation.z = Math.PI / 2.5;
  handle.position.set(0.032, 0.045, -0.08);
  g.add(bolt, handle);

  // Trigger guard
  const guard = new THREE.Mesh(new THREE.TorusGeometry(0.024, 0.005, 8, 16, Math.PI), steel);
  guard.rotation.x = -Math.PI / 2;
  guard.position.set(0, -0.035, -0.11);
  g.add(guard);

  // Leather sling
  const slingMat = std('#2E1F14', 0.8);
  const sling = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.024, 0.62), slingMat);
  sling.position.set(-0.015, -0.05, 0.05);
  g.add(sling);

  g.scale.setScalar(1.15);
  return g;
}

/** Officer Gunto (Katana in military dress scabbard) */
function makeGuntoSword() {
  const g = new THREE.Group();
  const scabbard = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.014, 0.92, 12), std('#2F382A', 0.5, { metalness: 0.3 }));
  scabbard.position.set(0, -0.42, 0);
  const guard = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.042, 0.012, 16), std('#D4AF37', 0.3, { metalness: 0.85 }));
  guard.position.set(0, 0.02, 0);
  const hilt = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.018, 0.24, 12), std('#E2D7B8', 0.7));
  hilt.position.set(0, 0.14, 0);
  g.add(scabbard, guard, hilt);
  return g;
}

/** Ammo pouches and waist gear */
function makeSoldierGear() {
  const g = new THREE.Group();
  const leather = std('#302015', 0.6);
  const brass = std('#C5A030', 0.35, { metalness: 0.8 });

  // Waist belt
  const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.185, 0.185, 0.055, 24, 1, true), leather);
  belt.position.set(0, 0.02, 0);
  const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.065, 0.015), brass);
  buckle.position.set(0, 0.02, 0.186);
  g.add(belt, buckle);

  // Two front ammo pouches
  for (const s of [-1, 1]) {
    const pouch = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.09, 0.045), leather);
    pouch.position.set(s * 0.085, 0.01, 0.18);
    pouch.rotation.y = s * 0.18;
    g.add(pouch);
  }

  // Canteen on right hip
  const canteen = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.04, 0.12, 12), std('#4B543D', 0.65));
  canteen.position.set(0.19, -0.05, -0.03);
  g.add(canteen);

  return g;
}

/** Construct an authentic 3D Soldier */
function createSoldier({ officer = false } = {}) {
  const h = new Human({
    face: true,
    skin: officer ? '#D8AB82' : '#BE8552',
    shirt: officer ? '#38422A' : '#4C5238',
    pants: officer ? '#323B24' : '#444A32',
    shoes: officer ? '#1B140E' : '#2A1F16',
    hair: '#141414',
    iris: '#24160E',
  });

  // Attach Army Cap to head
  const cap = makeArmyCap({ officer });
  h.head.add(cap);

  // Attach Gear to hips
  const gear = makeSoldierGear();
  h.hips.add(gear);

  // Rifle
  const rifle = makeArisakaRifle();
  h.rifle = rifle;

  if (officer) {
    const sword = makeGuntoSword();
    sword.position.set(-0.21, -0.05, 0.02);
    sword.rotation.z = 0.22;
    h.hips.add(sword);
  }

  return h;
}

// ── 3D Environments ─────────────────────────────────────────────────────────

/** Authentic Tropical Jungle Set (Lubang Island, Philippines) */
function makeJungleSet() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#050A0E');
  scene.fog = new THREE.FogExp2('#050A0E', 0.075);

  // Muddy tropical ground
  const groundM = std('#131B13', 0.95);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(36, 36, 16, 16), groundM);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.01;
  ground.receiveShadow = true;
  scene.add(ground);

  // Tropical Trees (Palm trunks and hardwood)
  const trunkM = std('#241F18', 0.9);
  const palmLeafM = std('#1C2E1A', 0.85);

  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2 + (i % 3) * 0.3;
    const r = 3.5 + (i % 5) * 1.6;
    const x = Math.cos(a) * r, z = -4.5 + Math.sin(a) * r;
    const h = 4.2 + (i % 4) * 0.8;

    // Trunk
    const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, h, 10), trunkM);
    tr.position.set(x, h / 2, z);
    tr.rotation.z = (Math.sin(i * 1.7) * 0.1);
    tr.rotation.x = (Math.cos(i * 1.3) * 0.1);
    tr.castShadow = true;
    scene.add(tr);

    // Palm canopy on top
    const topP = new THREE.Vector3(x, h, z);
    for (let leaf = 0; leaf < 7; leaf++) {
      const la = (leaf / 7) * Math.PI * 2;
      const frond = new THREE.Mesh(new THREE.ConeGeometry(0.7, 2.0, 5), palmLeafM);
      frond.position.copy(topP);
      frond.rotation.set(0.7, la, 0.4);
      frond.castShadow = true;
      scene.add(frond);
    }
  }

  // Bamboo stalks cluster
  const bambooM = std('#2F4522', 0.7);
  for (let i = 0; i < 24; i++) {
    const bx = -2.8 + (i % 6) * 0.35 + Math.sin(i * 3) * 0.15;
    const bz = -5.5 + Math.floor(i / 6) * 0.45;
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.028, 4.5, 8), bambooM);
    b.position.set(bx, 2.2, bz);
    b.rotation.z = (i % 2 ? 0.05 : -0.05);
    scene.add(b);
  }

  // Jungle Rocks & Roots
  const rockM = std('#1C2024', 0.9);
  for (let i = 0; i < 8; i++) {
    const rx = -2 + (i % 4) * 1.3;
    const rz = -3 - (i % 3) * 1.5;
    const rk = new THREE.Mesh(new THREE.DodecahedronGeometry(0.35 + (i % 3) * 0.18), rockM);
    rk.position.set(rx, 0.15, rz);
    rk.castShadow = true;
    scene.add(rk);
  }

  // Campfire stones & ember glow
  const fireLight = new THREE.PointLight('#FF6622', 12, 6, 1.8);
  fireLight.position.set(0.8, 0.25, -3.2);
  scene.add(fireLight);

  // Pale tropical moonlight through canopy
  const moon = new THREE.DirectionalLight('#7A9CB8', 1.8);
  moon.position.set(3, 9, 2);
  moon.castShadow = true;
  moon.shadow.mapSize.set(2048, 2048);
  scene.add(moon);

  // Soft jungle fill light
  scene.add(new THREE.HemisphereLight('#254030', '#080E0A', 0.65));

  // Volumetric shaft of moonlight
  const shaft = new THREE.Mesh(
    new THREE.CylinderGeometry(0.6, 2.2, 7, 24, 1, true),
    new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      uniforms: { uCol: { value: new THREE.Color('#658BAE') }, uOp: { value: 0.14 } },
      vertexShader: 'varying vec3 vPos; void main(){ vPos = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: 'uniform vec3 uCol; uniform float uOp; varying vec3 vPos; void main(){ float f = clamp((vPos.y + 3.5)/7.0, 0.0, 1.0); gl_FragColor = vec4(uCol, uOp * f * (1.0 - f)); }'
    })
  );
  shaft.position.set(0, 3.5, -4);
  shaft.rotation.z = -0.12;
  scene.add(shaft);

  return { scene, fireLight };
}

/** 1944 Military Command Bunker (Briefing Room) */
function makeBunkerSet() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#080A0C');
  scene.fog = new THREE.Fog('#080A0C', 3, 14);

  const wallM = std('#2B3135', 0.9);
  const woodM = std('#3A2A1E', 0.7);

  // Floor & Walls
  const floor = new THREE.Mesh(new THREE.BoxGeometry(10, 0.1, 12), std('#202428', 0.8));
  floor.position.set(0, -0.05, -3);
  floor.receiveShadow = true;
  scene.add(floor);

  const backWall = new THREE.Mesh(new THREE.BoxGeometry(10, 4, 0.2), wallM);
  backWall.position.set(0, 2, -7.5);
  scene.add(backWall);

  const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.2, 4, 12), wallM);
  leftWall.position.set(-4.5, 2, -3);
  scene.add(leftWall);

  // Ceiling beams
  for (let i = 0; i < 4; i++) {
    const beam = new THREE.Mesh(new THREE.BoxGeometry(10, 0.25, 0.25), woodM);
    beam.position.set(0, 3.2, -6 + i * 2);
    scene.add(beam);
  }

  // Strategy Table
  const table = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.1, 1.5), woodM);
  table.position.set(0, 0.85, -3.8);
  table.castShadow = table.receiveShadow = true;
  scene.add(table);

  // Table Legs
  for (const x of [-1.05, 1.05]) {
    for (const z of [-0.6, 0.6]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.85), woodM);
      leg.position.set(x, 0.425, -3.8 + z);
      scene.add(leg);
    }
  }

  // Map of Philippines on table (Canvas Texture)
  const mapC = document.createElement('canvas');
  mapC.width = 512; mapC.height = 360;
  const mg = mapC.getContext('2d');
  mg.fillStyle = '#C8BA9A'; mg.fillRect(0, 0, 512, 360);
  mg.strokeStyle = '#2B251B'; mg.lineWidth = 3;
  // Island blobs
  mg.fillStyle = '#6E785C';
  mg.beginPath(); mg.ellipse(256, 140, 80, 110, 0.3, 0, Math.PI * 2); mg.fill(); // Luzon
  mg.beginPath(); mg.ellipse(260, 260, 70, 60, -0.2, 0, Math.PI * 2); mg.fill(); // Visayas
  mg.beginPath(); mg.ellipse(200, 160, 18, 12, 0.4, 0, Math.PI * 2); mg.fill();  // Lubang
  // Red tactical circle on Lubang Island
  mg.strokeStyle = '#C42020'; mg.lineWidth = 5;
  mg.beginPath(); mg.arc(200, 160, 28, 0, Math.PI * 2); mg.stroke();
  mg.font = '700 24px monospace'; mg.fillStyle = '#C42020';
  mg.fillText('LUBANG', 140, 215);
  mg.font = '700 28px serif'; mg.fillStyle = '#1A1814';
  mg.fillText('PHILIPPINE ISLANDS - 1944', 40, 48);

  const mapTex = new THREE.CanvasTexture(mapC);
  const mapMesh = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.1), std('#FFFFFF', 0.65, { map: mapTex }));
  mapMesh.rotation.x = -Math.PI / 2;
  mapMesh.position.set(0, 0.905, -3.8);
  scene.add(mapMesh);

  // Hanging bunker light fixture
  const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 1.2), std('#151515'));
  cord.position.set(0, 2.6, -3.8);
  const shade = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.18, 16, 1, true), std('#2E382A', 0.5, { metalness: 0.6 }));
  shade.position.set(0, 2.0, -3.8);
  scene.add(cord, shade);

  const spot = new THREE.SpotLight('#FFE0A0', 32, 7, 0.75, 0.45, 1.2);
  spot.position.set(0, 2.0, -3.8);
  spot.target.position.set(0, 0.8, -3.8);
  spot.castShadow = true;
  spot.shadow.mapSize.set(2048, 2048);
  scene.add(spot, spot.target);

  scene.add(new THREE.HemisphereLight('#253040', '#08080C', 0.35));

  return { scene };
}

/** Case Wall with Wartime Intelligence Dossiers */
function makeCaseWallSet() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#0A0806');

  // Cork board
  const board = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 5.2), std('#5A3D28', 0.95));
  board.position.set(0, 0.2, 0);
  board.receiveShadow = true;
  scene.add(board);

  // Photos & Dossiers
  const makeDocTex = (title, subtitle, code) => {
    const c = document.createElement('canvas');
    c.width = 400; c.height = 480;
    const g = c.getContext('2d');
    g.fillStyle = '#D4CBB6'; g.fillRect(0, 0, 400, 480);
    g.strokeStyle = '#222'; g.lineWidth = 4; g.strokeRect(16, 16, 368, 448);
    g.fillStyle = '#111'; g.font = '700 26px FreeMono';
    g.fillText(title, 32, 60);
    g.font = '600 18px FreeMono'; g.fillStyle = '#444';
    g.fillText(subtitle, 32, 95);
    // Dark silhouette photo area
    g.fillStyle = '#222830'; g.fillRect(40, 120, 320, 240);
    g.fillStyle = '#8E1D1A'; g.font = '700 48px FreeMono';
    g.fillText(code, 60, 260);
    // Red classified stamp
    g.save(); g.translate(200, 410); g.rotate(-0.1);
    g.strokeStyle = '#C42020'; g.lineWidth = 6; g.strokeRect(-120, -28, 240, 56);
    g.font = '900 32px FreeMono'; g.fillStyle = '#C42020'; g.textAlign = 'center';
    g.fillText('TOP SECRET', 0, 10);
    g.restore();
    return new THREE.CanvasTexture(c);
  };

  const docs = [
    makeDocTex('ONODA, HIROO', '2ND LT · IMPERIAL ARMY', 'LUBANG 1944'),
    makeDocTex('LEAFLET DROP', 'ALLIED COMMAND 1945', 'SURRENDER'),
    makeDocTex('FINAL ORDER', 'MAJ. TANIGUCHI 1974', 'STAND DOWN')
  ];

  const pins = [[-1.1, 1.3], [0.95, 1.4], [0.0, -0.4]];
  pins.forEach(([x, y], i) => {
    const ph = new THREE.Mesh(new THREE.PlaneGeometry(1.05, 1.25), std('#FFFFFF', 0.6, { map: docs[i] }));
    ph.position.set(x, y - 0.45, 0.03 + i * 0.005);
    ph.rotation.z = (i % 2 ? 0.06 : -0.05);
    ph.castShadow = true;
    scene.add(ph);

    // Red Pushpin
    const pin = new THREE.Mesh(new THREE.SphereGeometry(0.045, 16, 12), std('#D42020', 0.25));
    pin.position.set(x, y, 0.07);
    scene.add(pin);
  });

  // Red Investigation String
  const strM = new THREE.MeshStandardMaterial({ color: '#D42020', roughness: 0.5, emissive: '#5A0A0A', emissiveIntensity: 0.5 });
  const pA = new THREE.Vector3(pins[0][0], pins[0][1], 0.08);
  const pB = new THREE.Vector3(pins[1][0], pins[1][1], 0.08);
  const pC = new THREE.Vector3(pins[2][0], pins[2][1], 0.08);
  const c1 = new THREE.QuadraticBezierCurve3(pA, pA.clone().lerp(pB, 0.5).add(V3(0, -0.12, 0.04)), pB);
  const c2 = new THREE.QuadraticBezierCurve3(pB, pB.clone().lerp(pC, 0.5).add(V3(0, -0.15, 0.04)), pC);
  scene.add(new THREE.Mesh(new THREE.TubeGeometry(c1, 20, 0.012, 6), strM));
  scene.add(new THREE.Mesh(new THREE.TubeGeometry(c2, 20, 0.012, 6), strM));

  const spot = new THREE.SpotLight('#FFE8C0', 28, 9, 0.55, 0.5, 1.2);
  spot.position.set(0.4, 1.2, 3.8);
  spot.target.position.set(0, 0.2, 0);
  spot.castShadow = true;
  scene.add(spot, spot.target);

  scene.add(new THREE.HemisphereLight('#3A2A20', '#000000', 0.3));

  return { scene };
}

// ── Build Shots ─────────────────────────────────────────────────────────────

export function buildShots(E) {
  const S = [], CUES = [], add = (o) => (S.push(o), o);
  const cue = (t, type, o = {}) => CUES.push({ t: +t.toFixed(3), type, ...o });
  const cut = (i) => (i === 0 ? 0 : L(i) - 0.1);
  const cam = camera(34);

  // 1. Build Sets
  const JUNGLE = makeJungleSet();
  const BUNKER = makeBunkerSet();
  const CASE_WALL = makeCaseWallSet();

  // 2. Build Cast
  const onoda = createSoldier({ officer: false });
  const officer = createSoldier({ officer: true });

  // Add characters to primary scenes
  JUNGLE.scene.add(onoda.group, officer.group);
  BUNKER.scene.add(onoda.group);

  // Helper: Setup rifle attachment
  const equipRifleHand = (soldier) => {
    soldier.rifle.removeFromParent();
    soldier.rifle.position.set(0.02, -0.22, 0.12);
    soldier.rifle.rotation.set(-Math.PI / 2.6, 0.1, 0);
    soldier.arm.R.el.add(soldier.rifle);
  };

  const equipRifleBack = (soldier) => {
    soldier.rifle.removeFromParent();
    soldier.rifle.position.set(-0.06, 0.3, -0.18);
    soldier.rifle.rotation.set(0.1, 0, -Math.PI / 3.2);
    soldier.spine.add(soldier.rifle);
  };

  // Helper: Camera & Render
  const render = (scene, focusP, extra = {}) => {
    if (cam.fov !== (extra.fov || 34)) { cam.fov = extra.fov || 34; cam.updateProjectionMatrix(); }
    E.render(scene, cam, { ...NIGHT, focus: cam.position.distanceTo(focusP), aperture: 0.0012, ...extra });
  };

  // Default Soldier Poses
  const poseAttention = (h, x, z, ry = 0) => {
    h.group.position.set(x, 0, z); h.group.rotation.set(0, ry, 0);
    h.hips.position.y = 0;
    h.pose({
      spine: [2, 0, 0], head: [0, 0, 0],
      shL: [4, 0, 4], elL: 12,
      shR: [4, 0, 4], elR: 12,
      hipL: [0, 0, 2], knL: 2,
      hipR: [0, 0, 2], knR: 2,
    });
  };

  const poseRifleCarry = (h, x, z, ry = 0) => {
    h.group.position.set(x, 0, z); h.group.rotation.set(0, ry, 0);
    equipRifleHand(h);
    h.pose({
      spine: [6, 0, 0], head: [-4, 0, 0],
      shR: [45, 0, 8], elR: 65,
      shL: [25, -15, 6], elL: 45,
      hipL: [2, 0, 2], knL: 4,
      hipR: [2, 0, 2], knR: 4,
    });
  };

  // ═════════════════════════════ SHOT LIST ═════════════════════════════

  // ── S01 · "In 1945, World War Two ended." ────────────────────────────────
  add({ id: 'S01', at: 0, note: 'bunker strategy table with Philippines map; radio waves & 1945 stamp', draw(lt, d, t, blit) {
    onoda.group.visible = officer.group.visible = false;
    cam.position.copy(lerpV(V3(0.3, 2.2, -1.8), V3(0.0, 1.85, -2.5), eio(lt / d)));
    cam.lookAt(0, 0.9, -3.8);
    render(BUNKER.scene, V3(0, 0.9, -3.8), { ...BUNKER_LOOK });
    blit();
    K.dateStamp('AUG 15, 1945', 'WORLD WAR TWO ENDS', clamp(lt / 1.4), 90, 320);
  } });
  cue(0.3, 'tock', { gain: 0.4 });

  // ── S02 · "Nobody told Hiroo Onoda." ─────────────────────────────────────
  // REVEAL: Full 3D soldier in uniform with Army cap, standing in dark jungle
  { const st = cut(1), wh = Wd('Onoda', 1);
    add({ id: 'S02', at: st, note: 'close push-in on 3D Soldier Onoda in uniform & field cap', draw(lt, d, t, blit) {
      officer.group.visible = false;
      onoda.group.visible = true;
      equipRifleHand(onoda);
      poseRifleCarry(onoda, 0, -3.8, Math.PI * 0.95);

      // Camera pushes in toward Onoda's weathered soldier face and uniform
      cam.position.copy(lerpV(V3(0.35, 1.65, -1.8), V3(0.12, 1.55, -2.5), eio(lt / d)));
      cam.lookAt(0, 1.45, -3.8);
      render(JUNGLE.scene, V3(0, 1.45, -3.8), { ...JUNGLE_LOOK, aperture: 0.0015 });
      blit();

      K.dateStamp('2ND LT. ONODA', 'LUBANG ISLAND · PHILIPPINES', clamp(lt / 1.2), 90, 320);
    } });
    cue(st, 'tock', { gain: 0.35 }); cue(wh - 0.05, 'tock', { gain: 0.5 }); }

  // ── S03 · "He was a Japanese soldier posted to a small island..." ────────
  { const st = cut(2);
    add({ id: 'S03', at: st, note: 'case wall slow drift across military dossier & reconnaissance map', draw(lt, d, t, blit) {
      cam.position.copy(lerpV(V3(-0.35, 0.45, 9.5), V3(0.1, 0.25, 7.6), eio(lt / d)));
      cam.lookAt(0, 0.2, 0);
      render(CASE_WALL.scene, V3(0, 0.2, 0), { bloom: 0.5 });
      blit();
      K.dateStamp('DECEMBER 1944', 'ASSIGNED: LUBANG ISLAND', clamp(lt / 1.2), 90, 320);
    } });
    cue(st, 'whoosh', { gain: 0.4 }); }

  // ── S04 · "His orders were simple: never surrender." ─────────────────────
  // Major Taniguchi briefs Onoda in the bunker
  { const st = cut(3), ws = Wd('surrender', 3);
    add({ id: 'S04', at: st, note: 'bunker: commanding officer issues secret order to Onoda at attention', draw(lt, d, t, blit) {
      onoda.group.visible = officer.group.visible = true;
      equipRifleBack(onoda);
      poseAttention(onoda, 0.65, -3.8, -Math.PI * 0.65);

      // Officer facing him across table
      officer.group.position.set(-0.65, 0, -3.8);
      officer.group.rotation.set(0, Math.PI * 0.65, 0);
      officer.hips.position.y = 0;
      officer.pose({ spine: [4, 0, 0], head: [2, 0, 0], shR: [35, 0, 10], elR: 35, shL: [10, 0, 4], elL: 10 });

      cam.position.copy(lerpV(V3(0.2, 1.7, -1.4), V3(0.15, 1.55, -2.1), eio(lt / d)));
      cam.lookAt(0, 1.3, -3.8);
      render(BUNKER.scene, V3(0, 1.3, -3.8), { ...BUNKER_LOOK });
      blit();

      if (lt > 0.4) {
        K.dateStamp('SECRET ORDER', 'NEVER SURRENDER', clamp((lt - 0.4) / 0.8), 90, 320);
      }
    } });
    cue(st, 'whoosh', { gain: 0.4 }); cue(ws, 'thud', { gain: 0.6 }); }

  // ── S05 · "So when the war ended, he kept fighting." ─────────────────────
  // Patrol through dark jungle with rifle ready
  { const st = cut(4), wf = Wd('fighting', 4);
    add({ id: 'S05', at: st, note: 'Onoda patrols stealthily through dense Philippine bamboo', draw(lt, d, t, blit) {
      officer.group.visible = false;
      onoda.group.visible = true;
      equipRifleHand(onoda);

      const pX = lerp(-1.8, 1.2, eio(lt / d));
      onoda.group.position.set(pX, 0, -4.0);
      onoda.group.rotation.set(0, Math.PI / 2, 0);
      onoda.walk(lt * 4.2, 0.7);

      cam.position.copy(lerpV(V3(-2.2, 1.55, -0.8), V3(1.6, 1.45, -1.0), eio(lt / d)));
      cam.lookAt(pX, 1.1, -4.0);
      render(JUNGLE.scene, V3(pX, 1.1, -4.0), { ...JUNGLE_LOOK });
      blit();
    } });
    cue(st, 'whoosh', { gain: 0.4 }); cue(wf, 'tock', { gain: 0.45 }); }

  // ── S06 · "For twenty-nine years." ───────────────────────────────────────
  // Giant archival text over the case board
  { const st = cut(5), wy = Wd('years', 5);
    add({ id: 'S06', at: st, note: 'dossier wall with bold 29 YEARS graphic', draw(lt, d, t, blit) {
      cam.position.copy(lerpV(V3(0.3, 0.35, 9.2), V3(0.0, 0.15, 6.8), eio(lt / d)));
      cam.lookAt(0, 0.2, 0);
      render(CASE_WALL.scene, V3(0, 0.2, 0), { bloom: 0.55 });
      blit();

      const p = clamp(lt / 0.7);
      ctx.save();
      ctx.globalAlpha = p;
      ctx.shadowColor = 'rgba(0,0,0,0.9)'; ctx.shadowBlur = 24;
      ctx.font = '900 150px FreeMono'; ctx.fillStyle = '#CC1111';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('29 YEARS', W / 2, H * 0.42);

      ctx.font = '700 68px FreeMono'; ctx.fillStyle = '#EAE3D2';
      ctx.fillText('1945 — 1974', W / 2, H * 0.54);

      ctx.strokeStyle = '#CC1111'; ctx.lineWidth = 8;
      ctx.strokeRect(W / 2 - 420, H * 0.32, 840, 480);
      ctx.restore();
    } });
    cue(st, 'tock', { gain: 0.6 }); cue(wy, 'slam', { gain: 0.85 }); }

  // ── S07 · "He found leaflets dropped from planes saying the war was over."
  { const st = cut(6), wo = Wd('over', 6);
    add({ id: 'S07', at: st, note: 'Onoda kneeling examining Allied surrender leaflet', draw(lt, d, t, blit) {
      officer.group.visible = false;
      onoda.group.visible = true;
      equipRifleBack(onoda);

      onoda.group.position.set(0, 0, -3.8);
      onoda.group.rotation.set(0, Math.PI * 0.9, 0);
      // Crouching / examining pose
      onoda.hips.position.y = 0.52;
      onoda.pose({
        spine: [24, 0, 0], head: [-18, 0, 0],
        hipL: [68, 0, 2], knL: 85,
        hipR: [68, 0, 2], knR: 85,
        shL: [45, 0, 8], elL: 55,
        shR: [45, 0, 8], elR: 55
      });

      cam.position.copy(lerpV(V3(0.3, 1.4, -1.8), V3(0.1, 1.25, -2.4), eio(lt / d)));
      cam.lookAt(0, 0.75, -3.8);
      render(JUNGLE.scene, V3(0, 0.75, -3.8), { ...JUNGLE_LOOK });
      blit();

      // Authentic reproduction of Allied Surrender Leaflet (2D overlay)
      const fall = clamp(lt / 0.55);
      const py = lerp(200, 780, eob(fall));
      if (fall > 0) {
        ctx.save();
        ctx.translate(W * 0.5, py);
        ctx.rotate(-0.05);
        ctx.shadowColor = 'rgba(0,0,0,0.85)'; ctx.shadowBlur = 35;
        rr(-300, -180, 600, 360, 10);
        ctx.fillStyle = '#E8DEC4'; ctx.fill();
        ctx.shadowBlur = 0;

        ctx.strokeStyle = '#1A1815'; ctx.lineWidth = 3;
        ctx.strokeRect(-280, -160, 560, 320);

        ctx.font = '900 44px FreeMono'; ctx.fillStyle = '#111'; ctx.textAlign = 'center';
        ctx.fillText('CEASE FIRE ORDER', 0, -85);

        ctx.font = '700 32px FreeMono'; ctx.fillStyle = '#8E1D1A';
        ctx.fillText('JAPAN HAS SURRENDERED', 0, -25);

        ctx.font = '600 24px FreeMono'; ctx.fillStyle = '#333';
        ctx.fillText('The war ended August 15, 1945.', 0, 30);
        ctx.fillText('Come down from the mountains.', 0, 68);

        ctx.font = '700 20px FreeMono'; ctx.fillStyle = '#666';
        ctx.fillText('-- GENERAL HEADQUARTERS --', 0, 120);

        ctx.restore();

        if (lt > wo - st) {
          K.redCircle(W * 0.5, py - 25, 260, 48, seg(lt, wo - st, wo - st + 0.45));
        }
      }
    } });
    cue(st, 'whoosh', { gain: 0.4 }); cue(st + 0.5, 'tock', { gain: 0.35 }); cue(wo, 'tock', { gain: 0.5 }); }

  // ── S08 · "He thought they were propaganda." ──────────────────────────────
  { const st = cut(7), wp = Wd('propaganda', 7);
    add({ id: 'S08', at: st, note: 'case file stamp: DISMISSED AS ENEMY PROPAGANDA', draw(lt, d, t, blit) {
      cam.position.copy(lerpV(V3(0, 0.4, 8.8), V3(0, 0.25, 7.2), eio(lt / d)));
      cam.lookAt(0, 0.2, 0);
      render(CASE_WALL.scene, V3(0, 0.2, 0), { bloom: 0.45, exposure: 0.95 });
      blit();

      K.caseFile(540, lerp(1500, 830, eob(clamp(lt / 0.5))), 1.25, 'INTELLIGENCE REPORT: 1945', lt > wp - st ? seg(lt, wp - st, wp - st + 0.3) : 0, -0.04);
      if (lt > 0.5) {
        ctx.save();
        ctx.font = '900 46px FreeMono'; ctx.fillStyle = '#CC1111';
        ctx.textAlign = 'center'; ctx.globalAlpha = clamp((lt - 0.5) / 0.4);
        ctx.fillText('VERDICT: ENEMY TRICK', W * 0.5, 1160);
        ctx.font = '700 32px FreeMono'; ctx.fillStyle = '#EAE3D2';
        ctx.fillText('CONTINUE GUERRILLA WARFARE', W * 0.5, 1220);
        ctx.restore();
      }
    } });
    cue(st, 'whoosh', { gain: 0.4 }); cue(wp, 'thud', { gain: 0.65 }); }

  // ── S09 · "His family flew overhead calling through a loudspeaker." ───────
  // Night sky through jungle canopy with search beam
  { const st = cut(8), wl = Wd('loudspeaker', 8);
    add({ id: 'S09', at: st, note: 'searchlight sweeping through tropical canopy, family broadcast', draw(lt, d, t, blit) {
      officer.group.visible = false;
      onoda.group.visible = true;
      equipRifleHand(onoda);
      poseRifleCarry(onoda, 0, -3.8, Math.PI);
      onoda.pose({ head: [-35, 0, 0] }); // Looking up at sky

      // Camera looks up through canopy
      cam.position.copy(lerpV(V3(0.4, 0.8, -2.4), V3(0.0, 0.9, -2.8), eio(lt / d)));
      cam.lookAt(0, 3.2, -4.5);
      render(JUNGLE.scene, V3(0, 3.2, -4.5), { ...JUNGLE_LOOK, exposure: 1.35 });
      blit();

      K.dateStamp('1959 SEARCH', 'AIRCRAFT LOUDSPEAKER', clamp(lt / 1.2), 90, 320);

      // Soundwaves graphic radiating from sky
      const pulse = (t * 3.5) % 1;
      ctx.save();
      ctx.strokeStyle = `rgba(240, 215, 160, ${1 - pulse})`;
      ctx.lineWidth = 6;
      ctx.beginPath(); ctx.arc(W / 2, 380, 80 + pulse * 280, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(W / 2, 380, 140 + pulse * 280, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    } });
    cue(st, 'whoosh', { gain: 0.4 }); cue(wl, 'tock', { gain: 0.4 }); }

  // ── S10 · "He did not come out." ─────────────────────────────────────────
  // Onoda turns and disappears into the impenetrable jungle
  { const st = cut(9), wout = Wd('out', 9);
    add({ id: 'S10', at: st, note: 'Onoda slips back into the deep jungle shadows', draw(lt, d, t, blit) {
      officer.group.visible = false;
      onoda.group.visible = true;
      equipRifleHand(onoda);

      const zWalk = lerp(-3.5, -6.5, eio(lt / d));
      onoda.group.position.set(0, 0, zWalk);
      onoda.group.rotation.set(0, 0, 0); // Back to camera
      onoda.walk(lt * 3.6, 0.6);

      cam.position.copy(lerpV(V3(0, 1.45, -0.8), V3(0, 1.35, -1.8), eio(lt / d)));
      cam.lookAt(0, 1.1, -6.5);
      render(JUNGLE.scene, V3(0, 1.1, -6.5), { ...JUNGLE_LOOK });
      blit();
    } });
    cue(st, 'tock', { gain: 0.4 }); cue(wout, 'tock', { gain: 0.6 }); }

  // ── S11 · "It was not until 1974 that his former commanding officer..." ──
  { const st = cut(10), wy2 = Wd('1974', 10);
    add({ id: 'S11', at: st, note: 'case wall: Major Taniguchi mission document 1974', draw(lt, d, t, blit) {
      cam.position.copy(lerpV(V3(-0.3, 0.4, 9.0), V3(0.05, 0.2, 7.2), eio(lt / d)));
      cam.lookAt(0, 0.2, 0);
      render(CASE_WALL.scene, V3(0, 0.2, 0), { bloom: 0.5 });
      blit();
      K.dateStamp('MARCH 9, 1974', 'COMMANDER ARRIVES: LUBANG', clamp(lt / 1.2), 90, 320);
    } });
    cue(st, 'tock', { gain: 0.35 }); cue(wy2, 'tock', { gain: 0.7 }); }

  // ── S12 · "stood in the jungle, and ordered him to stop." ─────────────────
  // Taniguchi stands in clearing reading the surrender scroll
  { const st = cut(11), wstop = Wd('stop', 11);
    add({ id: 'S12', at: st, note: 'Major Taniguchi standing in jungle clearing reading cease-fire order', draw(lt, d, t, blit) {
      onoda.group.visible = false;
      officer.group.visible = true;

      officer.group.position.set(0, 0, -3.8);
      officer.group.rotation.set(0, Math.PI, 0);
      officer.hips.position.y = 0;
      officer.pose({
        spine: [2, 0, 0], head: [-6, 0, 0],
        shL: [45, -15, 6], elL: 55,
        shR: [45, 15, -6], elR: 55
      });

      cam.position.copy(lerpV(V3(0.3, 1.6, -1.6), V3(0.0, 1.45, -2.4), eio(lt / d)));
      cam.lookAt(0, 1.2, -3.8);
      render(JUNGLE.scene, V3(0, 1.2, -3.8), { ...JUNGLE_LOOK, exposure: 1.3 });
      blit();

      K.dateStamp('ORDERS READ', 'CEASE ALL COMBAT OPERATIONS', clamp(lt / 1.1), 90, 320);
    } });
    cue(st, 'whoosh', { gain: 0.4 }); cue(wstop, 'thud', { gain: 0.7 }); }

  // ── S13 · "Onoda walked out of the trees, still in uniform, rifle in hand."
  // CLIMAX: Onoda steps out into the light, rifle carried cleanly, uniform intact
  { const st = cut(12), wout2 = Wd('out', 12);
    add({ id: 'S13', at: st, note: 'Onoda steps out of the dark bamboo into the clearing light', draw(lt, d, t, blit) {
      officer.group.visible = false;
      onoda.group.visible = true;
      equipRifleHand(onoda);

      const zWalk = lerp(-6.2, -2.8, eio(lt / d));
      onoda.group.position.set(0, 0, zWalk);
      onoda.group.rotation.set(0, Math.PI, 0);
      onoda.walk(lt * 4.0, 0.7);

      cam.position.copy(lerpV(V3(0.2, 1.65, 0.5), V3(0.0, 1.45, -0.6), eio(lt / d)));
      cam.lookAt(0, 1.25, zWalk);
      render(JUNGLE.scene, V3(0, 1.25, zWalk), { ...JUNGLE_LOOK, exposure: 1.35 });
      blit();

      K.dateStamp('SURRENDER ACCEPTED', 'RIFLE PRESENTED · 1974', clamp(lt / 1.0), 90, 320);
    } });
    cue(st, 'whoosh', { gain: 0.5 }); cue(wout2, 'tock', { gain: 0.6 }); }

  // ── S14 · "He had been fighting alone for twenty-nine years." ─────────────
  { const st = cut(13), wa = Wd('Alone', 13), wy3 = Wd('years', 13);
    add({ id: 'S14', at: st, note: 'case file closes; 29 YEARS ALONE in bold red', draw(lt, d, t, blit) {
      cam.position.copy(lerpV(V3(0.2, 0.25, 8.5), V3(0.0, 0.12, 6.7), eio(lt / d)));
      cam.lookAt(0, 0.1, 0);
      render(CASE_WALL.scene, V3(0, 0.1, 0), { bloom: 0.55, exposure: 0.95 });
      blit();

      K.caseFile(540, lerp(1500, 830, eob(clamp(lt / 0.4))), 1.3, 'CASE CLOSED: MARCH 1974', lt > wa - st ? seg(lt, wa - st, wa - st + 0.3) : 0, -0.04);

      if (lt > wy3 - st) {
        const p = clamp((lt - (wy3 - st)) / 0.55);
        ctx.save();
        ctx.globalAlpha = p;
        ctx.shadowColor = 'rgba(0,0,0,0.95)'; ctx.shadowBlur = 28;
        ctx.font = '900 106px FreeMono'; ctx.fillStyle = '#CC1111';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('29 YEARS ALONE', W / 2, H * 0.68);
        ctx.restore();
      }
    } });
    cue(st, 'whoosh', { gain: 0.6 }); cue(st + 0.4, 'thud', { gain: 0.5 }); cue(wa, 'slam'); cue(wy3, 'tock', { gain: 0.9 }); }

  return { shots: S, cues: CUES };
}
