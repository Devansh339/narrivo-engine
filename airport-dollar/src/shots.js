// THE MAN WHO BOUGHT AN ENTIRE AIRPORT FOR $1 — Tall Tale 3D shot list
// Hook: open on the punch-line ("bought an entire AIRPORT"), then rewind and explain.
// Sets: main street (shops including MANSTON AIRPORT facade), interior (bare terminal), meadow (sunset reveal).
import * as THREE from 'three';
import { ctx, clamp, lerp, seg, eo, eio, eob } from './core/lib.js';
import { L, Wd, T } from './core/timing.js';
import { camera } from './core/engine.js';
import * as WD from './core/world.js';
import * as PR from './core/props.js';
import { Toon, PROPS } from './core/toon.js';

const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const mix = (a, b, k) => a.clone().lerp(b, k);
const talk = (t, on = 1) => (on ? 0.25 + 0.75 * Math.abs(Math.sin(t * 13)) * (0.6 + 0.4 * Math.sin(t * 5.3)) : 0);
const blink = (t, off = 0) => (((t + off) % 3.3) < 0.12 ? 1 : 0);

// ── Cast ────────────────────────────────────────────────────────────────────
const LOOK = {
  charlie:  { body: '#3E5FA8', hat: 'bowler', hatCol: '#1F2E5A', neck: 'tie', neckCol: '#E2B33C', pattern: 'vest', patCol: '#2B3E6A', extra: ['mustache'] },
  owner:    { body: '#B5553C', hat: 'tophat', hatCol: '#3A1F10', neck: 'bowtie', neckCol: '#D8343F', pattern: 'vest', patCol: '#3A1F10', extra: ['monocle', 'mustache'], dots: 1 },
  clerk:    { body: '#4FB3A9', hat: 'visor', hatCol: '#2F8F5B', neck: 'collar', pattern: 'vest', patCol: '#2B5E73', extra: ['pencil'] },
  pilot:    { body: '#4A4560', hat: 'cap', hatCol: '#1A1A30', neck: 'tie', neckCol: '#E2B33C', extra: ['glasses'] },
  bystander:{ body: '#E58A6A', hat: 'beanie', hatCol: '#7A4A2E' },
};
const person = (k, opts) => new Toon({ ...LOOK[k], extra: [...(LOOK[k].extra || [])] }, opts);

export function buildShots(E) {
  const S = [], CUES = [], add = (o) => (S.push(o), o), cue = (t, type, o = {}) => CUES.push({ t: +t.toFixed(3), type, ...o });
  const cut = (i) => (i === 0 ? 0 : L(i) - 0.06);
  const cam = camera(36);
  const LOOKS = {
    street: { bloom: 0.15, aperture: 0.0012, maxblur: 0.008 },
    room:   { bloom: 0.3,  aperture: 0.001,  maxblur: 0.008 },
    field:  { bloom: 0.25, aperture: 0.001,  maxblur: 0.007 },
    wide:   { bloom: 0.2,  aperture: 0.0008, maxblur: 0.005, fov: 50 },
  };
  const shoot = (scene, people, from, to, at, at2, k, look, focus) => {
    if (cam.fov !== (look.fov || 36)) { cam.fov = look.fov || 36; cam.updateProjectionMatrix(); }
    cam.position.copy(mix(from, to, k)); cam.lookAt(at2 ? mix(at, at2, k) : at);
    people.forEach((p) => p.face(cam));
    E.render(scene, cam, { ...look, focus: focus ?? cam.position.distanceTo(at2 ? mix(at, at2, k) : at) });
  };

  // ── Set 1: Main Street with MANSTON AIRPORT facade ──────────────────────
  const SHOP_ORDER = [
    ['BAKERY',           '#C9603F', 'brick', '#D8343F'],
    ['GENERAL STORE',    '#6FA3B8', 'wood',  null],
    ['GRAND HOTEL',      '#9E4A3A', 'brick', null],
    ['MANSTON AIRPORT',  '#3E5FA8', 'brick', '#E2B33C'],  // the star
    ['HARDWARE',         '#B5553C', 'brick', '#F2C230'],
    ['BANK',             '#C7B79A', 'brick', null],
    ['CAFE',             '#E58A6A', 'wood',  '#2E4E3F'],
    ['PHARMACY',         '#5FA39A', 'wood',  '#D8343F'],
  ];
  const ST = WD.mainStreet(E, { shops: SHOP_ORDER });
  ST.sun.key.target.position.set(-4, 0, 0); ST.sun.key.position.set(5, 13, 6);
  const AP = ST.buildings.find((b) => b.name === 'MANSTON AIRPORT');   // airport facade

  const stCharlie  = person('charlie');
  const stOwner    = person('owner');
  const stPilot    = person('pilot');
  const stBystander = person('bystander');
  [stCharlie, stOwner, stPilot, stBystander].forEach((p) => ST.scene.add(p.group));

  // a few parcels near the airport for texture
  const piles = [];
  for (let i = 0; i < 4; i++) {
    const p = PR.parcel(0.5 + (i % 2) * 0.12, 0.3, 0.4);
    p.position.set(AP.x - 1.2 + i * 0.6, 0.18, AP.z - 1.4);
    p.rotation.y = i * 0.5;
    ST.scene.add(p); piles.push(p);
  }
  const streetPeople = () => [...ST.people, stCharlie, stOwner, stPilot, stBystander];

  // ── Set 2: Interior (bare terminal / office) ─────────────────────────────
  const IN = WD.interior(E, {
    wall: '#C7B79A', motif: 'wallpaper', floor: '#8A7A6A', ceiling: '#E0D8CC',
    view: null, signText: 'DEPARTURES', counterOn: true,
  });
  const inCharlie = person('charlie');
  const inOwner   = person('owner');
  const inClerk   = person('clerk');
  [inCharlie, inOwner, inClerk].forEach((p) => IN.scene.add(p.group));
  const inPeople = [inCharlie, inOwner, inClerk];

  // desk prop (contract poster on the wall)
  const contract = PR.poster(['MANSTON', 'AIRPORT', 'SALE', 'AGREEMENT'], { w: 1.4, h: 1.8 });
  contract.position.set(2.0, 1.8, -4.8); contract.rotation.y = 0.0;
  IN.scene.add(contract);

  // signing desk
  const signingDesk = PR.desk(2.0);
  signingDesk.position.set(1.8, 0, -3.2);
  IN.scene.add(signingDesk);

  // ── Set 3: Meadow (sunset — reveal ending) ──────────────────────────────
  const MD = WD.meadow(E, { sunset: true, fenceOn: true });
  const mdCharlie = person('charlie');
  MD.scene.add(mdCharlie.group);

  // ── Shot helpers ─────────────────────────────────────────────────────────
  // Draw big "£1" overlay stamp
  const drawPoundStamp = (t, triggerT, cx = 540, cy = 700, rot = -0.12) => {
    const sp = clamp((t - triggerT) / 0.22);
    if (sp <= 0) return;
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(rot);
    const sc = lerp(2.4, 1, eo(sp)); ctx.scale(sc, sc); ctx.globalAlpha = Math.min(1, sp * 1.5);
    ctx.strokeStyle = '#C8283A'; ctx.lineWidth = 16;
    ctx.beginPath(); ctx.roundRect(-210, -105, 420, 210, 24); ctx.stroke();
    ctx.fillStyle = '#C8283A'; ctx.font = '900 130px Inter'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('£1', 0, 0);
    ctx.restore();
  };

  // ── S1 · "A man once walked into a room and bought an entire airport." ──
  // HOOK: punch-in on the airport facade — camera rushes in fast
  { const st = cut(0), wair = Wd('airport', 0);
    add({ id: 'S1', at: st, note: 'HOOK — camera rockets toward MANSTON AIRPORT sign; Charlie walks up smug', draw(lt, d, t, blit) {
      const k = eio(clamp(lt / d));
      stCharlie.at(AP.x - 1.8, 0.18, AP.z - 0.5);
      stCharlie.set({ mood: t > wair ? 'smug' : 'neutral', armL: [20, 0], armR: [60, 20], blink: blink(t), talk: talk(t), legs: 'walk', phase: t * 2 });
      stOwner.at(AP.x + 1.8, 0.18, AP.z - 0.5);
      stOwner.set({ mood: 'worried', armL: [80, -20], armR: [20, 0], blink: blink(t, 1.1) });
      // rocket push-in toward the airport sign
      shoot(ST.scene, streetPeople(),
        V3(AP.x - 1, 2.8, AP.z + 12),   // from: far back
        V3(AP.x - 0.4, 1.9, AP.z + 3.5), // to: close up on sign
        V3(AP.x, 2.2, AP.z - 2), null, k, LOOKS.street);
      blit();
    } });
    cue(st, 'whoosh'); cue(wair, 'boing'); }

  // ── S2 · "For one dollar." ───────────────────────────────────────────────
  { const st = cut(1), wdol = Wd('dollar', 1);
    add({ id: 'S2', at: st, note: 'tight punch-in on Charlies smug face; L1 stamp slams on screen', draw(lt, d, t, blit) {
      const k = eio(clamp(lt / d));
      stCharlie.at(AP.x - 1.8, 0.18, AP.z - 0.5);
      stCharlie.set({ mood: 'smug', armL: [30, 0], armR: [70, -20], blink: blink(t), talk: talk(t) });
      shoot(ST.scene, streetPeople(),
        V3(AP.x - 1.6, 1.8, AP.z + 3.0),
        V3(AP.x - 1.6, 1.65, AP.z + 2.0),
        V3(AP.x - 1.8, 1.4, AP.z - 0.5), null, k, LOOKS.street);
      blit();
      drawPoundStamp(t, wdol - 0.1);
    } });
    cue(st, 'whoosh'); cue(wdol - 0.1, 'stamp', { gain: 1 }); cue(wdol, 'slam', { gain: 0.8 }); }

  // ── S3 · "No, seriously." ────────────────────────────────────────────────
  { const st = cut(2);
    add({ id: 'S3', at: st, note: 'wide street shot; bystander does double-take at the sign', draw(lt, d, t, blit) {
      const k = eio(clamp(lt / d));
      stBystander.at(AP.x + 3.0, 0.18, AP.z - 0.5);
      stBystander.set({ mood: t > st + 0.5 ? 'shock' : 'neutral', armL: [20, 0], armR: [80, 20], blink: blink(t, 0.5) });
      stCharlie.at(AP.x - 1.6, 0.18, AP.z - 0.5);
      stCharlie.set({ mood: 'smug', talk: talk(t), blink: blink(t) });
      shoot(ST.scene, streetPeople(),
        V3(AP.x + 2, 2.0, AP.z + 8),
        V3(AP.x + 1, 1.8, AP.z + 6),
        V3(AP.x, 1.5, AP.z - 1.5), null, k, { ...LOOKS.street, ...LOOKS.wide });
      blit();
    } });
    cue(st, 'whoosh'); cue(st + 0.5, 'pop'); }

  // ── S4 · "See, in 2014, a British airport called Manston went bankrupt." ─
  { const st = cut(3), wmans = Wd('Manston', 3), wbank = Wd('bankrupt', 3);
    add({ id: 'S4', at: st, note: 'crane-down on Manston sign; owner looks panicked, sign flickers', draw(lt, d, t, blit) {
      const k = eio(clamp(lt / d));
      stOwner.at(AP.x + 0.4, 0.18, AP.z - 0.5);
      stOwner.set({ mood: t > wbank ? 'shock' : 'worried', armL: [t > wbank ? 150 : 60, 20], armR: [20, 0], blink: blink(t), talk: talk(t), sweat: t > wbank });
      shoot(ST.scene, streetPeople(),
        V3(AP.x + 0.5, 5.5, AP.z + 7),   // crane-down from above
        V3(AP.x + 0.5, 2.0, AP.z + 5),
        V3(AP.x, 2.0, AP.z - 1.5), null, k, LOOKS.street);
      blit();
    } });
    cue(st, 'whoosh'); cue(wmans, 'plop'); cue(wbank, 'boing'); }

  // ── S5 · "Runways, terminals, hangars — the whole thing." ────────────────
  { const st = cut(4), wrun = Wd('Runways', 4);
    add({ id: 'S5', at: st, note: 'slow pan along airport facade; pilot stands idle, arms out helplessly', draw(lt, d, t, blit) {
      const k = eio(clamp(lt / d));
      stPilot.at(AP.x - 2.5, 0.18, AP.z - 0.6);
      stPilot.set({ mood: 'sad', armL: [110, 40], armR: [110, -40], blink: blink(t, 0.8) });
      // pan left to right along the whole airport frontage
      shoot(ST.scene, streetPeople(),
        V3(AP.x - 4, 1.9, AP.z + 6),
        V3(AP.x + 4, 1.9, AP.z + 6),
        V3(AP.x, 1.5, AP.z - 1.5), null, k, LOOKS.street);
      blit();
    } });
    cue(st, 'whoosh'); cue(wrun, 'chirp', { dur: 1.5, gain: 0.3 }); }

  // ── S6 · "The owners tried to sell it." ──────────────────────────────────
  { const st = cut(5), wsell = Wd('sell', 5);
    add({ id: 'S6', at: st, note: 'interior: owner at desk, shoves contract forward looking desperate', draw(lt, d, t, blit) {
      const k = eio(clamp(lt / d));
      inOwner.at(3.55, 0, -3.0);
      inOwner.set({ mood: t > wsell ? 'worried' : 'neutral', armL: [80, -40], armR: [t > wsell ? 140 : 50, -20], blink: blink(t), talk: talk(t) });
      inClerk.at(1.0, 0, -3.0);
      inClerk.set({ mood: 'neutral', armL: [20, 0], armR: [20, 0], blink: blink(t, 0.9) });
      shoot(IN.scene, inPeople,
        V3(0.5, 1.9, -0.5), V3(0.8, 1.75, -1.0),
        V3(2.5, 1.5, -3.0), null, k, LOOKS.room);
      blit();
    } });
    cue(st, 'whoosh'); cue(wsell, 'plop'); }

  // ── S7 · "Nobody wanted it." ─────────────────────────────────────────────
  { const st = cut(6), wnob = Wd('Nobody', 6);
    add({ id: 'S7', at: st, note: 'tight shot on the contract on desk — nobody is there; owner alone, sad', draw(lt, d, t, blit) {
      const k = eio(clamp(lt / d));
      inOwner.at(3.55, 0, -3.0);
      inOwner.set({ mood: 'sad', armL: [20, 0], armR: [20, 0], blink: blink(t), talk: talk(t), tears: t > wnob });
      inClerk.at(100, 0, 100); // hide clerk
      shoot(IN.scene, inPeople,
        V3(1.5, 2.1, 0.5), V3(1.8, 1.9, -0.3),
        V3(3.0, 1.4, -3.0), null, k, LOOKS.room);
      blit();
    } });
    cue(st, 'whoosh'); cue(wnob, 'plop'); }

  // ── S8 · "It sat there, empty, with planes going quiet one by one." ───────
  { const st = cut(7), wquiet = Wd('quiet', 7);
    add({ id: 'S8', at: st, note: 'wide street; pilot stands alone by the airport, shrugs; slow dolly out', draw(lt, d, t, blit) {
      const k = eio(clamp(lt / d));
      stPilot.at(AP.x - 0.5, 0.18, AP.z - 0.5);
      stPilot.set({ mood: t > wquiet ? 'tired' : 'sad', armL: [t > wquiet ? 10 : 60, 20], armR: [t > wquiet ? 10 : 60, -20], blink: blink(t, 0.4) });
      // dolly out slowly
      shoot(ST.scene, streetPeople(),
        V3(AP.x, 2.2, AP.z + 5),
        V3(AP.x, 2.5, AP.z + 9),
        V3(AP.x, 1.6, AP.z - 1.5), null, k, LOOKS.street);
      blit();
    } });
    cue(st, 'whoosh'); cue(wquiet, 'plop', { gain: 0.6 }); }

  // ── S9 · "Then a millionaire named Charlie Sherwood showed up." ───────────
  { const st = cut(8), wcharlie = Wd('Charlie', 8), wshow = Wd('showed', 8);
    add({ id: 'S9', at: st, note: 'Charlie strides in from offscreen, confident; camera pushes in on him', draw(lt, d, t, blit) {
      const k = eio(clamp(lt / d));
      const walkX = lerp(AP.x + 10, AP.x - 1.6, clamp((t - st) / 1.2));
      stCharlie.at(walkX, 0.18, AP.z - 0.5);
      stCharlie.set({ mood: t > wshow ? 'smug' : 'happy', armL: [30, 0], armR: [30, 0], legs: t < wshow ? 'walk' : 'stand', phase: t * 2, blink: blink(t), talk: talk(t, t > wcharlie ? 1 : 0) });
      stOwner.at(AP.x + 1.0, 0.18, AP.z - 0.5);
      stOwner.set({ mood: 'neutral', blink: blink(t, 1) });
      shoot(ST.scene, streetPeople(),
        V3(AP.x + 2, 2.0, AP.z + 8),
        V3(AP.x - 0.5, 1.8, AP.z + 4),
        V3(AP.x - 0.5, 1.5, AP.z - 0.5), null, k, LOOKS.street);
      blit();
    } });
    cue(st, 'whoosh'); cue(wcharlie, 'pop'); cue(wshow, 'boing'); }

  // ── S10 · "And said: I'll take it." ──────────────────────────────────────
  { const st = cut(9), wtake = Wd('TAKE', 9);
    add({ id: 'S10', at: st, note: 'tight on Charlies face — huge smug grin; punch-in on TAKE IT', draw(lt, d, t, blit) {
      const k = eio(clamp(lt / d));
      stCharlie.at(AP.x - 1.6, 0.18, AP.z - 0.5);
      stCharlie.set({ mood: 'smug', armL: [20, 0], armR: [80, 30], blink: blink(t), talk: talk(t) });
      // punch-in hard on the word TAKE
      const pk = clamp((t - (wtake - 0.05)) / 0.15);
      shoot(ST.scene, streetPeople(),
        mix(V3(AP.x - 1.4, 1.75, AP.z + 3.5), V3(AP.x - 1.6, 1.6, AP.z + 1.8), pk),
        mix(V3(AP.x - 1.4, 1.75, AP.z + 3.5), V3(AP.x - 1.6, 1.6, AP.z + 1.8), pk),
        V3(AP.x - 1.8, 1.45, AP.z - 0.5), null, k, LOOKS.street);
      blit();
    } });
    cue(st, 'whoosh'); cue(wtake, 'boing', { gain: 1.2 }); }

  // ── S11 · "For one pound." ────────────────────────────────────────────────
  { const st = cut(10), wpound = Wd('POUND', 10);
    add({ id: 'S11', at: st, note: 'Charlie holds up a single coin; L1 stamp slams screen', draw(lt, d, t, blit) {
      const k = eio(clamp(lt / d));
      stCharlie.at(AP.x - 1.6, 0.18, AP.z - 0.5);
      stCharlie.set({ mood: 'smug', armL: [20, 0], armR: [130, 20], holdR: PROPS.rubberStamp, v: 'coin', blink: blink(t), talk: talk(t, t > wpound - 0.4 ? 1 : 0) });
      shoot(ST.scene, streetPeople(),
        V3(AP.x - 1.2, 1.9, AP.z + 2.8),
        V3(AP.x - 1.4, 1.75, AP.z + 2.0),
        V3(AP.x - 1.6, 1.4, AP.z - 0.5), null, k, LOOKS.street);
      blit();
      drawPoundStamp(t, wpound - 0.08);
    } });
    cue(st, 'whoosh'); cue(wpound - 0.08, 'stamp', { gain: 1 }); cue(wpound, 'slam', { gain: 0.9 }); }

  // ── S12 · "That's about a dollar." ───────────────────────────────────────
  { const st = cut(11), wdol2 = Wd('DOLLAR', 11);
    add({ id: 'S12', at: st, note: 'owners jaw drops open in shock; bystander covers mouth laughing', draw(lt, d, t, blit) {
      const k = eio(clamp(lt / d));
      stOwner.at(AP.x + 1.0, 0.18, AP.z - 0.5);
      stOwner.set({ mood: t > wdol2 ? 'shock' : 'worried', armL: [t > wdol2 ? 150 : 60, 0], armR: [20, 0], blink: blink(t, 0.3), sweat: t > wdol2 });
      stBystander.at(AP.x + 3.0, 0.18, AP.z - 0.5);
      stBystander.set({ mood: t > wdol2 ? 'laugh' : 'neutral', blink: blink(t, 1.2) });
      shoot(ST.scene, streetPeople(),
        V3(AP.x + 2, 1.9, AP.z + 5),
        V3(AP.x + 1.5, 1.8, AP.z + 3.5),
        V3(AP.x + 1.0, 1.4, AP.z - 0.5), null, k, LOOKS.street);
      blit();
    } });
    cue(st, 'whoosh'); cue(wdol2, 'boing'); }

  // ── S13 · "The owners said yes." ─────────────────────────────────────────
  { const st = cut(12), wyes = Wd('YES', 12);
    add({ id: 'S13', at: st, note: 'owner looks defeated, nods — Charlie looks delighted', draw(lt, d, t, blit) {
      const k = eio(clamp(lt / d));
      stOwner.at(AP.x + 1.0, 0.18, AP.z - 0.5);
      stOwner.set({ mood: t > wyes ? 'sad' : 'worried', armL: [20, 0], armR: [20, 0], blink: blink(t), talk: talk(t, t > wyes ? 1 : 0) });
      stCharlie.at(AP.x - 1.6, 0.18, AP.z - 0.5);
      stCharlie.set({ mood: t > wyes ? 'happy' : 'smug', armL: [30, 0], armR: [30, 0], blink: blink(t) });
      shoot(ST.scene, streetPeople(),
        V3(AP.x - 0.3, 2.0, AP.z + 6),
        V3(AP.x - 0.3, 1.85, AP.z + 4.5),
        V3(AP.x - 0.3, 1.5, AP.z - 0.5), null, k, LOOKS.street);
      blit();
    } });
    cue(st, 'whoosh'); cue(wyes, 'ding'); }

  // ── S14 · "So he signed the papers, handed over a single coin," ───────────
  { const st = cut(13), wsign = Wd('signed', 13), wcoin = Wd('coin', 13);
    add({ id: 'S14', at: st, note: 'interior: Charlie signs the contract at the desk, clerk witnesses', draw(lt, d, t, blit) {
      const k = eio(clamp(lt / d));
      inCharlie.at(1.0, 0, -3.0);
      inCharlie.set({ mood: t > wcoin ? 'smug' : 'neutral', armL: [30, -20], armR: [t > wsign ? 100 : 60, -40], holdR: PROPS.rubberStamp, v: t > wsign ? 's' : 'u', blink: blink(t), talk: talk(t) });
      inOwner.at(3.55, 0, -3.0);
      inOwner.set({ mood: 'sad', armL: [20, 0], armR: [20, 0], blink: blink(t, 0.7) });
      inClerk.at(100, 0, 100);
      shoot(IN.scene, inPeople,
        V3(0.2, 1.85, 0.0), V3(0.5, 1.7, -0.6),
        V3(2.3, 1.5, -3.0), null, k, LOOKS.room);
      blit();
    } });
    cue(st, 'whoosh'); cue(wsign, 'stamp', { gain: 0.8 }); cue(wcoin, 'plop'); }

  // ── S15 · "and walked out the owner of a full-sized international airport." ─
  { const st = cut(14), wown = Wd('owner', 14), wair2 = Wd('airport', 14);
    add({ id: 'S15', at: st, note: 'Charlie walks out the airport doors; camera cranes up triumphantly on airport', draw(lt, d, t, blit) {
      const k = eio(clamp(lt / d));
      const walkX = lerp(AP.x - 1.6, AP.x - 5, clamp((t - wown) / 1.0));
      stCharlie.at(walkX, 0.18, AP.z - 0.5);
      stCharlie.set({ mood: t > wair2 ? 'laugh' : 'happy', armL: [t > wown ? 140 : 20, 20], armR: [t > wown ? 140 : 20, -20], legs: t > wown ? 'walk' : 'stand', phase: t * 2, blink: blink(t), talk: talk(t) });
      // crane up on "airport"
      const cUp = clamp((t - wair2 + 0.2) / 0.4);
      shoot(ST.scene, streetPeople(),
        V3(AP.x - 1, lerp(2.0, 4.5, eo(cUp)), AP.z + 8),
        V3(AP.x - 1, lerp(2.0, 4.5, eo(cUp)), AP.z + 7),
        V3(AP.x, 1.5, AP.z - 1.5), null, k, LOOKS.street);
      blit();
    } });
    cue(st, 'whoosh'); cue(wown, 'boing'); cue(wair2, 'sparkle', { gain: 1 }); }

  // ── S16 · "Because sometimes the best deal in history costs less than a candy bar." ─
  { const st = cut(15), wdeal = Wd('deal', 15), wcandy = Wd('candy', 15);
    add({ id: 'S16', at: st, note: 'meadow sunset: Charlie stands alone, laughs; L1 overlay fades in', draw(lt, d, t, blit) {
      const k = eio(clamp(lt / d));
      mdCharlie.at(0, 0, -3);
      mdCharlie.set({ mood: t > wcandy ? 'laugh' : 'happy', armL: [t > wdeal ? 130 : 30, 20], armR: [t > wdeal ? 130 : 30, -20], blink: blink(t), talk: talk(t) });
      // crane down from wide to close
      shoot(MD.scene, [mdCharlie],
        V3(0, lerp(5, 2.5, eio(k)), 12),
        V3(0, lerp(5, 2.5, eio(k)), 8),
        V3(0, 1.4, -3), null, k, { ...LOOKS.field });
      blit();
      // big £1 fades in gently on "candy bar"
      const fp = clamp((t - wcandy + 0.3) / 0.5);
      if (fp > 0) {
        ctx.save(); ctx.globalAlpha = fp * 0.9;
        ctx.font = '900 100px Inter'; ctx.fillStyle = '#F2C230'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('£1 = $1 🤑', 540, 820);
        ctx.restore();
      }
    } });
    cue(st, 'whoosh'); cue(wdeal, 'sparkle', { gain: 0.8 }); cue(wcandy, 'ding', { gain: 1 }); }

  return { shots: S, cues: CUES };
}
