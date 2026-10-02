# Whole-site performance and interaction reliability

The user wants the complete SteelSmart website to feel smoother and more efficient, with reliable buttons and clicks. Preserve the existing showcase and drafting-studio identity, geometry, tools and exports. Practical inspection and material planning remain the studio entry points.

Measure actual work before changing it: model rebuilds per burst of slider input, hidden-panel rendering, idle/offscreen frame callbacks, geometry allocation, section-plane allocation and delivered asset bytes. Timing figures are local Chrome measurements, not claims about physical mobile hardware or field Web Vitals.

Coalesce live input to one update per animation frame, commit the final value immediately, and keep undo/export/storage consistent with it. Avoid rebuilding hidden task output. Reuse repeat geometry within a model and avoid recomputing unchanged shadows. Stop scheduling studio frames when idle or outside the visible viewport; resume on interaction or visibility. Reuse section-plane geometry while scrubbing. Retain the current visual quality.

Remove the artificial generation delay so an older submit cannot overwrite a subsequent action. Lock drag gestures to one pointer; cancel safely on blur, capture loss or pointer cancellation. Keep named-view state truthful after orbiting. Disable unavailable 3D controls while leaving parameter and data workflows usable. Check every static and dynamic control family, keyboard navigation, dialogs, rapid repeated actions, empty/invalid fields, storage failures, WebGL fallback, responsive layouts and export content.

Serve existing assets with negotiated compression and conditional caching without introducing a build step, external service or dependency. Cached responses must update when files change, respect HEAD and encoding preferences, and retain safe routing.

Use existing browser suites plus targeted performance/reliability regressions. Inspect desktop and mobile visuals in one batch, fix findings together, then confirm once. Run one independent final code review and fix substantive findings with regression coverage. No deployment or changes to other projects.
