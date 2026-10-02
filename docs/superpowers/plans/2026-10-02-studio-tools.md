# Studio Tools Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Make the existing CAD studio distinctive and useful through connected exploration, inspection, material and review tools.

**Architecture:** Pure calculations operate on model.js output. An injected StudioWorkbench coordinates the existing app and renderer; material and review panels remain separate. No replacement of the landing experience or original studio features.

**Tech Stack:** Browser ES modules, native HTML/CSS, vendored Three.js, Node test runner and Chrome CDP browser checks.

**Spec:** ../specs/2026-10-02-studio-tools-design.md

## Global constraints

- Existing white drafting identity, native keyboard controls and responsive panels.
- Local deterministic concepts; no structural or certified fabrication claims.
- No dependencies, credentials, accounts or remote services.
- Author changes in the existing standalone steelsmart workspace; no Git repository is present.
- Four complete phases; optional emphasis feedback does not block implementation.

## Review focus

- Parameter bounds can produce duplicate variants; omit them and preserve valid area.
- Model rebuilds can invalidate a member or node selection; clear obsolete state.
- Oversize cuts must remain visible and keep procurement totals explicitly partial.
- Saved notes can contain markup or corrupt parameters; treat text safely and normalize restoration.
- A panel update must not steal input focus or leave hidden canvas controls active on mobile.

### Phase 1: Alternatives and challenge

Files: create studio-tools-model.js, studio-tools-model.test.js, studio-workbench.js, studio-tools.css; modify app.js and studio.html.

Interfaces: designVariants(params) → [{id,title,description,params,model,deltaMass}]; challengeProgress(model) → {areaRatio,massRatio,complete}; StudioWorkbench({getModel,getParams,getViewport,applyDesign,notify}).update(model).

- [x] Test valid distinct variants, input immutability, aspect-ratio area conservation, boundary behavior and exact challenge criteria.
- [x] Run node --test studio-tools-model.test.js and observe missing behavior.
- [x] Implement pure calculations, panel rail, preview SVGs, apply callbacks and opt-in challenge.
- [x] Verify tests and actual apply/undo/target progress in the browser.

### Phase 2: Inspection

Files: extend studio-tools-model.js/tests, studio-workbench.js, scene.js, studio-tools.css.

Interfaces: modelNodes(model) → [{id,position,label}]; measureNodes(a,b) → {distance,delta}; SteelViewport.selectMember(id), setIsolation(kind|null), setColorByMass(bool), setMeasurement(a|null,b|null), setScaleReference(bool), focusMember(id), getCameraState(), restoreCamera(view).

- [x] Test node deduplication and Euclidean distance; test reconciliation after a template change in browser.
- [x] Implement renderer visibility/coloring/measurement/person and selection-driven member navigator.
- [x] Verify selection, isolation, mass colors, exact offsets and restoration to complete geometry.

### Phase 3: Material scenarios

Files: create material-planner.js, material-planner.test.js, studio-material-panel.js; extend workbench and styles.

Interfaces: planStock(model,{stockLength,kerf}) → {bars,oversize,stockLength,usedLength,kerfLength,wasteLength,utilization}; materialScenario(model,{rate,carbonFactor}) → {cost,carbon}; stockCSV(plan) → string; MaterialPanel({root,getModel,notify}).update(model).

- [x] Test unique allocation, section segregation, inter-cut kerf, length conservation, oversize and invalid factors.
- [x] Implement deterministic first-fit-decreasing, stock visualizations, user factors and CSV allocation export.
- [x] Verify calculations, stock-length changes and actual export payloads.

### Phase 4: Review, drawings and focus

Files: create drawing-sheet.js/tests, studio-review-panel.js; extend workbench, scene and styles.

Interfaces: drawingSheet(model) → SVG; normalizeReviewMark(value) → valid mark|null; ReviewPanel({root,getModel,getViewport,applyDesign,notify}).update(model).

- [x] Test projection dimensions/XML escaping and normalized valid/corrupt review data.
- [x] Implement note/camera capture and restore, SVG/PNG/JSON exports, focus mode and keyboard palette.
- [x] Verify notes survive reload, restore exact geometry/view, exports contain current model, and Escape/focus behavior.

### Finish

- [x] npm test, existing browser regression and new studio-tools browser suite.
- [x] Desktop/mobile visual batch, single correction pass, confirmation.
- [x] Fresh review, fix significant findings, update README and completion ledger.
