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
const lib = new Function(block('detector') + block('geom') + '\nreturn { createDetector, homographyToUnit, applyH };')();

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

res = det.run(frame(withDot(scene, 32, 24, 2.5, RED_CORE, RED_FRINGE)), { sens: 60, color: 'red', freeze: false });
ok(near(res.blob, 32.5, 24.5), 'red dot on the black bull detected at ' + at(res.blob));

res = det.run(frame(withDot(scene, 45, 12, 2.5, RED_CORE, RED_FRINGE)), { sens: 60, color: 'red', freeze: true });
ok(near(res.blob, 45.5, 12.5), 'red dot on white paper detected at ' + at(res.blob));

res = det.run(frame(withDot(scene, 4, 4, 2.5, RED_CORE, RED_FRINGE)), { sens: 60, color: 'red', freeze: true });
ok(near(res.blob, 4.5, 4.5), 'red dot on the dark wall (a miss) detected at ' + at(res.blob));

res = det.run(frame(scene), { sens: 60, color: 'red' });
ok(res.blob === null, 'dot off returns null');

res = det.run(frame(withDot(scene, 32, 24, 2.5, GREEN_CORE, GREEN_FRINGE)), { sens: 60, color: 'red', freeze: false });
ok(res.blob === null, 'green dot ignored in red mode');

res = det.run(frame(withDot(scene, 32, 24, 2.5, GREEN_CORE, GREEN_FRINGE)), { sens: 60, color: 'any', freeze: false });
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

console.log(fails ? fails + ' test(s) failed' : 'All tests passed');
process.exit(fails ? 1 : 0);
