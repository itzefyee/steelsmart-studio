# SteelSmart Studio

An independent, local showcase for parametric steel concepts. The landing page presents an interactive 3D story and Design Lab; the studio turns a supported brief into editable member geometry, quantities, and concept exports. This is an original demo inspired by SteelSmart workflows, not the official SteelSmart service.

## Quick start

Requires Node.js 22 or newer. No dependency installation, build step, account, or API key is needed.

```sh
npm start
```

On Windows PowerShell with script execution disabled, use `npm.cmd start`. Open [http://localhost:4310](http://localhost:4310) for the showcase or [http://localhost:4310/studio.html](http://localhost:4310/studio.html) for the CAD workspace. The server binds to localhost. Set `PORT` to use another port.

## What you can do

- Explore the 3D connection, assembly sequence, section plane, and side by side comparison in the Design Lab. Share a parameter link or save a local PNG study sheet.
- Configure portal frame, canopy, and storage rack concepts with dimensions, bays, pitch, steel grade, and bracing. The prompt field uses a deterministic local parser.
- Inspect and measure members; view the material schedule; study stock cuts, cost, and carbon assumptions; compare alternatives; save review notes in browser storage.
- Export concept geometry and data as OBJ, JSON, CSV, SVG, or PNG, depending on the view.

The same member graph drives geometry, quantities, and exports. See [design direction](docs/DESIGN.md) and [product scope](docs/PRODUCT.md) for further context.

## Project map

| Location | Purpose |
| --- | --- |
| `index.html`, `experience*.js`, `design-lab.js`, `lab-model.js` | Showcase and Design Lab |
| `studio.html`, `app.js`, `studio-*.js` | CAD workspace and tool panels |
| `model.js`, `scene.js`, `material-planner.js`, `drawing-sheet.js` | Shared model, rendering, and calculations |
| `server.js` | Local static server with compression and conditional requests |
| `tests/unit/`, `tests/browser/` | Node tests and Chrome interaction checks |
| `assets/`, `vendor/` | Self-hosted Manrope and Three.js with license texts |
| `docs/` | Design records, plans, and verification notes |

The browser files use ES modules and relative URLs, so the runtime entry points stay at the project root. There are no npm dependencies or lockfile.

## Verification

```sh
npm test
```

The unit suite exercises geometry, quantities, exports, planning, interactions, and the server. It writes temporary server fixtures under the ignored `artifacts/` directory.

Browser checks need Google Chrome at the standard Windows path and a running server:

```sh
npm start
# In another terminal:
npm run test:browser
npm run test:experience
npm run test:lab
npm run test:tools
npm run test:tools:regression
npm run test:performance
npm run test:reliability
npm run test:context
```

Use `npm.cmd` in place of `npm` if PowerShell blocks npm scripts. The checks use headless Chrome, local ports, and software WebGL. Set `CAPTURE=1` to save screenshots in `artifacts/`. See [tests/README.md](tests/README.md) for test prerequisites and suite details.

## Engineering scope

This is a concept tool. The parser is rules based and runs locally; it is not an LLM. It does not calculate structural capacity, loads, buckling, foundations, or code compliance. OBJ exports contain oriented member envelopes, not fabrication solids or STEP geometry. Mass excludes plates, bolts, welds, coatings, and waste. Cutting layouts are heuristic studies; cost and carbon factors are editable assumptions, not quotations or verified declarations. Review notes and revisions live in the browser.

Three.js and Manrope are self-hosted under their respective license files in `vendor/` and `assets/`. The project has no declared license for its own source.

## Deploy on Render

The root [`render.yaml`](render.yaml) defines a free Node web service in Singapore.
Its build runs `npm test`, then `npm start` serves the site on Render's `PORT` and binds to `0.0.0.0` when Render sets `RENDER=true`.
This works when the service is created from the Blueprint or as a Web Service in the Render dashboard.
The project has no npm dependencies, so the build does not need an install step.
The Node engine range supports versions 22 through 24 and prevents an automatic jump to a newer major version.

In the Render dashboard, select **New > Blueprint**, connect the private [GitHub repository](https://github.com/itzefyee/steelsmart-studio), and deploy the Blueprint from `main`.
Grant the Render GitHub app access to this private repository if it does not appear in the repository list.
Render will check `/` for service health and provide the public site URL after deployment.
The source repository remains private, while a Render web service is publicly reachable.

## Deploy on Vercel

The root [`vercel.json`](vercel.json) configures Vercel to run `npm run build` and serve the generated `dist/` directory as a static site.
The build stages the browser pages, modules, styles, fonts, and Three.js files without including the local Node server, tests, or project docs.
There are no npm dependencies or environment variables to configure.

Import the repository in Vercel and deploy from `main` with the default project settings.
Vercel detects `vercel.json` and uses the configured build command and output directory.
The homepage is `/` and the CAD workspace is `/studio.html`.

## Git

This folder is a standalone repository connected to the private GitHub repository above.
Generated `artifacts/`, local dependencies, credentials, and editor files are ignored.
