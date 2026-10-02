# Whole-site Performance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans for inline implementation. Steps use checkboxes for tracking.

**Goal:** Reduce unnecessary work throughout SteelSmart and verify robust user interactions.

**Architecture:** Keep the browser ES-module app and shared member graph. Add a small frame scheduler, bound geometry reuse to a live scene, update task output only when needed, and add conditional compressed delivery to the existing Node server.

**Tech Stack:** Vanilla HTML/CSS/JavaScript, vendored Three.js, Node test runner, Chrome CDP.

**Spec:** ../specs/2026-10-02-performance-design.md

## Global constraints

- Existing visual identity and all workflows remain; no dependencies or remote services.
- Work in the standalone steelsmart folder; no Git repository is present.
- Tests report software-WebGL/emulated-device evidence honestly.
- Export content and final committed parameters must match visible controls.

## Review focus

- A pending slider frame followed by Undo, reset, export or template selection must not overwrite the newer action.
- Lazy task output must be refreshed before becoming visible and preserve editable inputs.
- Cached geometry must not grow without bound or be disposed while referenced.
- Multi-pointer, cancelled and blurred drags must recover on the next interaction.
- Conditional asset responses must not serve stale or incorrectly encoded content.

### Task 1: Baseline and responsiveness

Files: qa-browser.js, performance-browser-check.js, ui-scheduler.js/tests, app.js, experience.js, studio-workbench.js, studio-material-panel.js.

- [x] Capture baseline rebuild/storage/hidden-panel counts, timing and idle work.
- [x] Add failing scheduler and browser tests: latest value wins, flush/cancel, one rebuild per burst, no hidden material layout work, generation followed by reset stays reset.
- [x] Coalesce live updates, flush commits, avoid unchanged geometry updates, refresh active tool output on activation, remove delayed generation.
- [x] Verify targeted browser regressions and unit suite.

### Task 2: Rendering and gestures

Files: scene.js, experience-scene.js, pointer-drag.js/tests, performance-browser-check.js.

- [x] Reproduce idle/offscreen work, repeated geometry allocation, section allocation and interrupted-pointer problems.
- [x] Use demand-driven studio frames, shared geometry within a build, cached shadows and reusable section-plane geometry.
- [x] Lock orbit gestures to their starting pointer and release on cancel/blur; synchronize named views; disable unavailable 3D controls.
- [x] Verify rendered geometry, resume behavior, gesture recovery and existing experience/lab suites.

### Task 3: Asset delivery

Files: server.js, server.test.js.

- [x] Add failing HTTP tests for compression, conditional GET, HEAD, encoding exclusions, file changes and invalid routes.
- [x] Export createAppServer(options), support gzip/Brotli and ETag validation with a bounded file cache.
- [x] Run server tests, restart only this project's preview server and compare actual transferred asset bytes.

### Task 4: Whole-site reliability and finish

Files: reliability-browser-check.js, package.json, README.md, docs/performance-ledger.md.

- [x] Exercise all control families, links, dialogs and keyboard paths across both routes; include rapid actions, invalid input, unavailable WebGL and storage.
- [x] Run all existing suites and new regressions; capture one desktop/mobile visual batch and before/after performance evidence.
- [x] Independent final review, one substantive correction batch with regression coverage, visual confirmation if needed.
- [x] Record evidence, limitations and commands in README and completion ledger.
