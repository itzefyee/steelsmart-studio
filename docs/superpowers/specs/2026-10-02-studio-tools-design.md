# A studio for exploring, understanding and presenting steel concepts

The user wants useful, distinctive and fun additions inside the actual CAD studio, built in compatible phases. Preserve the existing white drafting workspace, local deterministic geometry, prompts, parameters, history and exports. Extend the real member graph without implying structural analysis. Implementation is authorized for all fitting phases; optional user input determines emphasis, not whether work proceeds.

## Chosen approach

Connect exploration, inspection, material planning and review. A single studio-tools rail selects a working panel below the existing viewport. Inspection also adds compact viewport controls. Existing controls remain useful; tools update from the same model revision. Use the existing fonts, thin rules, navy geometry, orange actions and teal result accents. Mobile panels stack; long lists and tables scroll within their own regions. Inputs, selections and every action work by keyboard.

## Phase 1 — Explore alternatives

Generate three deterministic alternatives to the current design: fewer bays, additional height, and a changed aspect ratio that preserves area when within bounds. Keep template, steel grade and bracing. Each alternative displays real projected geometry, dimensions, mass and differences; applying one records a normal undoable revision. Remove duplicate or unchanged variants at bounds.

An optional design challenge asks for a portal-frame footprint of at least 600 m² and nominal member mass at most 13,000 kg. It starts from the current design without replacing it, shows both live targets and celebrates meeting them once. This is a geometry/material puzzle using fixed nominal sections, not a structural optimization exercise. No unsolicited animation or sounds; respect reduced motion.

## Phase 2 — Inspect the assembly

Searchable member navigator with family filter, selection, focus and isolation, all linked to the real 3D object. Color-by-mass maps nominal individual member mass to a blue/orange palette and has an explicit mass legend; it is never presented as stress. Hide/isolate affects viewing only, not totals or exports.

Derive unique endpoints from members. Two labeled node selectors create a 3D dimension between selected model endpoints; report true Euclidean distance and X/Y/Z offsets. Reconcile selections when topology changes and remove obsolete measurements. Measurement refers to original coordinates while exploded view is active and labels this clearly. A toggle adds an illustrative 1.75 m person beside the footprint.

## Phase 3 — Plan material scenarios

First-fit-decreasing stock allocation, grouped by section profile. User chooses stock length and saw kerf. Every fitting member is allocated exactly once; oversize members are reported separately, never silently spliced or dropped. Kerf is consumed between adjacent cuts, not after the last cut. Show purchased stock length, utilized member length, inter-cut kerf, residual offcuts and utilization. This is a heuristic layout, not a claim of global optimality or a fabrication release. Export the actual allocation CSV.

Editable illustrative USD/kg and kgCO2e/kg factors multiply nominal member mass, with clear scope: material scenario, excluding plates, bolts, waste, fabrication, transport and installation. Zero is permitted, invalid values are rejected, and no default is represented as a current price or verified environmental declaration.

## Phase 4 — Review and present

Save a short review note together with normalized model parameters, optional selected member and camera. Restoring a mark restores its exact design and view through the normal revision pathway. Store at most 12 marks locally; corrupt/blocked storage leaves a working session with clear feedback. Render note content as text.

Focus mode widens the actual viewport; Escape exits, and existing camera controls remain available. A command palette (Ctrl/Cmd+K) finds phase panels and key view actions. It supports Escape, focus restoration and arrow navigation.

Export a concept SVG drawing sheet with front, plan and side centerline projections, overall dimensions, nominal quantities and concept scope. XML-escape text. Export a local PNG of the current 3D view with model title and quantities. Include a JSON review pack with saved notes, parameters and camera; no remote services.

## Architecture and boundaries

Pure modules own alternatives, challenges, endpoint measurements, stock packing and projection/exports. SteelViewport gains independent visibility, coloring, measurement and scale-reference methods. StudioWorkbench receives getModel/getParams/getViewport/applyDesign/notify callbacks from app.js. Material and review panels own their distinct forms. No new dependency, credential, account or backend is needed. Existing landing and Design Lab remain unchanged.

## Acceptance

Tests prove variant bounds/area and immutable inputs, live challenge transitions, endpoint distances, one allocation per fitting member and kerf conservation, oversize reporting, safe drawing output and normalized review restoration. Browser checks prove real selectable geometry, isolation/heatmap, measurements, challenge success, undoable variants, stock changes/export bytes, review restoration, focus/palette keyboard behavior, responsive layout and original workflow regression. Batch desktop/mobile visual review once, make a combined correction pass, then confirm.
