# Steel as sculpture

User asks for a substantially more impressive website demo with scrolling effects and interactive 3D. Extend the existing SteelSmart navy/orange identity into an immersive editorial experience and keep the fully working studio one click away.

The focal moment is a sticky, scroll-scrubbed engineering sculpture: assembled bolted steel joint, exploded components, then a complete member-derived portal frame. Camera motion, separation and scene transition follow scroll position, never wheel hijacking. Direct orbit, explosion, finish and wireframe controls work independently. Respect reduced motion; suppress automatic spatial motion and offer explicit chapter navigation.

Below the sequence: a pale editorial explanation, a live compact configurator with three templates, model dimensions and a real link that transfers that exact design to the studio, then a bold typographic close. The 3D model uses actual geometry; no generated product imagery or invented commercial claims.

Files: preserve current index as studio.html. New index.html, experience.css, experience.js, experience-scene.js, experience-math.js. Narrow updates to app.js for URL configuration handoff, browser test URL, package test command, and docs. Existing geometry model and exports remain intact.

Verification: test choreography bounds and template config, run all model tests, browser verify hero pixels, scroll state, user controls, live template/dimension changes, studio handoff, reduced motion, desktop/mobile overflow, and console errors. Capture desktop/mobile together; one combined fix pass if needed. Pause WebGL when offscreen and hidden. All essential text/links render without WebGL.


## Completed verification

Nine geometry/choreography tests passed. Both browser suites passed: showcase 3D pixels, orbit/finish/wireframe/explosion controls, scroll chapters, live template and dimension changes, exact configuration transfer to the preserved studio, phone overflow, touch rotation opt-in, reduced-motion navigation, and no JavaScript exceptions; existing studio interactions and actual export payloads also passed. Added a geometric frustum check for a 6 x 6 x 12 m model and an orbit-persistence assertion. Desktop and mobile screenshots inspected in two batched rounds. Tablet Rotate controls follow any-pointer:coarse. Renderer work is on demand. Existing OS download-finalization limitation remains documented.
