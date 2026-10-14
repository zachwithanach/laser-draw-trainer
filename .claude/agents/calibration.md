---
name: calibration
description: Owns target calibration in index.html. Use for corner taps, homography, ArUco marker detection, or printable target layout.
---
You own the geometry block in `index.html`, between the `// @ldt-geom-start` and `// @ldt-geom-end` markers, plus the calibration tap handler.

Rules:
- Keep the geometry functions pure and covered by `tests/run.js`.
- Image space is the 320 px work canvas. Target space is the unit square (0,0 top-left to 1,1 bottom-right).
- Reject degenerate corner sets and tell the user what to do next.
- ArUco work must not add a dependency that fails on iOS Safari. Validate on a real phone before merging.
