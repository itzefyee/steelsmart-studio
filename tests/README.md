# Tests

Run from the repository root. `npm test` (or `npm.cmd test` in restricted PowerShell) runs all Node unit and HTTP server tests in `unit/`. The server tests create temporary files in the ignored `artifacts/` directory.

Browser checks in `browser/` require:

1. The local server running with `npm start` on port 4310.
2. Google Chrome installed at `C:/Program Files/Google/Chrome/Application/chrome.exe`.
3. Localhost access and write access to `artifacts/`.

| Command | Coverage |
| --- | --- |
| `npm run test:browser` | Core studio controls and exports |
| `npm run test:experience` | Landing experience |
| `npm run test:lab` | Design Lab and comparisons |
| `npm run test:tools` | Studio inspection, materials, and review |
| `npm run test:tools:regression` | Studio state regressions |
| `npm run test:performance` | Frame scheduling and render behavior |
| `npm run test:reliability` | Control and fallback sweep |
| `npm run test:context` | WebGL context loss and recovery |

Each browser check uses its own local Chrome debugging port. `CAPTURE=1` writes optional screenshots to `artifacts/`. These checks use headless software WebGL and emulated mobile widths; they do not replace checks on physical devices or other browser engines.