# SteelSmart Studio

The user requests an ambitious SteelSmart upgrade as a resume flagship and selected an interactive CAD / AI studio. The reference offers prompt-to-CAD, CAD analysis, recommendations, and a steel component marketplace. This implementation is an original, independent local showcase inspired by those workflows.

## Design

An architectural drafting sheet: pale canvas, navy structural members, orange actions, Manrope text, restrained ruled inspectors. A real 3D portal frame takes the center; prompt composition and generation history occupy the left, parameters occupy the right. Lower tabs expose the derived material schedule and model checks. The experience works without a remote service. Prompt generation is explicitly a local rules-based demo, not an LLM or structural certification.

## Implementation

1. Test deterministic assembly generation, prompt parsing, bounds, member quantities, mass and exports. Implement a pure geometry model shared by UI and exports.
2. Implement self-hosted Three.js viewport: shaded I-sections, plates, bolts, ground shadow, orbit, zoom, named views, wireframe, explosion, dimensions, selection.
3. Implement responsive workspace, prompt presets, history/undo, parameter controls, component templates, material schedule, model checks, JSON/OBJ/CSV downloads, local persistence.
4. Verify Node suite and actual Edge interactions, exports, desktop/mobile layout, keyboard use, WebGL rendering, console errors. Inspect screenshots in one batch and fix findings once.

## Review focus

Invalid saved state must not break startup. Prompts cannot inject markup. Unsupported requests must not claim success. Every exported member must match displayed geometry. Metric dimensions remain consistent. Mobile retains access to viewport and both inspectors.

## Execution ledger

Ruling: Build in an independent steelsmart directory with a dedicated server; workspace contains unrelated projects and is not a Git checkout. Keep existing entry points intact.
Ruling: User requested fast, all-out execution and approved the studio; execute the concrete plan inline without additional approval rounds.


## Verification outcome

Seven model tests pass. Browser checks pass for rendered WebGL pixel content, prompt generation, sliders and typed multi-digit dimensions, undo, unsupported requests, all templates, information tabs, wireframe/explosion/camera controls, actual export Blob payloads, persistence and corrupt-storage recovery, component library, revision restoration, and desktop/tablet/mobile overflow. No JavaScript exceptions. Browser download disk finalization is environment-blocked; actual OBJ/JSON/CSV bytes are verified and copied to artifacts/. Screenshot inspection confirmed desktop, tablet, and mobile composition. Review findings fixed: shared section basis, commit-on-blur number drafts, projected camera fit including height, unsupported units and decimal pitch.
