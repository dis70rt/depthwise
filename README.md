# Depthwise

Explore a folder of Markdown questions as a horizontal question tree with curved branches and an active path. Open a question to read its Markdown and reveal its follow-ups. The canvas moves to a question before its preview expands. A heading outline follows the focused file on the right.

Files stay in browser memory. There is no account, backend, answer generation, source-file editing, or document telemetry. Refreshing clears the imported session.

## Run locally

Use Node.js 22.12 or newer.

```sh
npm ci
npm run dev
```

Open the local address printed by Vite, normally `http://127.0.0.1:5173`. Drop a Markdown folder onto the landing screen, or choose **Open Markdown folder** and select a directory. Folder drops preserve nested paths; drop one folder at a time. You can also use the built-in example, or open `http://127.0.0.1:5173/?example=database`.

```sh
npm run check
npm run format:check
npm run build
npm run preview
```

`check` runs unit/contract tests and the TypeScript production build. The generated `dist/` folder can be served by a static web server. Serve over HTTP/HTTPS rather than opening `index.html` as a local file; folder parsing uses a web worker.

## Make a learning folder

Give [the authoring skill](skills/depthwise-question-tree/SKILL.md) to your AI agent along with a topic, preparation goal, and learner level. Native skill installation depends on the agent; with any text-based agent, paste the instruction body and request the complete folder and file contents.

For example: “Create a beginner question tree about operating-system memory management for Depthwise. Use questions only.”

The skill uses terse instructions, ordinary `.md` files, and relative links. Keep its own `SKILL.md` outside the learning folder. A downloadable copy is available in the app's empty state and Help dialog.

The repository includes [database questions](examples/database-preparation/index.md) and [ecology questions](examples/ecology-preparation/index.md). Select either example directory in the folder picker to try an actual import.

## Folder format

```text
my-topic/
├── index.md
├── foundations.md
└── trade-offs.md
```

Each file has a primary question as its H1. Direct bullet links beneath the exact H2 `Follow-up questions` become child branches, in authored order. The viewer hides this structural section from previews and heading outlines because the upcoming branches already show these questions.

```markdown
# How does this work?

## Explore

- What problem does it solve?
- When might it fail?

## Follow-up questions

- [What are the foundations?](foundations.md)
- [What are the trade-offs?](trade-offs.md)
```

Resolve paths from the file containing the link, including safe `../` references inside the chosen folder. Each non-root file should have one structural parent, with no cycles. Use ordinary links elsewhere for cross-references and heading fragments. The importer reports missing links and cycles while keeping valid branches usable.

Folders without a linked `index.md` can use a selected entry file or a folder-derived tree. Unlinked documents remain available through the files control. Directory layout is not silently treated as a learning relationship in canonical mode.

Supported: UTF-8 Markdown, nested directories, up to 1,000 files, 1 MiB per file, 20 MiB total Markdown. Hidden folders and unsupported files are ignored and summarized. Raw HTML/MDX cannot execute; images render as placeholders and do not fetch remote content. External HTTP(S) links open only when clicked.

## Controls

- Click a question to expand/collapse it; multiple branches can stay open.
- Drag the background to pan; scroll/pinch or use the zoom controls to zoom.
- Scroll inside Markdown previews to read long files.
- Use the heading outline to jump within the focused document. On smaller screens, open **Outline**.
- When a question control has keyboard focus: Enter/Space toggles, Left selects the parent, Right opens/selects the first child, Up/Down selects siblings, and Home selects the root.
- Collapsing and reopening preserves explored descendant branches for the session.
- Reduced-motion preferences disable decorative branch motion and animated focus panning.

## Browser verification

The Playwright acceptance suite uses a locally installed Chrome. It imports real folders and checks navigation, broken links, cycles, inert embeds, dialogs, keyboard behavior, mobile layout, reduced motion, and session replacement.

```sh
python -m venv .venv
.venv/bin/pip install -r tests/requirements.txt
npm run dev
```

In another terminal:

```sh
.venv/bin/python tests/browser.py
```

Set `CHROME_PATH` if Chrome is not at `/usr/bin/google-chrome`. Set `DEPTHWISE_URL` to test a different local port or the production preview. Test artifacts are saved under ignored `artifacts/`.

For larger-folder and cancellation checks:

```sh
.venv/bin/python tests/stress_browser.py
```

The tested browser is desktop Chrome. Folder selection uses `webkitdirectory`; browsers without it offer multi-file selection with an explicit warning that nested hierarchy cannot be preserved. Other browser engines require their own verification before claiming equivalent support.

## Implementation notes

The app uses React, TypeScript, Vite, Motion, react-zoom-pan-pinch, Radix Dialog, and the unified/remark/rehype Markdown pipeline. A small iterative layout arranges variable-height previews; visible connectors are box-drawing glyphs rather than ordinary diagram curves. Local JetBrains Mono and Atkinson Hyperlegible Next fonts use the Catppuccin Mocha palette.

See [task.md](task.md) for the full requirements and completion evidence, and [design decisions](docs/design.md) for the library choice and visual rationale.
