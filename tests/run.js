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
const lib = new Function(block('detector') + block('geom') + block('click') + block('targets') + block('aim') + block('analysis') + block('score') + block('screen') + block('reset') + '\nreturn { createDetector, homographyToUnit, applyH, invertH, createClickDetector, aimCheck, analyzeReps, classifyHit, nearAnyTarget, withinTargets, pickTarget, scoreString, createStringTracker, analyzeStrings, RANGE_PALETTE, laserDominance, findScreenQuad, estimateDelay, flashSync, inStep, learnTrigger, classifySound };')();

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
ok(an.spreadY > 2 && an.spreadX < 1.2, 'vertical stringing ' + an.spreadX + ' x ' + an.spreadY + ' in');
ok(an.suggestedPar === 2.05, 'suggests par 2.05 s (got ' + an.suggestedPar + ')');
ok(an.trend > 0.2, 'detects slowing across the set (+' + an.trend + ' s)');
ok(an.notes.some(x => /vertically/.test(x)) && an.notes.some(x => /rising/.test(x)), 'coaching note names the vertical string and rising muzzle');
ok(lib.analyzeReps([], { targetW: 8.5, targetH: 11 }).notes.length === 1, 'empty data returns a prompt instead of failing');

// --- Second session (2026-10-15): par-beep gate dropped shots, racks registered later ---
const session2 = [[2.299,'C',.4737,.3700,.83],[1.907,'C',.4905,.3792,.08],[3.254,'Miss',-1.824,3.040,0],[2.031,'C',.5930,.3352,.35],
  [2.697,'A',.5474,.4836,.68],[1.974,'A',.4684,.4390,.71],[5.862,'A',.5089,.4393,.70],[6.984,'A',.6071,.4366,.11],[2.758,'A',.4968,.5188,.75],
  [4.648,'C',.3424,.5904,4.79],[1.909,'A',.5171,.4120,1.93],[1.912,'A',.5213,.5198,.89],[1.768,'C',.5024,.3633,2.23],[4.580,'A',.6068,.4765,.49],
  [1.575,'C',.6398,.4073,.93],[1.686,'A',.5048,.4709,1.63]].map((a, i) => ({ n: i + 1, t: a[0], zone: a[1], u: a[2], v: a[3], mv: a[4], early: false, par: 2.05 }));
const an2 = lib.analyzeReps(session2, { targetW: 8.5, targetH: 11 });
ok(an2.outliers === 4, '4 slow reps (4.6-7.0 s) excluded from the average (got ' + an2.outliers + ')');
ok(an2.spreadX < 3 && an2.spreadY < 3, 'off-paper rack excluded from spread (' + an2.spreadX + ' x ' + an2.spreadY + ' in)');
ok(an2.biasY > 0.5, 'hits still sit high (' + an2.biasY + ' in)');

// --- Multiple targets ---
const T1 = lib.homographyToUnit([{ x: 20, y: 40 }, { x: 100, y: 40 }, { x: 100, y: 140 }, { x: 20, y: 140 }]);
const T2 = lib.homographyToUnit([{ x: 200, y: 40 }, { x: 280, y: 40 }, { x: 280, y: 140 }, { x: 200, y: 140 }]);
const HS = [T1, T2];
let h = lib.classifyHit(HS, 1, 240, 90, 8.5, 11);
ok(h.zone === 'A' && h.hit === 1, 'center of the called target 2 scores A (got ' + h.zone + ')');
h = lib.classifyHit(HS, 1, 60, 90, 8.5, 11);
ok(h.zone === 'Wrong' && h.hit === 0, 'center of target 1 when target 2 is called scores Wrong');
ok(h.u < -0.5, 'wrong-target hit keeps coordinates relative to the called target, so analysis treats it as off-paper');
h = lib.classifyHit(HS, 1, 150, 200, 8.5, 11);
ok(h.zone === 'Miss' && h.hit === -1, 'a shot between the targets is a Miss');
h = lib.classifyHit(HS, null, 60, 90, 8.5, 11);
ok(h.zone === 'A' && h.hit === 0, 'free shot scores against whichever target it lands on');
const CS = [[{ x: 20, y: 40 }, { x: 100, y: 40 }, { x: 100, y: 140 }, { x: 20, y: 140 }], [{ x: 200, y: 40 }, { x: 280, y: 40 }, { x: 280, y: 140 }, { x: 200, y: 140 }]];
ok(lib.withinTargets(HS, CS, 150, 90, 1), 'a miss in the gap between two sheets is still in play');
ok(!lib.withinTargets(HS, CS, 150, 400, 1) && !lib.withinTargets(HS, CS, 600, 90, 1), 'a dot far below or beside the targets is ignored');
ok(!lib.withinTargets([T1], [CS[0]], 300, 90, 1), 'single target keeps the one-target-size margin');
let seq = [], s7 = 3; const rr = () => (s7 = (s7 * 16807) % 2147483647) / 2147483647;
for(let i = 0; i < 500; i++) seq.push(lib.pickTarget(3, seq, rr));
let triple = false; for(let i = 2; i < seq.length; i++) if(seq[i] === seq[i - 1] && seq[i] === seq[i - 2]) triple = true;
const counts = [0, 1, 2].map(k => seq.filter(x => x === k).length);
ok(!triple, 'pickTarget never calls the same target three times in a row');
ok(counts.every(c => c > 120), 'pickTarget spreads 500 calls across 3 targets (' + counts.join('/') + ')');
ok(lib.pickTarget(1, [0, 0, 0], rr) === 0, 'one target always returns target 1');
const multi = [[1.9,1,'A'],[2.4,2,'C'],[1.8,1,'A'],[2.6,2,'Wrong'],[1.85,1,'C'],[2.5,2,'A']].map((a, i) => ({ n: i + 1, t: a[0], target: a[1], zone: a[2], u: 0.5, v: 0.5, mv: 0.5, early: false, par: 2 }));
const am = lib.analyzeReps(multi, { targetW: 8.5, targetH: 11 });
ok(am.perTarget && am.perTarget.length === 2 && am.perTarget[1].avg === 2.5, 'per-target averages computed (T2 ' + (am.perTarget && am.perTarget[1].avg) + ' s)');
ok(am.zones.Wrong === 1 && am.notes.some(x => /wrong target/.test(x)), 'wrong-target count and note');
ok(am.notes.some(x => /Target 2 averages/.test(x)), 'slow-transition note names target 2');

// --- Inverse homography (simulated shots map unit-square points back to the image) ---
{
  const cs = [{ x: 10, y: 8 }, { x: 60, y: 9 }, { x: 58, y: 44 }, { x: 12, y: 42 }];
  const Hf = lib.homographyToUnit(cs), Hi = lib.invertH(Hf);
  const close = (p, x, y) => Math.abs(p[0] - x) < 1e-6 && Math.abs(p[1] - y) < 1e-6;
  const mid = lib.applyH(Hf, 33, 25), back = lib.applyH(Hi, mid[0], mid[1]);
  ok(!!Hi && close(lib.applyH(Hi, 0, 0), 10, 8) && close(lib.applyH(Hi, 1, 1), 58, 44) && close(back, 33, 25), 'invertH maps unit corners back to image corners and round-trips an interior point');
}

// --- Stage scoring (Comstock, minor and major) ---
{
  const shots = [{ zone: 'A', target: 0 }, { zone: 'C', target: 0 }, { zone: 'A', target: 1 }, { zone: 'D', target: 1 }];
  const mi = lib.scoreString(shots, { targets: 2, perTarget: 2, pf: 'minor', time: 2 });
  const ma = lib.scoreString(shots, { targets: 2, perTarget: 2, pf: 'major', time: 2 });
  ok(mi.points === 14 && mi.misses === 0 && mi.hf === 7, 'minor: 2A 1C 1D = 14 points, hit factor 7.00 over 2.00 s (got ' + mi.points + ', ' + mi.hf + ')');
  ok(ma.points === 16 && ma.hf === 8, 'major: same hits = 16 points, hit factor 8.00 (got ' + ma.points + ', ' + ma.hf + ')');
  const extra = lib.scoreString([{ zone: 'D', target: 0 }, { zone: 'A', target: 0 }, { zone: 'C', target: 0 }, { zone: 'Miss', target: -1 }, { zone: 'A', target: 1 }],
    { targets: 2, perTarget: 2, pf: 'minor', time: 3 });
  ok(extra.points === 13 && extra.misses === 1 && extra.penalty === 10 && extra.net === 3 && extra.hf === 1, 'best two hits per target count, a missing hit costs 10 (13 - 10 = 3 over 3 s, got ' + extra.net + ', HF ' + extra.hf + ')');
  const zero = lib.scoreString([{ zone: 'Miss', target: -1 }], { targets: 1, perTarget: 2, pf: 'minor', time: 2 });
  ok(zero.net === 0 && zero.hf === 0 && zero.misses === 2, 'all misses floor at 0 points and hit factor 0');
  ok(lib.scoreString([{ zone: 'Hit', target: -1 }], { targets: 1, perTarget: 2, pf: 'minor', time: 2 }) === null, 'uncalibrated hits return no score');
}

// --- String tracker ---
{
  const tr = lib.createStringTracker({ rounds: 4, gapMs: 3000, minSplitMs: 100 });
  const r = [tr.add(1500, {}), tr.add(1540, {}), tr.add(1800, {}), tr.add(2100, {}), tr.add(2500, {})];
  ok(r.join() === 'shot,dup,shot,shot,done' && tr.shots.length === 4 && tr.shots[1].split === 300 && tr.shots[3].split === 400, 'tracker: echo inside 100 ms dropped, splits recorded, done at the round count (' + r.join() + ')');
  const t2 = lib.createStringTracker({ rounds: 4, gapMs: 3000 });
  t2.add(1000, {});
  ok(!t2.idle(3500) && t2.idle(4100), 'tracker: string ends after 3 s without a shot');
}

// --- Simulated string: synthetic trigger audio through the click detector into the tracker ---
{
  const sr = 48000, dur = 4, beepAt = 0.5, clicks = [1.62, 1.91, 2.19, 2.57], echo = 2.19 + 0.07;
  const buf = new Float32Array(sr * dur);
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for(let i = 0; i < buf.length; i++) buf[i] = (rnd() - 0.5) * 0.006;
  const burst = (t0, amp) => { const s0 = Math.round(t0 * sr); for(let k = 0; k < sr * 0.015; k++) buf[s0 + k] += amp * Math.exp(-k / (0.002 * sr)) * (k % 2 ? 1 : -1); };
  clicks.forEach(t => burst(t, 0.5)); burst(echo, 0.25);
  const proc = lib.createClickDetector(sr), out = [];
  for(let i = 0; i < buf.length; i += 128) proc(buf.subarray(i, i + 128), i / sr, out);
  const heard = out.filter(e => e.type === 'click' && e.peak >= 0.1);
  const tr = lib.createStringTracker({ rounds: 4, gapMs: 3000, minSplitMs: 100 });
  const res = heard.map(e => tr.add((e.t - beepAt) * 1000, { zone: 'A', target: 0 }));
  const splits = tr.shots.slice(1).map(s => s.split), want = [290, 280, 380];
  ok(heard.length === 5 && res.join() === 'shot,shot,shot,dup,done' && splits.every((s, i) => Math.abs(s - want[i]) < 3) && Math.abs(tr.shots[0].t - 1120) < 3,
    'synthetic string: 4 clicks and an echo yield 4 shots, first ' + Math.round(tr.shots[0].t) + ' ms, splits ' + splits.map(Math.round).join('/') + ' ms');
}

// --- String analysis ---
{
  const sh = (t, split, target) => ({ t, split, target, zone: 'A' });
  const s1 = { kind: 'string', t: 2.6, first: 1.5, par: 3, shots: [sh(1.5, null, 1), sh(1.8, 0.3, 1), sh(2.3, 0.5, 2), sh(2.6, 0.3, 2)], hf: 5, zones: { A: 3, C: 1, D: 0 }, misses: 0 };
  const s2 = { kind: 'string', t: 2.9, first: 1.6, par: 3, shots: [sh(1.6, null, 1), sh(1.88, 0.28, 1), sh(2.43, 0.55, 2), sh(2.72, 0.29, 2)], hf: 4.5, zones: { A: 2, C: 1, D: 0 }, misses: 1 };
  const s3 = { kind: 'string', t: null, first: null, par: 3, shots: [], early: true };
  const a = lib.analyzeStrings([s1, s2, s3]);
  ok(a.timed === 2 && a.avg === 2.75 && a.best === 2.6 && a.underPar === 2 && a.first === 1.55 && a.early === 1, 'string analysis: average 2.75 s, best 2.60 s, first shot 1.55 s, one early string');
  ok(a.split === 0.29 && a.transition === 0.53 && a.hf === 4.75 && a.bestHf === 5 && a.misses === 1, 'string analysis: split 0.29 s, transition 0.53 s, HF 4.75 average, 5.00 best (got ' + a.split + ', ' + a.transition + ', ' + a.hf + ')');
  ok(a.notes.some(x => /Transitions average 0.53 s against 0.29 s/.test(x)) && a.notes.some(x => /1 miss cost 10 penalty points/.test(x)), 'string notes: slow transitions and miss penalty');
  const slow = [1, 2, 3].map(() => ({ kind: 'string', t: 2.5, first: 1.4, par: 2, shots: [sh(1.4, null, 1), sh(2.5, 1.1, 1)], hf: null }));
  ok(lib.analyzeStrings(slow).suggestedPar === 2.5, 'string par suggestion: no string under 2.00 s par suggests 2.50 s');
  ok(/Complete a few strings/.test(lib.analyzeStrings([]).notes[0]), 'no strings yet: prompt to complete a few');
}

// --- TV range picture: palette and detector on moving content ---
{
  const P = lib.RANGE_PALETTE;
  ok(Object.keys(P).every(k => lib.laserDominance(P[k]) < 40), 'range palette: no color reads as a red or green laser (max dominance ' + Math.max.apply(null, Object.keys(P).map(k => lib.laserDominance(P[k]))) + ')');
  const scene = sx => (x, y) => {
    if(Math.hypot(x - sx, y - 38) < 4) return P.steel;                         // swinger plate
    if(Math.abs(x - (60 - sx)) < 5 && Math.abs(y - 30) < 8) return P.target;  // moving light target
    if(x > 26 && x < 38 && y > 10 && y < 30) return P.target;                 // center target
    return y > 33 ? P.berm : P.bg;
  };
  let clean = true;
  [60, 100].forEach(sens => ['red', 'any'].forEach(color => {
    const dd = lib.createDetector(W, H);
    for(let i = 0; i < 20; i++) dd.run(frame(scene(10)), { sens, color });
    for(let i = 0; i < 40; i++){ const r = dd.run(frame(scene(10 + i)), { sens, color }); if(r.blob || r.flooded) clean = false; }
  }));
  ok(clean, 'moving range content (swinger and target) never reads as a dot at sensitivity 60 or 100, red or either mode');
  const dd = lib.createDetector(W, H);
  for(let i = 0; i < 20; i++) dd.run(frame(scene(10)), { sens: 60, color: 'red' });
  const r = dd.run(frame(withDot(scene(30), 32, 20, 2.5, RED_CORE, RED_FRINGE)), { sens: 60, color: 'red' });
  ok(near(r.blob, 32.5, 20.5), 'red dot on the TV center target detected at ' + at(r.blob));
}

// --- TV screen location and display delay ---
{
  const Q = [{ x: 10, y: 8 }, { x: 54, y: 10 }, { x: 52, y: 40 }, { x: 12, y: 38 }];
  const inside = (x, y) => {
    for(let i = 0; i < 4; i++){ const a = Q[i], b = Q[(i + 1) % 4]; if((b.x - a.x) * (y - a.y) - (b.y - a.y) * (x - a.x) < 0) return false; }
    return true;
  };
  let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const lumFrame = on => { const l = new Uint8Array(W * H); for(let y = 0; y < H; y++) for(let x = 0; x < W; x++) l[y * W + x] = Math.max(0, Math.min(255, Math.round((inside(x + 0.5, y + 0.5) ? (on ? 220 : 25) : 70) + (rnd() - 0.5) * 12))); return l; };
  const frames = []; for(let k = 0; k < 8; k++) frames.push({ t: k * 700, lum: lumFrame(k % 2 === 0) });
  const q = lib.findScreenQuad(frames, W, H);
  const err = q ? Math.max.apply(null, q.corners.map((c, i) => Math.hypot(c.x - Q[i].x, c.y - Q[i].y))) : 99;
  ok(q && err <= 1.6, 'screen located from white and black frames, worst corner off by ' + err.toFixed(2) + ' px');
  const still = []; for(let k = 0; k < 8; k++) still.push({ t: k * 700, lum: lumFrame(false) });
  ok(lib.findScreenQuad(still, W, H) === null && lib.findScreenQuad(frames.slice(0, 3), W, H) === null, 'no screen reported when nothing flashes or too few frames');
  const sw = []; for(let k = 0; k < 8; k++) sw.push({ t: 1000 + k * 700, on: k % 2 === 0 });
  const samples = [];
  for(let t = 900; t < 7000; t += 1000 / 30){
    let on = false; sw.forEach(s => { if(s.t <= t - 180) on = s.on; });
    samples.push({ t, v: (on ? 200 : 30) + (rnd() - 0.5) * 6 });
  }
  const d = lib.estimateDelay(samples, sw);
  ok(d != null && d >= 180 && d <= 214, 'display delay of 180 ms measured as ' + d + ' ms (one 30 fps frame of slack)');
  ok(lib.estimateDelay(samples.map(s => ({ t: s.t, v: 50 })), sw) === null, 'flat brightness gives no delay');
  const sync = lib.flashSync(samples, sw);
  ok(lib.inStep(sync, sw) && sync.matched === 7, 'flashes in step: all 7 switches seen, delay spread ' + sync.spread + ' ms');
  const drift = []; for(let t = 900; t < 7000; t += 1000 / 30) drift.push({ t, v: (Math.floor(t / 1130) % 2 ? 200 : 30) + (rnd() - 0.5) * 6 });
  const ds = lib.flashSync(drift, sw);
  ok(!lib.inStep(ds, sw), 'brightness that flashes out of step with the test is rejected (seen ' + ds.matched + ' of 7, spread ' + ds.spread + ' ms)');
}


// --- Resetting trigger: the reset click on release is not a shot ---
{
  const press = (t0, b, r, gap) => r == null ? [{ t: t0, peak: b }] : [{ t: t0, peak: b }, { t: t0 + gap, peak: r }];
  const lv = lib.learnTrigger([press(0, 0.50, 0.18, 140), press(2000, 0.48, 0.20, 160), press(4000, 0.52, 0.17, 150)]);
  ok(lv.mode === 'level' && lv.thr > 0.20 && lv.thr < 0.48 && lv.gapMs === 300, 'learn: quieter reset click sets a threshold between the clicks (' + lv.mode + ', ' + lv.thr + ')');
  const sk = lib.learnTrigger([press(0, 0.40, 0.37, 120), press(2000, 0.38, 0.41, 180), press(4000, 0.42, 0.36, 150)]);
  ok(sk.mode === 'skip' && sk.thr === 0.18 && sk.gapMs === 300, 'learn: equally loud reset click switches to skipping the click after each shot (' + sk.mode + ', ' + sk.thr + ', ' + sk.gapMs + ' ms)');
  const no = lib.learnTrigger([press(0, 0.50), press(2000, 0.45), press(4000, 0.55)]);
  ok(no.mode === 'none' && no.thr >= 0.22 && no.thr <= 0.23, 'learn: one click per press keeps the half-of-quietest threshold (' + no.thr + ')');
  const st = { last: -1e9, due: false }, p = { mode: 'skip', thr: 0.18, gapMs: 300 };
  const seq = [[0, 0.4], [120, 0.38], [330, 0.41], [420, 0.37], [700, 0.4], [760, 0.05]].map(a => lib.classifySound(st, a[0], a[1], p, 100));
  ok(seq.join() === 'shot,reset,shot,reset,shot,quiet', 'filter (skip): shot and reset alternate, quiet noise ignored (' + seq.join() + ')');

  // Full strings on synthetic audio: learn from 3 presses, then shoot 4 shots with a reset click 100 ms after each.
  const sr = 48000;
  const run = (bAmp, rAmp) => {
    const buf = new Float32Array(sr * 12);
    let seed = 5; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for(let i = 0; i < buf.length; i++) buf[i] = (rnd() - 0.5) * 0.006;
    const burst = (t0, amp) => { const s0 = Math.round(t0 * sr); for(let k = 0; k < sr * 0.015; k++) buf[s0 + k] += amp * Math.exp(-k / (0.002 * sr)) * (k % 2 ? 1 : -1); };
    [0.5, 2.5, 4.5].forEach(t0 => { burst(t0, bAmp); burst(t0 + 0.15, rAmp); });               // learning presses
    const beep = 7, shots = [8.62, 8.91, 9.19, 9.57];
    shots.forEach(t0 => { burst(t0, bAmp); burst(t0 + 0.10, rAmp); });                          // the string
    const proc = lib.createClickDetector(sr), out = [];
    for(let i = 0; i < buf.length; i += 128) proc(buf.subarray(i, i + 128), i / sr, out);
    const clicks = out.filter(e => e.type === 'click').map(e => ({ t: e.t * 1000, peak: e.peak }));
    const learn = clicks.filter(c => c.t < 6000), presses = [];
    learn.forEach(c => { const last = presses[presses.length - 1]; if(last && c.t - last[last.length - 1].t <= 1000) last.push(c); else presses.push([c]); });
    const prof = lib.learnTrigger(presses);
    const s = { last: -1e9, due: false }, tr = lib.createStringTracker({ rounds: 4, gapMs: 3000, minSplitMs: 100 }), kinds = [];
    clicks.filter(c => c.t > beep * 1000).forEach(c => {
      const k = lib.classifySound(s, c.t, c.peak, { mode: prof.mode, thr: prof.thr, gapMs: prof.gapMs }, 100);
      kinds.push(k);
      if(k === 'shot') tr.add(c.t - beep * 1000, {});
    });
    return { prof, kinds, shots: tr.shots.length, splits: tr.shots.slice(1).map(x => Math.round(x.split)) };
  };
  const q = run(0.5, 0.18), e = run(0.45, 0.45);
  ok(q.prof.mode === 'level' && q.shots === 4 && q.splits.join() === '290,280,380', 'DryFireMag string, quieter reset: 8 clicks give 4 shots, splits ' + q.splits.join('/') + ' ms (' + q.kinds.join(',') + ')');
  ok(e.prof.mode === 'skip' && e.shots === 4 && e.splits.join() === '290,280,380', 'DryFireMag string, equally loud reset: 8 clicks give 4 shots, splits ' + e.splits.join('/') + ' ms (' + e.kinds.join(',') + ')');
  const naive = run(0.45, 0.45).kinds.length;
  ok(naive === 8, 'without the filter the same string has 8 loud clicks, so each reset would have scored as a shot');
}

console.log(fails ? fails + ' test(s) failed' : 'All tests passed');
process.exit(fails ? 1 : 0);
