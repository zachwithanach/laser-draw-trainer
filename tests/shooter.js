// Tests for the pose analysis and start-beep detection in shooter.html.
// Run: node tests/shooter.js
'use strict';
const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '..', 'shooter.html'), 'utf8');
function block(name){
  const m = html.match(new RegExp('// @ldt-' + name + '-start([\\s\\S]*?)// @ldt-' + name + '-end'));
  if(!m) throw new Error('Marker block not found: ' + name);
  return m[1];
}
const lib = new Function(block('pose') + block('beep') + '\nreturn { poseSample, poseSeries, analyzeDraw, findReloads, findMoves, createBeepDetector };')();

let fails = 0;
function ok(cond, msg){ console.log((cond ? 'PASS ' : 'FAIL ') + msg); if(!cond) fails++; }
const near = (v, want, tol) => v != null && Math.abs(v - want) <= tol;

// --- poseSample: landmarks to analysis points ---
{
  const lm = []; for(let i = 0; i < 33; i++) lm.push({ x: 0.5, y: 0.5, visibility: 0.9 });
  lm[11] = { x: 0.52, y: 0.30, visibility: 0.9 }; lm[12] = { x: 0.48, y: 0.30, visibility: 0.9 };
  lm[23] = { x: 0.52, y: 0.60, visibility: 0.9 }; lm[24] = { x: 0.48, y: 0.60, visibility: 0.9 };
  lm[14] = { x: 0.38, y: 0.30, visibility: 0.9 }; lm[16] = { x: 0.28, y: 0.30, visibility: 0.9 };   // right arm straight out
  lm[13] = { x: 0.56, y: 0.42, visibility: 0.9 }; lm[15] = { x: 0.50, y: 0.50, visibility: 0.2 };   // left wrist hidden
  const s = lib.poseSample(lm, null, 100, { hand: 'right', aspect: 4 / 3 });
  ok(s.ok && near(s.scale, 0.30, 1e-6) && near(s.ext, 1, 1e-6) && near(s.gw[0], 0.28 * 4 / 3, 1e-6) && s.sw === null, 'poseSample: right arm straight reads extension 1.00, torso 0.30, hidden support wrist is null');
  const left = lib.poseSample(lm, null, 100, { hand: 'left', aspect: 4 / 3 });
  ok(!left.ok, 'poseSample: gun hand not visible returns ok false');
  const world = lm.map(p => ({ x: 0, y: 0, z: 0 })); world[12] = { x: 0, y: 0, z: 0 }; world[14] = { x: 0, y: 0, z: -0.3 }; world[16] = { x: 0, y: 0, z: -0.6 };
  const bent = lm.map(p => Object.assign({}, p)); bent[14] = { x: 0.47, y: 0.31, visibility: 0.9 }; bent[16] = { x: 0.48, y: 0.30, visibility: 0.9 };
  ok(near(lib.poseSample(bent, world, 100, { hand: 'right', aspect: 1 }).ext, 1, 1e-6), 'poseSample: arm pointed at the camera reads extended from 3D landmarks');
  ok(!lib.poseSample(null, null, 5, { hand: 'right' }).ok, 'poseSample: no person in view returns ok false');
}

// --- A scripted shooter at 30 fps, seen from the side. Units: image units, torso 0.2 ---
const T0 = 1000, SC = 0.2;
const lerp = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
function shooter(script, seconds, o){
  o = o || {};
  let seed = 9; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647 - 0.5) * (o.jitter == null ? 0.004 : o.jitter);
  const out = [];
  for(let t = 0; t <= T0 + seconds * 1000; t += 1000 / 30){
    const p = script((t - T0) / 1000);
    const hip = [p.hipX == null ? 0.6 : p.hipX, 0.6];
    const off = p.gw;   // gun wrist relative to the hip center, in image units
    out.push({ t, ok: true, gw: [hip[0] + off[0] + rnd(), hip[1] + off[1] + rnd()], sw: p.sw ? [hip[0] + p.sw[0], hip[1] + p.sw[1]] : null,
      gh: [hip[0] + 0.01, hip[1]], gs: [hip[0], hip[1] - SC], hip, scale: SC, ext: p.ext });
  }
  return out;
}
const SIDE = [0.02, 0.04], HOLSTER = [0.03, -0.05], HIGH = [-0.02, -0.12], OUT = [-0.36, -0.19];   // wrist hangs just below the hip; the holstered gun sits above it
function drawScript(t){
  if(t < 0.20) return { gw: SIDE, ext: 0.97 };
  if(t < 0.45) return { gw: lerp(SIDE, HOLSTER, (t - 0.20) / 0.25), ext: 0.9 };
  if(t < 0.60) return { gw: HOLSTER, ext: 0.7 };
  if(t < 0.80) return { gw: lerp(HOLSTER, HIGH, (t - 0.60) / 0.20), ext: 0.55 };
  if(t < 1.10) return { gw: lerp(HIGH, OUT, (t - 0.80) / 0.30), ext: 0.55 + 0.42 * (t - 0.80) / 0.30 };
  return { gw: OUT, ext: 0.97 };
}
{
  const d = lib.analyzeDraw(shooter(drawScript, 3), T0, {});
  ok(near(d.react, 0.20, 0.08), 'draw: reaction found at ' + d.react + ' s (scripted 0.20)');
  ok(near(d.grip, 0.40, 0.08), 'draw: hand on gun at ' + d.grip + ' s (hand reaches the gun 0.35 to 0.45)');
  ok(near(d.out, 0.72, 0.09), 'draw: gun out of the holster at ' + d.out + ' s (leaves 0.60 to 0.80)');
  ok(near(d.on, 1.12, 0.08), 'draw: on target at ' + d.on + ' s (extension ends 1.10)');
  ok(near(d.clear, d.out - d.grip, 0.011) && near(d.present, d.on - d.out, 0.011), 'draw: segments add up (clear ' + d.clear + ' s, presentation ' + d.present + ' s)');
  const still = lib.analyzeDraw(shooter(() => ({ gw: SIDE, ext: 0.97 }), 3), T0, {});
  ok(still.react === null && still.grip === null && still.on === null, 'draw: standing still with arms at the sides reports no draw');
  const early = lib.analyzeDraw(shooter(t => drawScript(t + 2), 3), T0, {});
  ok(early.grip === null && early.on === null, 'draw: already on target at the beep reports no draw');
  const noisy = lib.analyzeDraw(shooter(() => ({ gw: SIDE, ext: 0.97 }), 3, { jitter: 0.012 }), T0, {});
  ok(noisy.react === null, 'draw: landmark jitter alone is not a reaction');
  const APPX = [-0.07, -0.02];   // appendix carry: the gun sits in front of the hip
  const appx = t => {
    const p = drawScript(t);
    if(t < 0.20 || t >= 0.80) return p;
    if(t < 0.45) return { gw: lerp(SIDE, APPX, (t - 0.20) / 0.25), ext: p.ext };
    if(t < 0.60) return { gw: APPX, ext: p.ext };
    return { gw: lerp(APPX, HIGH, (t - 0.60) / 0.20), ext: p.ext };
  };
  const marked = lib.analyzeDraw(shooter(appx, 3), T0, { holster: [-0.4, -0.1] }), unmarked = lib.analyzeDraw(shooter(appx, 3), T0, {});
  ok(near(marked.grip, 0.40, 0.08) && near(marked.on, 1.12, 0.08) && (unmarked.grip === null || unmarked.grip > 0.55),
    'draw: an appendix holster is timed correctly once marked (hand on gun ' + marked.grip + ' s); unmarked, the default hip position gives ' + unmarked.grip);
}

// --- Reloads ---
{
  const IN = [-0.08, -0.22], BELT = [0.03, 0.01], UP = [-0.3, -0.18];
  const script = withBelt => t => {
    if(t < 2.0) return Object.assign(drawScript(t), { sw: t > 1.0 ? UP : [0.0, 0.07] });
    if(t < 2.3) return { gw: lerp(OUT, IN, (t - 2.0) / 0.3), ext: 0.97 - 0.4 * (t - 2.0) / 0.3, sw: UP };
    if(t < 3.2) return { gw: IN, ext: 0.57, sw: withBelt && t > 2.5 && t < 2.9 ? BELT : [-0.06, -0.2] };
    if(t < 3.5) return { gw: lerp(IN, OUT, (t - 3.2) / 0.3), ext: 0.57 + 0.4 * (t - 3.2) / 0.3, sw: UP };
    return { gw: OUT, ext: 0.97, sw: UP };
  };
  const s1 = shooter(script(true), 6), d = lib.analyzeDraw(s1, T0, {});
  const r = lib.findReloads(s1, T0 + d.on * 1000, T0, {});
  ok(r.length === 1 && near(r[0].at, 2.1, 0.15) && near(r[0].dur, 1.4, 0.2), 'reload: one reload found at ' + (r[0] && r[0].at) + ' s lasting ' + (r[0] && r[0].dur) + ' s (scripted 2.0 to 3.5)');
  const s2 = shooter(script(false), 6);
  ok(lib.findReloads(s2, T0 + d.on * 1000, T0, {}).length === 0, 'reload: lowering the gun without a hand to the belt is not a reload');
  const s3 = shooter(script(true), 6).map(x => Object.assign({}, x, { sw: null }));
  ok(lib.findReloads(s3, T0 + d.on * 1000, T0, {}).length === 0, 'reload: a hidden support hand reports no reload');
}

// --- Movement between positions ---
{
  const script = t => Object.assign(drawScript(t), { hipX: t < 2 ? 0.6 : t < 3.2 ? 0.6 - 0.4 * (t - 2) / 1.2 : 0.2 });
  const s = shooter(script, 6), m = lib.findMoves(s, T0 + 1100, T0, {});
  ok(m.length === 1 && near(m[0].at, 2.0, 0.15) && near(m[0].dur, 1.3, 0.25) && near(m[0].dist, 2.0, 0.2), 'move: one move found at ' + (m[0] && m[0].at) + ' s, ' + (m[0] && m[0].dur) + ' s long, ' + (m[0] && m[0].dist) + ' torso lengths (scripted 2.0 s start, 1.2 s, 2.0)');
  ok(lib.findMoves(shooter(drawScript, 6), T0 + 1100, T0, {}).length === 0, 'move: standing in one position reports no move');
  const sway = t => Object.assign(drawScript(t), { hipX: 0.6 + 0.03 * Math.sin(t * 4) });
  ok(lib.findMoves(shooter(sway, 6), T0 + 1100, T0, {}).length === 0, 'move: swaying in place is not a move');
}

// --- Start-beep detection ---
{
  const SR = 48000;
  let seed = 3; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647 - 0.5);
  function audio(seconds, add){
    const a = new Float32Array(Math.round(SR * seconds));
    for(let i = 0; i < a.length; i++) a[i] = rnd() * 0.004;
    add(a); return a;
  }
  const tone = (a, at, len, freq, amp, square) => { const s0 = Math.round(at * SR); for(let j = 0; j < len * SR; j++){ const v = Math.sin(2 * Math.PI * freq * j / SR); a[s0 + j] += amp * (square ? Math.sign(v) : v); } };
  const click = (a, at, amp) => { const s0 = Math.round(at * SR); for(let j = 0; j < SR * 0.004; j++) a[s0 + j] += amp * Math.exp(-j / (SR * 0.0008)) * (j % 2 ? -1 : 1); };
  const run = (a, sr) => { const p = lib.createBeepDetector(sr || SR), out = []; for(let i = 0; i < a.length; i += 128) p(a.subarray(i, i + 128), i / (sr || SR), out); return out; };
  let ev = run(audio(3, a => tone(a, 1.234, 0.12, 1800, 0.2, true)));
  ok(ev.length === 1 && Math.abs(ev[0].t - 1.234) <= 0.012, 'beep: 1800 Hz start beep heard once, onset error ' + (ev[0] ? Math.round((ev[0].t - 1.234) * 1000) + ' ms' : 'n/a'));
  ev = run(audio(3, a => tone(a, 1.0, 0.12, 1800, 0.01, true)));
  ok(ev.length === 1, 'beep: a quiet beep (level 0.01) is still heard');
  ev = run(audio(3, a => { click(a, 0.5, 0.6); click(a, 0.9, 0.5); click(a, 1.3, 0.6); }));
  ok(ev.length === 0, 'beep: trigger clicks are not a beep');
  ev = run(audio(3, a => tone(a, 1.0, 0.08, 1000, 0.3, true)));
  ok(ev.length === 0, 'beep: the 1000 Hz par beep is ignored');
  ev = run(audio(3, a => { tone(a, 0.6, 1.5, 220, 0.2, false); tone(a, 0.6, 1.5, 510, 0.15, false); }));
  ok(ev.length === 0, 'beep: voice-range tones are ignored');
  ev = run(audio(3, a => tone(a, 1.0, 0.03, 1800, 0.3, true)));
  ok(ev.length === 0, 'beep: a 30 ms blip at 1800 Hz is too short to count');
  ev = run(audio(6, a => { tone(a, 1.0, 0.12, 1800, 0.2, true); tone(a, 4.0, 0.12, 1800, 0.2, true); }));
  ok(ev.length === 2, 'beep: two start beeps 3 s apart are both heard');
  const a44 = new Float32Array(44100 * 2); { const s0 = 44100; for(let j = 0; j < 0.12 * 44100; j++) a44[s0 + j] = 0.2 * Math.sign(Math.sin(2 * Math.PI * 1800 * j / 44100)); }
  ok(run(a44, 44100).length === 1, 'beep: heard at a 44.1 kHz sample rate');
}

console.log(fails ? fails + ' test(s) failed' : 'All tests passed');
process.exit(fails ? 1 : 0);
