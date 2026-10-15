// Synthetic-frame tests for the detector and calibration math in index.html.
// Run: node tests/run.js
'use strict';
const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function block(name){
  const m = html.match(new RegExp('// @ldt-' + name + '-start([\\s\\S]*?)// @ldt-' + name + '-end'));
  if(!m) throw new Error('Marker block not found: ' + name);
  return m[1];
}
const lib = new Function(block('detector') + block('geom') + block('click') + block('aim') + block('analysis') + '\nreturn { createDetector, homographyToUnit, applyH, createClickDetector, aimCheck, analyzeReps };')();

let fails = 0;
function ok(cond, msg){ console.log((cond ? 'PASS ' : 'FAIL ') + msg); if(!cond) fails++; }

// --- Synthetic scene: white paper target with a black bull and a red ink mark on a dark wall ---
const W = 64, H = 48;
function frame(fill){
  const d = new Uint8ClampedArray(W * H * 4);
  for(let i = 0; i < W * H; i++){
    const px = fill(i % W, Math.floor(i / W));
    d[i * 4] = px[0]; d[i * 4 + 1] = px[1]; d[i * 4 + 2] = px[2]; d[i * 4 + 3] = 255;
  }
  return d;
}
const wall = (x, y) => (x > 8 && x < 56 && y > 6 && y < 42) ? [228, 228, 224] : [40, 42, 45];
const bull = (x, y) => Math.hypot(x - 32, y - 24) < 5 ? [20, 20, 20] : wall(x, y);
const scene = (x, y) => Math.hypot(x - 20, y - 30) < 3 ? [200, 40, 40] : bull(x, y);
function withDot(base, cx, cy, rad, rgbCore, rgbFringe){
  return (x, y) => {
    const r = Math.hypot(x - cx, y - cy);
    if(r < rad * 0.5) return rgbCore;
    if(r < rad) return rgbFringe;
    return base(x, y);
  };
}
const RED_CORE = [255, 245, 245], RED_FRINGE = [255, 90, 90];
const GREEN_CORE = [245, 255, 245], GREEN_FRINGE = [90, 255, 90];
const near = (b, x, y) => b && Math.abs(b.x - x) < 1.5 && Math.abs(b.y - y) < 1.5;
const at = b => b ? '(' + b.x.toFixed(1) + ', ' + b.y.toFixed(1) + ')' : 'null';

const det = lib.createDetector(W, H);
let res;
for(let i = 0; i < 20; i++) res = det.run(frame(scene), { sens: 60, color: 'red' });
ok(res.blob === null && !res.flooded, 'warm-up: static scene with red ink does not trigger');

res = det.run(frame(withDot(scene, 32, 24, 2.5, RED_CORE, RED_FRINGE)), { sens: 60, color: 'red' });
ok(near(res.blob, 32.5, 24.5), 'red dot on the black bull detected at ' + at(res.blob));

res = det.run(frame(withDot(scene, 45, 12, 2.5, RED_CORE, RED_FRINGE)), { sens: 60, color: 'red' });
ok(near(res.blob, 45.5, 12.5), 'red dot on white paper detected at ' + at(res.blob));

res = det.run(frame(withDot(scene, 4, 4, 2.5, RED_CORE, RED_FRINGE)), { sens: 60, color: 'red' });
ok(near(res.blob, 4.5, 4.5), 'red dot on the dark wall (a miss) detected at ' + at(res.blob));

res = det.run(frame(scene), { sens: 60, color: 'red' });
ok(res.blob === null, 'dot off returns null');

res = det.run(frame(withDot(scene, 32, 24, 2.5, GREEN_CORE, GREEN_FRINGE)), { sens: 60, color: 'red' });
ok(res.blob === null, 'green dot ignored in red mode');

res = det.run(frame(withDot(scene, 32, 24, 2.5, GREEN_CORE, GREEN_FRINGE)), { sens: 60, color: 'any' });
ok(near(res.blob, 32.5, 24.5), 'green dot detected in either mode at ' + at(res.blob));

res = det.run(frame(() => [255, 255, 255]), { sens: 60, color: 'red' });
ok(res.flooded === true && res.blob === null, 'flooded frame flagged, no blob');

// Static bright red object should be absorbed into the background and not trigger.
const det2 = lib.createDetector(W, H);
const lamp = (x, y) => Math.hypot(x - 50, y - 40) < 3 ? [255, 60, 60] : scene(x, y);
for(let i = 0; i < 20; i++) res = det2.run(frame(lamp), { sens: 60, color: 'red' });
ok(res.blob === null, 'static red light source does not trigger after warm-up');

// --- Geometry ---
const corners = [{ x: 10, y: 8 }, { x: 60, y: 9 }, { x: 58, y: 44 }, { x: 12, y: 42 }];
const Hm = lib.homographyToUnit(corners);
const expect = [[0, 0], [1, 0], [1, 1], [0, 1]];
let geomOk = !!Hm;
if(Hm) corners.forEach((c, i) => { const uv = lib.applyH(Hm, c.x, c.y); if(Math.abs(uv[0] - expect[i][0]) > 1e-6 || Math.abs(uv[1] - expect[i][1]) > 1e-6) geomOk = false; });
ok(geomOk, 'homography maps the four tapped corners onto the unit square');
if(Hm){
  const mid = lib.applyH(Hm, 35, 26);
  ok(mid[0] > 0.3 && mid[0] < 0.7 && mid[1] > 0.3 && mid[1] < 0.7, 'interior point maps near the target centre (' + mid[0].toFixed(2) + ', ' + mid[1].toFixed(2) + ')');
}
ok(lib.homographyToUnit([{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 2 }, { x: 3, y: 3 }]) === null, 'collinear taps are rejected');

// --- Always-on laser: a dot held for 2 s at 30 fps stays detected and tracks movement ---
const det3 = lib.createDetector(W, H);
for(let i = 0; i < 20; i++) det3.run(frame(scene), { sens: 60, color: 'red' });
let held = 0, last = null;
for(let i = 0; i < 60; i++){
  const cx = 30 + (i % 2);   // small wobble
  last = det3.run(frame(withDot(scene, cx, 24, 2.5, RED_CORE, RED_FRINGE)), { sens: 60, color: 'red' });
  if(last.blob) held++;
}
ok(held === 60, 'always-on dot detected in all 60 frames (' + held + '/60), not absorbed into the background');
last = det3.run(frame(withDot(scene, 44, 30, 2.5, RED_CORE, RED_FRINGE)), { sens: 60, color: 'red' });
ok(near(last.blob, 44.5, 30.5), 'dot tracked after moving at ' + at(last.blob));
last = det3.run(frame(scene), { sens: 60, color: 'red' });
ok(last.blob === null, 'no ghost dot left behind after the laser leaves');

// --- Trigger-click detection ---
const SR = 48000;
let seed = 7; const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648 - 0.5;
function audio(seconds, clicks, tone){
  const a = new Float32Array(Math.round(SR * seconds));
  for(let i = 0; i < a.length; i++) a[i] = rnd() * 0.01;
  (clicks || []).forEach(c => { const s0 = Math.round(c.at * SR); for(let j = 0; j < SR * 0.004 && s0 + j < a.length; j++) a[s0 + j] += c.amp * Math.exp(-j / (SR * 0.0008)) * (j % 2 ? -1 : 1); });
  if(tone){ const s0 = Math.round(tone.at * SR); for(let j = 0; j < tone.len * SR && s0 + j < a.length; j++) a[s0 + j] += tone.amp * Math.min(1, j / (SR * 0.05)) * Math.sin(2 * Math.PI * 300 * j / SR); }
  return a;
}
function runClicks(a){
  const proc = lib.createClickDetector(SR), out = [];
  for(let i = 0; i < a.length; i += 128) proc(a.subarray(i, i + 128), i / SR, out);
  return out.filter(e => e.type === 'click');
}
let ev = runClicks(audio(2, []));
ok(ev.length === 0, 'room noise alone produces no clicks');
ev = runClicks(audio(2, [{ at: 0.8, amp: 0.6 }]));
ok(ev.length === 1 && Math.abs(ev[0].t - 0.8) < 0.001, 'striker click detected, onset error ' + (ev[0] ? ((ev[0].t - 0.8) * 1000).toFixed(2) + ' ms' : 'n/a'));
ok(ev.length === 1 && ev[0].peak > 0.3, 'click peak reported (' + (ev[0] ? ev[0].peak.toFixed(2) : 'n/a') + ') for threshold learning');
ev = runClicks(audio(2, [{ at: 0.5, amp: 0.6 }, { at: 0.52, amp: 0.4 }]));
ok(ev.length === 1, 'click with an echo 20 ms later counts once');
ev = runClicks(audio(2, [{ at: 0.4, amp: 0.6 }, { at: 1.2, amp: 0.5 }]));
ok(ev.length === 2, 'two clicks 0.8 s apart both detected');
ev = runClicks(audio(2, [], { at: 0.5, amp: 0.05, len: 1 }));
ok(ev.every(e => e.peak < 0.15), 'soft sustained sound stays below the default 0.15 shot threshold');

// --- Aim check: racking is rejected, an aimed press is accepted ---
const AIM = { windowMs: 250, minFrac: 0.6, maxSpread: 12 };
const track = (fn) => { const a = []; for(let t = 0; t <= 1000; t += 33) a.push(Object.assign({ t }, fn(t))); return a; };
let r = lib.aimCheck(track(t => ({ x: 160 + Math.sin(t) * 2, y: 120 + Math.cos(t) * 2 })), 900, AIM);
ok(r.ok, 'steady dot before the click is accepted');
r = lib.aimCheck(track(t => ({ x: 40 + t * 0.25, y: 60 + t * 0.15 })), 900, AIM);
ok(!r.ok && r.reason === 'moving', 'dot sweeping across the frame (racking) is rejected');
r = lib.aimCheck(track(t => (Math.floor(t / 33) % 3 ? { x: null, y: null } : { x: 160, y: 120 })), 900, AIM);
ok(!r.ok && r.reason === 'no dot', 'dot flickering in and out of view is rejected');
r = lib.aimCheck(track(() => ({ x: null, y: null })), 900, AIM);
ok(!r.ok && r.reason === 'no dot', 'no dot at all is rejected');
r = lib.aimCheck(track(t => (t < 650 ? { x: 40 + t * 0.2, y: 200 - t * 0.12 } : { x: 170, y: 122 })), 900, AIM);
ok(r.ok, 'fast draw that settles 250 ms before the break is accepted');

// --- Analysis on the first real session (2026-10-15) ---
const session1 = [
  [1.744, 'A', 0.5700, 0.4481, 2.05], [2.009, 'A', 0.5011, 0.4891, 0.64], [4.648, 'A', 0.4810, 0.5894, 4.32],
  [1.777, 'A', 0.5291, 0.4465, 0.27], [1.965, 'C', 0.4443, 0.3457, 0.70], [2.063, 'A', 0.4727, 0.4871, 1.16],
  [2.048, 'C', 0.4933, 0.3204, 1.54], [2.336, 'A', 0.4574, 0.5147, 1.51], [2.337, 'A', 0.4835, 0.4120, 0.05],
  [2.202, 'C', 0.4854, 0.3434, 1.18]
].map((a, i) => ({ n: i + 1, t: a[0], zone: a[1], u: a[2], v: a[3], mv: a[4], early: false, par: 1.5 }));
const an = lib.analyzeReps(session1, { targetW: 8.5, targetH: 11 });
ok(an.outliers === 1 && an.avg === 2.05, 'average 2.05 s with the 4.65 s rep excluded (got ' + an.avg + ', ' + an.outliers + ' outlier)');
ok(an.best === 1.74 && an.underPar === 0, 'best 1.74 s, 0 under par');
ok(an.zones.A === 7 && an.zones.C === 3, 'zones 7 A / 3 C');
ok(an.biasY > 0.5 && Math.abs(an.biasX) < 0.2, 'hits sit high (' + an.biasY + ' in) and centered left-right (' + an.biasX + ' in)');
ok(an.spreadY > 2.5 && an.spreadX < 1.2, 'vertical stringing ' + an.spreadX + ' x ' + an.spreadY + ' in');
ok(an.suggestedPar === 2.05, 'suggests par 2.05 s (got ' + an.suggestedPar + ')');
ok(an.trend > 0.2, 'detects slowing across the set (+' + an.trend + ' s)');
ok(an.notes.some(x => /vertically/.test(x)) && an.notes.some(x => /rising/.test(x)), 'coaching note names the vertical string and rising muzzle');
ok(lib.analyzeReps([], { targetW: 8.5, targetH: 11 }).notes.length === 1, 'empty data returns a prompt instead of failing');

console.log(fails ? fails + ' test(s) failed' : 'All tests passed');
process.exit(fails ? 1 : 0);
