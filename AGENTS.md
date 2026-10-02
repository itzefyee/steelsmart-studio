# Agent guide

## Purpose and layout

SteelSmart Studio is a dependency-free Node and browser ES module project. Run `npm start` (or `npm.cmd start` in restricted PowerShell) and open `http://localhost:4310`. `index.html` is the showcase; `studio.html` is the CAD workspace. Their scripts and styles stay at the root because browser imports and static URLs are relative to those pages. Unit tests live in `tests/unit/`; Chrome checks and their shared driver live in `tests/browser/`. Design records and archived plans live in `docs/`.

## Source of truth

- `model.js` normalizes parameters and builds the member graph. Geometry, quantities, and OBJ/CSV exports must agree with that graph.
- `scene.js` and `experience-scene.js` render the graph. `app.js` and `experience.js` handle their respective UIs.
- `lab-model.js`, `studio-tools-model.js`, `material-planner.js`, `drawing-sheet.js`, `experience-math.js`, `ui-scheduler.js`, and `pointer-drag.js` hold reusable logic.
- `server.js` serves local static assets. Keep docs, dotfiles, and unsupported file types inaccessible through HTTP.
- `vendor/` and `assets/` contain licensed third-party files; keep the adjacent license texts.

## Working conventions

- Use ES modules, relative imports, and the existing plain JavaScript style. There is no bundler or package install step.
- Keep concept-only claims honest. This app does not perform certified structural analysis. Do not present nominal mass, stock layouts, cost, or carbon factors as engineering approval.
- Preserve keyboard, touch, reduced-motion, and WebGL fallback behavior when changing interaction code.
- Keep generated screenshots, exports, and server fixtures in `artifacts/`; it is gitignored. Avoid committing browser profiles, secrets, or local machine paths.
- Archived files under `docs/superpowers/` and the ledgers describe past work. Update current documentation when behavior changes; historical paths in those records need not be rewritten.

## Checks

Run `npm test` after model, server, utility, or test-layout changes. Start `npm start` before browser checks. Run the browser suite closest to changed UI, plus regression checks when changing shared rendering or interaction behavior. The suite names and prerequisites are in [tests/README.md](tests/README.md). Browser checks expect Chrome at the standard Windows installation path and use software WebGL.

## Git

The repository starts on `main` without a remote. Inspect `git status` before edits, preserve unrelated work, and keep generated `artifacts/` out of commits. Do not invent a remote URL or force-push.