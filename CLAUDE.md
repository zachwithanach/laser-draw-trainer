# Laser Draw Trainer

Single-file phone web app (`index.html`) for laser dry-fire training. Plain HTML, CSS, and JavaScript. No bundler, no framework, no npm dependencies.

## Conventions

- Keep the app in one self-contained `index.html`. External resources are limited to Google Fonts.
- Keep the detector, geometry, targets, aim, analysis, and click-detector code pure (no DOM access) and inside their `// @ldt-*-start` / `// @ldt-*-end` markers. `tests/run.js` extracts those blocks. `createClickDetector` is also serialized into the AudioWorklet with `toString()`, so it must not reference anything outside its own body.
- Run `node tests/run.js` after any change to detection or calibration. Add a synthetic test for every bug you fix.
- Store state in `localStorage` with try/catch. The page must work when storage is unavailable.
- Write UI copy in sentence case, active voice, plain verbs.
- Write status messages as instructions, not apologies.

## Agent roles

Use the subagents in `.claude/agents/`. Each owns one workstream and reports back with the files it changed and the test output.

| Agent | Owns |
|---|---|
| detection | `createDetector`, `createClickDetector`, shot resolution (`handleClick`, `dotAt`) |
| calibration | corner taps and dragging, saved calibration, homography, multi-target classification (`@ldt-targets`), ArUco |
| drills | shot timer, par, callouts, drill state machine |
| ui | layout, settings, hit map, history |
| qa | `tests/run.js`, synthetic frames, latency measurement |

## Workflow

1. Read `docs/PLAN.md` and pick the next open task.
2. Delegate to the owning agent. Run `qa` after any change to detection or timing.
3. Update the task status in `docs/PLAN.md` in the same change.
