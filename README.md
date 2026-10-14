# Laser Draw Trainer

A phone web app for dry-fire practice with a laser training cartridge. The phone camera watches a paper target, detects the laser pulse, scores the hit, and times your draw from a random start beep to the first shot.

No build step. No dependencies. One `index.html`.

## Use it

1. Print a target on letter paper. Black ink on white paper works best.
2. Mount the phone so the whole target plus a margin fills the camera view. Dim the room.
3. Open the app over HTTPS and tap **Start camera**.
4. Tap **Calibrate**, then tap the target's top-left, top-right, bottom-right, and bottom-left corners.
5. Chamber the laser cartridge. Holster. Tap **Start drill**.
6. Draw and fire on the beep. The app shows time to first shot, the zone, and a hit map.
7. Reset the slide and holster. The next rep starts automatically after the pause.

Keep all live ammunition out of the room for every session.

## Scoring

Zones are circles centred on the target: A (15% of target width), C (30%), D (on paper), Miss (off paper). Set the target size in Settings.

## Hardware

- A rimless 9mm laser training cartridge (Mantis Laser Academy) stays chambered when you rack the slide between reps.
- Any phone with a rear camera. Safari and Chrome both work. The page must load over HTTPS for camera access.

## Develop

```
node tests/run.js
```

The tests extract the detector and calibration math from `index.html` (marker comments) and run them against synthetic frames. No camera needed.

See `docs/PLAN.md` for the roadmap and `CLAUDE.md` for conventions and agent roles.
