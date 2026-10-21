# Depthwise

Explore a folder of Markdown questions, answers, and notes as a horizontal question tree with curved branches and an active path. Open a question to read its Markdown and reveal its follow-ups. The canvas moves to a question before its preview expands. A heading outline follows the focused file on the right.

Files stay in your browser. With Remember enabled, the latest imported folder, expanded branches, focused question, canvas position, and reading positions are saved locally in IndexedDB, so reopening the site resumes your exploration without another upload. There is no account, backend, answer generation, or document telemetry. Use **Help → Forget saved session** to remove the saved folder; clearing site data also removes it. Browser storage restrictions or eviction can prevent restoration.

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

For example: “Create a beginner question tree about operating-system memory management for Depthwise. Include short answers and deeper follow-up questions.”

The skill uses terse instructions, ordinary `.md` files, and relative links. It supports general exploration, idea development, decisions, and preparation; answers are optional and follow your prompt. Keep its own `SKILL.md` outside the learning folder. A downloadable copy is available in the app's empty state and Help dialog.

The repository includes [database questions](examples/database-preparation/index.md) and [ecology questions](examples/ecology-preparation/index.md). Select either example directory in the folder picker to try an actual import.

## Publish the authoring skill

The skill is ready for the standard skills.sh repository layout at `skills/depthwise-question-tree/SKILL.md`. See [publishing instructions](docs/publishing-skill.md) for the repository structure and install command. The app download contains the same instructions. Publishing the skill does not require publishing the application.

## Folder format

```text
my-topic/
├── index.md
├── foundations.md
└── trade-offs.md
```

Each file has a primary question as its H1. Its Markdown body can include answers, explanations, examples, and notes. Direct bullet links beneath the exact H2 `Follow-up questions` become child branches, in authored order. The viewer hides this structural section from previews and heading outlines because the upcoming branches already show these questions.

```markdown
# How does this work?


Start with a question, then follow linked questions to explore related ideas.

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
- Keyboard navigation is ready when a tree opens or resumes, including after clicking the canvas background: Enter/Space toggles, Left selects the parent, Right opens/selects the first child, Up/Down selects siblings, and Home selects the root. Editing fields, dialogs and reading previews keep their normal keys. Tab can move to other controls without a delayed animation pulling focus back.
- Collapsing and reopening preserves explored descendant branches for the session.
- Reduced-motion preferences disable decorative branch motion and animated focus panning.

## Edit and extend a tree

Open a node and use **Edit** in its footer to write ordinary Markdown or preview it directly inside the expanded node. Adding a follow-up opens a dialog. **Update tree** applies the draft to the browser copy. With Remember enabled, unfinished drafts are saved separately and recovered after reopening; **Keep draft** returns the node to reading mode and **Resume draft** returns to it. **Discard draft** leaves the applied document unchanged.

In a linked tree, a light **+** sits to the right of an open leaf or below its existing follow-up branches. It creates a Markdown file and updates its parent’s reserved follow-up links together. Choose a unique relative `.md` path. Folder-derived mode supports editing existing files; authored follow-ups belong to linked trees.

Use **Save & export** to download a ZIP containing all current Markdown files and their folder structure. Where `showDirectoryPicker` is supported, **Save to folder** requests write access: select the original folder to save modified files or an empty folder for a complete copy. Direct saves check existing contents, create new child files before updating parent links, and report partial writes honestly. Detected external edits block saving; choose another empty folder or export a ZIP. Browser locks cannot exclude every external writer. Before overwriting an existing file, a recovery version is written under `.depthwise-backups/`; these copies remain until you delete them. Cyclic graphs require ZIP export for a complete copy. Downloads include applied changes; finish drafts before exporting. Non-Markdown files are not included in the ZIP and are left untouched by folder saves.

The selected writable handle is remembered locally, but the browser may ask for permission again after reopening. Browsers without direct folder access retain editing, draft recovery and ZIP export. Renaming, moving and deleting files are outside this version. Opening another folder asks before replacing a workspace with edits or an unfinished draft.

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

## Privacy, licensing and release

App and portable skill: [Apache-2.0](LICENSE). Third-party code/fonts retain their own licenses; the build ships full runtime license notices. Ethernode is the maintainer’s project name, not a registered-company claim. Support, privacy and private security reports: **das.saikat.in@gmail.com** ([security policy](SECURITY.md)).

Before import, choose whether this browser remembers your folder/drafts or keeps new work in this tab only. Stored data is not app-encrypted; Forget clears application storage, not exported files, operating-system copies, browser grants or on-disk backups. Before overwriting an existing file, folder saving keeps a recovery version under `.depthwise-backups/`; delete these yourself when no longer needed. Folder saves can partially complete, and browser file locks do not exclude every external editor.

The intended initial deployment is the dedicated origin **depthwise.saikat.in**. Export/reimport when moving to **depthwise.tech**: browser data and directory grants do not move automatically. The header template must be applied by a capable host; ordinary GitHub Pages does not apply `_headers`. See the [release/rollback/incident runbook](docs/release-runbook.md) and [operator legal review](docs/legal/launch-review.md). No production deployment or comprehensive legal/WCAG certification is implied by local checks.

Concurrent-tab write conflicts remain deliberately deferred (AUD-001). Use one editing tab per workspace until that task is implemented. The original audit is historical evidence; [the remediation record](docs/remediation-2026-10-22.md) tracks subsequent changes and open deployment/human-review gates.

The website’s install command pins the separate `skills@1.7.4` CLI. It requires Node >=22.20 and is not part of the document-processing runtime. Upstream documents anonymous usage telemetry/security-audit requests: set `DISABLE_TELEMETRY=1` or `DO_NOT_TRACK=1` in your terminal environment to opt out before running the command. CLI/skill downloads still need the network. See [the CLI’s own documentation](https://github.com/vercel-labs/skills/blob/main/docs/troubleshooting.md#telemetry); the direct SKILL.md download avoids executing the CLI.
