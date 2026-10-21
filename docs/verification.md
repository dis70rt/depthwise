# Verification record

Verified locally on 2026-10-21 (Asia/Kolkata). This records the implementation and reproducible checks, not a guarantee of correctness for all possible documents or browser engines.

## Implementation evidence

| Requirement | Implementation | Verification |
| --- | --- | --- |
| Local directory import, nested paths, UTF-8 | `src/lib/documents.ts`, `src/lib/parser.worker.ts`, `src/App.tsx` | Real directory uploads in `tests/browser.py`; malformed encoding and cancellation in `tests/stress_browser.py` |
| Canonical Markdown tree | `parseDocument`, `buildPack`, `resolveLink` | Parser tests cover reserved-section boundaries, code/quote exclusions, relative paths, reference links, authored order, and numbered-list exclusion |
| Root boundary, duplicates, missing targets, cycles | `normalizePath`, `buildPack`, `makeTree` | Unit tests exercise escaping/encoded paths and duplicates; browser suite exercises cycle markers and missing links |
| Noncanonical folders and unlinked files | Folder-derived `makeTree`, file navigator, detached workspace | Browser suite imports generic folders and navigates an unlinked file |
| Inline expansion and horizontal branches | `src/components/Workspace.tsx`, `src/lib/tree.ts` | Browser expansion, remembered descendants, variable-height layout assertions; three-width screenshots |
| Terminal branch silhouette | `Branches`, shared trunk/junction glyphs, local JetBrains Mono | Direct screenshot inspection at 1440, 768, and 390px |
| Two-line collapsed question and full title | `.node-question`, `.question-tooltip`, accessible disclosure name | Long-question browser fixture, source review, screenshot review |
| Focus, keyboard, zoom, text selection | Workspace callbacks, reusable pan/zoom library | Arrow/Home checks, zoom controls, preview click without collapse, focused file navigation |
| Heading outline and fragments | Parsed heading IDs, `Outline`, pending heading navigation | Duplicate-anchor unit tests and browser heading navigation; same parser supplies renderer and outline |
| Theme, responsiveness, reduced motion | Catppuccin CSS tokens, local fonts, outline dialog, Motion preferences | Browser checks at three widths; reduced-motion fixture; Taste inspector |
| Inert imported content | Sanitized HAST and explicit link/image components | Browser verifies no script execution or remote image request; sanitizer unit tests |
| Session behavior and atomic replacement | App-owned session, independent candidate import | Failed imports preserve current pack; successful replacement resets it; reload clears it |
| Portable authoring skill | `skills/depthwise-question-tree/SKILL.md`, downloadable public copy | Skill-creator validator; identical-copy contract test; actual packaged download |
| Question-only example output | Database and ecology example folders | Contract tests verify H1 questions, one parent, full reachability, and question-only content; both directories imported in Chrome |
| Large folders and interruptibility | Batched reads, worker parse, memoized workspace, lazy previews | 1,000-file wide/deep folders, near-total-size import, cancellation, long previews, rapid clicks |
| Layout recovery | `WorkspaceBoundary` preserves the App-owned pack and offers view reset | Source review of error boundary and preserved session ownership |

## Commands

- `npm run check`: 16 passing unit/contract tests plus TypeScript and production Vite build.
- `npm run format:check`: source-format verification.
- `python /home/dis70rt/.codex/skills/.system/skill-creator/scripts/quick_validate.py skills/depthwise-question-tree`: installed skill-creator validation; its absolute path is environment-specific.
- `python tests/browser.py`: real-browser acceptance suite against the running development server.
- `DEPTHWISE_URL=http://127.0.0.1:4173 python tests/browser.py`: the same suite against production preview, including worker import and skill download.
- `python tests/stress_browser.py`: supported-size, cancellation, malformed-input, and rapid-interaction checks.
- The installed Taste skill's `lint.mjs --app src` and `inspect.mjs --app <app-url> --out artifacts/taste-final`: source and browser visual review. Final production inspection returned 0 failures and 0 warnings at all three widths. Source lint returned 0 failures; its monospace and overlay-shadow warnings are intentional and explained in docs/design.md.

Python commands require the Playwright environment described in README.md. Browser checks use installed Chrome; they do not require downloading a second browser.

## Measured stress run

A completed development-server run, before the final static production review, measured:

- 1,000-file wide import: 1.27 seconds.
- 1,000-file deep import: 0.92 seconds; only the root and first generation materialized.
- 19,762,347-byte Markdown import: 9.85 seconds.
- Main-thread heartbeat during the large import: 196 ticks at a 50ms interval.
- No browser page errors in the completed suite.

These are observations from this machine, not performance guarantees. The suite also checks that only expanded Markdown is rendered, invalid replacements retain current documents, and a canceled import never replaces the active session.

## Review scope and limitations

Desktop Chrome is the verified engine, with desktop/tablet/phone viewport sizes. Native screen-reader software and other browser engines were not separately exercised. Keyboard operation and semantic regions, disclosure states, heading links, dialogs, and focus restoration were checked in the browser and source.

The authoring skill was used as a plain instruction document to produce two different-subject example folders; it does not depend on registering a native skill or calling a model API. Automatic skill discovery and installation remain specific to the user's agent. The app accepts ordinary Markdown folders independently of the skill.

The application is ready for local use and a static host. No public deployment, external publishing, or agent-global skill installation was part of this task. All commits are scoped to Depthwise inside the existing parent repository.


## Readability follow-up

`tests/readability_browser.py` confirms Atkinson Hyperlegible Next is actually loaded for questions, Markdown, and outline links. Reading text is 18px at 1920×1080 and 1440×900, 17px on a 390px phone viewport, with 16px outline links. Screenshots at 100% scale and the expanded 1080p tree were visually reviewed. The updated two-line assertion measures line height instead of assuming the previous smaller font size. The production acceptance suite and 16 unit tests pass with the new font and wider previews.

## Curved branch update

The production build and 18 unit tests pass. The browser acceptance suite passes at 1440, 768, and 390px, including collapse/reopen, keyboard traversal, Markdown links, and reduced motion. `tests/branches_browser.py` records actual animation frames: expansion began at 378ms after 24 collapsed frames during the canvas move; the reached question stayed anchored during relayout. It checks exact ancestor highlighting, interruption by newer clicks, and reduced motion. Desktop and phone screenshots were reviewed. The Taste inspector reported zero failures and one warning: it classifies the initially unfocused connections as a chart without colored data; the active route intentionally receives blue only after a child is focused.

The user requested no duplicate focus outline within a highlighted node, and asked to review before committing. The updated UI remains uncommitted.

## Landing-page drag and drop

The production build and 24 unit tests pass. Six drop-reader tests cover nested paths and multiple directory batches, hidden/dependency exclusions, mixed-root rejection, empty and unreadable entries, cancellation, limits, and file fallback. The browser integration test imports a nested pack through synthetic drop entries, checks drag-over feedback without child-element flicker, confirms unsupported-drop errors, and captures 1440, 768, and 390px layouts without page overflow or browser errors. Desktop and phone screenshots were reviewed. Native operating-system drag gestures require manual verification; the automated browser test supplies synthetic directory entries.

## Landing alignment and animation

`tests/landing_browser.py` checks side-by-side alignment at 1440px, seeks the actual CSS animations to verify that the camera reaches the question while it is still collapsed, checks the expanded Markdown and child branches, verifies the return frame, the 9-second infinite repetition through a second question, absence of playback controls, and reduced motion. It also checks for overflow at 1920, 768, and 390px. Desktop overview and expanded screenshots were reviewed.
