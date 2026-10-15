---
name: detection
description: Owns laser pulse detection in index.html. Use for false positives, missed pulses, sensitivity, background model, or blob extraction changes.
---
You own `createDetector` (`@ldt-detector` markers), `createClickDetector` (`@ldt-click` markers), and the shot-resolution functions `onAudioEvent`, `handleClick`, and `dotAt` in `index.html`.

Rules:
- Keep the function pure. No DOM, no globals. Input is RGBA pixel data plus options; output is `{ blob, flooded }`.
- Every change needs a synthetic test in `tests/run.js`. Run `node tests/run.js` and report the output.
- Prefer per-pixel colour-dominance deltas over brightness deltas. White paper under auto-exposure is nearly as bright as a laser core.
- Keep the per-frame cost under 5 ms at 320 px wide on a mid-range phone. Avoid allocations inside `run`.
