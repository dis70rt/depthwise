# Depthwise: implementation task and product specification

Status: completed and verified (2026-10-21, Asia/Kolkata). The user subsequently authorized building this specification and committing features after passing checks. The original planning-only restriction has been superseded. See section 23 and docs/verification.md for implementation decisions and verification evidence.

## 1. Purpose

Depthwise helps people prepare concepts by exploring questions and follow-up questions as a visual tree. A person brings a folder of Markdown files, opens it in the application, and traverses the relationships between those files. Opening a question expands its Markdown preview in its branch and reveals further questions.

The first version provides questions, navigation, and visual structure. It does not generate answers, assess mastery, score responses, or act as a tutor. The learning activity is thinking through a question and choosing where to explore next.

The defining experience is a horizontally growing question tree with animated curved branches and a highlighted active path with Markdown embedded in its branches. The right side contains a conventional outline of the focused file's headings.

## 2. Confirmed requirements from the discussion

- [x] Accept a user-selected folder containing Markdown files and nested folders.
- [x] Let the user traverse the imported learning material.
- [x] Support Markdown as the content format.
- [x] Present concepts and follow-up questions in a tree.
- [x] Generate branches automatically; authors do not manually draw connector characters.
- [x] Make branches visibly fork and remain connected like tree branches.
- [x] Use smooth curved branches, with the exact active ancestor path highlighted in blue.
- [x] Grow the tree horizontally as branches open.
- [x] Clicking a file expands that file's Markdown content and reveals further file branches.
- [x] In collapsed mode, show only the question, at most two lines, truncating longer text.
- [x] Animate branch generation, expansion, collapse, and focus changes subtly and smoothly.
- [x] Keep focused files visible as the horizontal workspace changes.
- [x] Put a traditional heading tree on the right side.
- [x] Use the Catppuccin dark theme; proposed flavor is Mocha.
- [x] Reuse suitable React UI libraries to reduce custom implementation work.
- [x] Provide an agent skill in concise “caveman” language for generating compatible learning folders.
- [x] Make that skill's instructions usable with different AI agents, including agents without native skill loading.
- [x] Allow authored answers, explanations, and notes. Keep in-app answer generation outside the current scope.
- [x] Write this specification now; implement later.

“Caveman” describes the skill's instruction style: short, direct sentences. It does not require broken grammar in learning questions or in the application's interface.

## 3. Proposed defaults and remaining decisions

These choices make the specification concrete. They are proposals, not claims that the user has already approved every detail.

| Area | Proposed default | Reason |
| --- | --- | --- |
| Theme | Catppuccin Mocha | Darkest official Catppuccin flavor |
| Entry file | Top-level `index.md` | Predictable entry point for authors and importer |
| Branch source | Relative Markdown links in `## Follow-up questions` | Explicit learning paths independent of disk layout |
| One node | One Markdown file with a primary question as its first H1 | Clear question preview and file identity |
| Multiple expanded files | Allowed | Enables comparison across neighboring branches |
| Focus | Exactly one focused file occurrence | Unambiguous right-side outline |
| Upload processing | Browser-local import | Avoids requiring a backend for reading local documents |
| Persistence | Current browser session only in the initial version | Keeps initial scope small and explicit |
| Generic Markdown folders | Import with a clearly identified folder-based fallback | Allows browsing existing notes without the skill |
| Selected viewport/layout | react-zoom-pan-pinch with a small iterative tree layout | Supports variable-height Markdown and curved connections without graph-editing infrastructure |
| Mobile | Usable responsive fallback; desktop is the primary target | Horizontal exploration needs space |
| Packaging | Directory selection required; ZIP import deferred | Preserves the requested folder workflow |

Implementation defaults selected under the instruction to complete this task:

1. Branches are connected curves. The exact root-to-focus path is blue; unrelated routes remain muted.
2. The right outline covers the focused file’s headings. At 1,100px and below it moves into a dialog.
3. Selecting a child preserves expanded siblings.
4. Supported limits are 1,000 Markdown files, 1 MiB per file, and 20 MiB total; large-folder checks exercise these boundaries.
5. Imports remain in memory for the current session. Persistence is outside this version.

## 4. What the first version excludes

- In-app answer generation, quizzes, scoring, and mastery tracking. Authored answers and explanations are supported Markdown content.
- In-app AI chat, model selection, API keys, and server-side generation.
- In-app Markdown editing, file creation, rename, move, or write-back to the source folder.
- User accounts, collaboration, sharing links, cloud storage, and publishing.
- PDF, DOCX, MDX, HTML documents, executable content, and image-based learning nodes.
- A generic graph editor, manually drawn connections, draggable layout authoring, or arbitrary node creation.
- Mandatory custom JSON manifests, databases, or application-specific markup for authors.
- A full-screen file manager as the central experience.
- Skill installation into the user's agent configuration during this planning task.

Formatting features such as inline code and code blocks remain available within Markdown. They may contain authored answers or solved examples; the app itself does not generate them.

## 5. Primary user journeys

### 5.1 Generate a learning folder with an AI agent

1. User gives the future skill to their preferred AI agent.
2. User supplies a topic, learner level, and optional preparation goal or depth.
3. Agent creates an ordinary folder of `.md` files following the contract below.
4. Agent checks links, reachability, question quality, and any requested answers.
5. User saves or downloads the folder and selects it in Depthwise.

Depthwise does not require the generating agent to connect to the app or upload anything itself.

### 5.2 Import and explore

1. User opens the app and sees a concise explanation plus `Open Markdown folder`.
2. User selects one folder using the browser's folder picker.
3. App reads supported files, validates relationships, and reports actionable problems.
4. For a canonical folder, app opens `index.md` expanded with immediate child questions collapsed.
5. User clicks a child question. Its Markdown expands and its immediate children become visible.
6. The tree rearranges without overlap and the viewport gently brings the selected file into view.
7. The right outline changes to that file's headings.
8. User opens more branches, follows headings, collapses a branch, or returns to its parent.

### 5.3 Import an existing folder

1. User selects a folder that was not created by the skill.
2. App uses explicit canonical relationships where they exist.
3. If the folder has no canonical entry or relationships, app offers folder-based browsing with a clear notice.
4. In folder-based mode, directories become grouping branches and Markdown files become preview nodes.
5. Files without question titles remain browsable using their first H1 or filename. The app does not claim these are skill-compliant question packs.

### 5.4 Replace the current folder

1. User chooses `Open another folder`.
2. App reads the replacement separately from the active session.
3. Canceling selection or failing validation leaves the existing workspace intact.
4. Successful replacement resets the old tree, focus, outline, and document cache together.

## 6. Screen structure

### 6.1 Top toolbar

Keep the toolbar small. Include:

- Product name and current learning-folder title.
- Open another folder.
- Return to root.
- Fit visible branches / reset view.
- Access to import warnings when any exist.
- Optional search as a later enhancement, not a blocker for initial traversal.

Avoid status dashboards, decorative counters, large onboarding panels after import, or unrelated controls.

### 6.2 Main horizontal tree workspace

The main area owns most of the viewport. Parent files sit to the left of child files. Siblings stack vertically. A common branch segment leaves the parent and splits into its children.

Conceptual silhouette; actual previews can be taller:

```text
                                                   ┌── What makes a write expensive?
                           ┌── Why do writes slow? ─┤
                           │                       └── When does maintenance happen?
What is a database index? ──┤
[expanded Markdown here]   ├── How does a B-tree work?
                           │
                           └── When is an index unhelpful?
```

The silhouette matters: branches fork from a shared parent path. Separate floating cards with unrelated lines do not fulfill the tree requirement.

The text diagram above illustrates hierarchy only. The current visual direction explicitly replaces ASCII and box-drawing connectors with smooth SVG curves.

### 6.3 Right heading outline

- Narrow, independently scrollable sidebar; proposed width 320 px on desktop.
- Shows headings from the focused Markdown file in document order.
- Reflects H1–H6 nesting using indentation and small disclosure controls.
- Clicking a heading brings that heading into view inside the expanded file.
- Highlights the current section when the user scrolls through a long preview.
- Shows the focused file title and relative path as orientation context.
- A file with no headings displays `No headings in this file`.
- Exclude the structural `Follow-up questions` section from the preview and heading outline; its links supply the upcoming branches.
- Do not replace this with an operating-system directory browser.
- On narrow screens, expose the outline through a drawer or toggle while preserving access to the main tree.

## 7. File node behavior

### 7.1 Collapsed

- Display only the primary question/title with a maximum of two lines.
- Use consistent width, wrapping, and ellipsis at the end of the second line.
- Keep the full title available to keyboard and assistive-technology users.
- Do not truncate the underlying imported text.
- Provide an unobtrusive expansion affordance, not extra descriptive body text.
- Do not show duplicate question popups on hover or focus. Expanding reveals the full title; the button accessible name always contains the full question.
- File paths and diagnostic badges belong in secondary UI, not the collapsed question text.

### 7.2 Expanded

- Display rendered Markdown within the same branch node.
- Keep the question title identifiable throughout expansion.
- Reveal immediate child nodes in their authored order.
- Keep deeper descendants hidden until their own parent opens.
- Support text selection, normal links, and keyboard navigation inside the preview.
- Do not make every click in the document collapse the node; use the title/disclosure control for toggling.
- Proposed preview width: approximately 576 px on desktop, adjusted for available viewport size.
- Proposed maximum reading height: approximately 65% of viewport height, then internal vertical scrolling.
- Long lines in code blocks or tables scroll within the preview rather than stretching the whole tree.
- Root or leaf files can still expand even when they have no child branches.

### 7.3 Focus and expansion are separate state

- Multiple files may remain expanded, but only one occurrence is focused.
- Clicking a node's heading focuses it and toggles its expansion according to its current state.
- Clicking within an already expanded preview focuses it without collapsing it.
- Moving focus alone must not discard the previous file's expansion or scroll position.
- Provide an explicit collapse control on expanded nodes so behavior is discoverable.
- When collapsing a node, hide its visible descendants and preview. Remember descendant expansion for the session so reopening can restore the explored path.
- If the focused descendant disappears, focus moves to the collapsed ancestor and the right outline follows that ancestor.
- Newly revealed children begin collapsed unless restoring an existing session branch state.

### 7.4 Relative link navigation

- Canonical child links open/focus the matching child occurrence and expand it.
- Other local `.md` links navigate to the referenced file without becoming structural child links.
- For non-child navigation, reveal its existing canonical path when one exists; otherwise open it from the unlinked-files access point.
- Same-file fragment links navigate to headings.
- Cross-file fragments open the destination file and then navigate to its heading.
- A missing target displays a useful inline message; it does not create an empty fabricated file.

## 8. Branch rendering and layout

### 8.1 Appearance

- Draw connected horizontal runs, vertical forks, and junction characters using a consistent monospace grid.
- Use a quieter color for inactive branches and a stronger accent for the focused ancestor path.
- Branches meet the node boundary cleanly without crossing text or Markdown content.
- A single child uses a continuation branch; multiple children use a shared trunk and forks.
- Redrawing follows file expansion dimensions, not hardcoded card heights.
- No arrowheads are needed for the primary tree: left-to-right branching communicates direction.
- No background animation when the user is reading.
- Avoid decorative leaves, bark textures, or botanical illustrations unless the user later asks for that interpretation.

### 8.2 Technical rendering direction

The implemented viewport uses react-zoom-pan-pinch. A custom SVG renderer draws cubic curves between measured node boundaries. React Flow and react-d3-tree were evaluated against variable-height Markdown previews; neither was needed for the selected reading interaction. See docs/design.md for the rationale.

Draw visible SVG curves with no arrowheads. Animate their strokes from parent to child after the viewport reaches the focused question. Highlight only edges on the exact ancestor path, including repeated file occurrences and folder fallback.

Use measured node dimensions and interpolate positions and widths together so curves stay attached during relayout. Keep strokes quiet at rest. Do not animate or pulse branches while reading.

### 8.3 Layout constraints

- Keep sibling order stable and derived from the source file.
- Measure expanded nodes before computing their final positions.
- Maintain readable gaps between branches and previews.
- Recompute layout when a node expands, collapses, or changes measured size.
- Avoid random movement, sibling reshuffling, and connector crossings.
- Do not lay out all hidden descendants as if they were visible.
- Keep the user's point of attention stable during relayout.
- Pan minimally when the focused file is already visible.
- On navigation to an offscreen node, bring it into the unobscured workspace area, accounting for the right sidebar.
- Fit-view should be user initiated; do not repeatedly zoom the whole tree out on every expansion.
- Large trees should remain navigable through panning and controlled zoom without shrinking reading text unexpectedly.

## 9. Motion specification

The following durations are starting values to tune in a real prototype, not researched performance guarantees.

| Event | Proposed motion |
| --- | --- |
| Branch opens | Draw curved connectors from parent toward new children, 420 ms after focus pan completes |
| Child appears | Small 8–12 px horizontal settle and opacity transition, about 160–220 ms |
| Markdown expands | Smooth size/layout transition, about 220–300 ms |
| Siblings move | Coordinated position changes, about 220–300 ms |
| Focus navigation | Await a 360 ms canvas pan before expanding; keep the question anchored during relayout |
| Collapse | Children fade, connectors retract, layout closes, about 180–240 ms |

Requirements:

- Move the viewport first (360ms), await its actual completion, then expand the question and draw new curves (420ms). Pin the focused question during measured relayout. New clicks and manual gestures cancel obsolete openings.
- Keep question text fully available when its node appears. Do not type out every letter.
- Use a gentle ease-out and little or no spring overshoot.
- Small sibling stagger is acceptable, capped so large sibling sets do not create long waits.
- Rapid clicks interrupt or retarget animations cleanly.
- Remove obsolete animated nodes and edges after exit completes.
- Keep rendering geometry and animated geometry synchronized so connectors do not detach while cards move.
- Preserve readable Markdown during transitions; avoid noticeable text stretching.
- With reduced-motion preferences, show the same final layout promptly with no branch typing or automatic animated pan.
- Keep all interactions usable without waiting for a decorative animation to finish.

## 10. Theme and typography

Use Catppuccin Mocha as the proposed dark palette. Values come from the official palette; the roles below are project design choices.

| Role | Token | Hex |
| --- | --- | --- |
| Main background | Base | `#1e1e2e` |
| Sidebar / toolbar background | Mantle | `#181825` |
| Deep background | Crust | `#11111b` |
| Preview surface | Surface 0 | `#313244` |
| Subtle borders | Surface 1 | `#45475a` |
| Inactive decorative branches | Overlay 0 | `#6c7086` |
| Supporting text | Subtext 0 | `#a6adc8` |
| Main text | Text | `#cdd6f4` |
| Focus accent | Mauve | `#cba6f7` |
| Links | Blue | `#89b4fa` |
| Warnings | Yellow | `#f9e2af` |
| Errors | Red | `#f38ba8` |

- Use JetBrains Mono for code and file paths. Use Atkinson Hyperlegible Next for questions and interface text.
- Use Atkinson Hyperlegible Next for Markdown body text; reserve monospace for branches, code, and paths.
- Use 18 px desktop question and body text at normal zoom, with 17 px on phones and generous line height.
- Use restrained borders and surface changes to distinguish expanded content.
- Preserve clear keyboard focus independently from mouse hover and the current reading section.
- Check contrast in the actual composition, especially small muted text and connector visibility.
- Avoid excessive shadows, saturated gradients, bouncing cards, and ornamental dashboard styling.

Reference: [Catppuccin palette](https://catppuccin.com/palette/).

## 11. Folder import contract

### 11.1 Selection and processing

- Required input is a directory containing `.md` files, potentially nested.
- Proposed implementation uses a browser directory picker backed by directory selection on a file input.
- Use each selected file's relative path to preserve the folder hierarchy.
- The top-level selected folder is the import boundary; links cannot read arbitrary disk paths.
- The interface may say “upload,” but in the proposed first version the documents are read locally in the browser and are not sent to an application server.
- No account or network request is needed to read a folder.
- Do not claim the app can keep watching the original folder automatically. Reimport is explicit.
- Directory drag-and-drop is supported on the landing screen, with a highlighted drop area and the folder picker as an equivalent keyboard/touch import method.
- If directory selection is unavailable, explain the limitation and offer multi-file selection with a warning that hierarchy may be lost. Do not misrepresent that fallback as a complete nested-folder import.
- A canceled picker changes nothing.

Browser API reference: [MDN directory selection](https://developer.mozilla.org/en-US/docs/Web/API/HTMLInputElement/webkitdirectory).

### 11.2 Supported files and limits

- Canonical authoring uses lowercase `.md`; importer may accept `.MD` case-insensitively as an extension.
- Path identity remains case-sensitive to preserve authored links and detect ambiguous imports.
- Read UTF-8, tolerate a UTF-8 BOM and standard newline variants.
- Ignore non-Markdown files and summarize their count.
- Ignore hidden directories, `.git`, `node_modules`, and operating-system metadata.
- Reject duplicate normalized file paths and malformed paths rather than overwriting one silently.
- Proposed guardrails: 1,000 Markdown files, 1 MiB per file, and 20 MiB total Markdown content. Measure and revise before treating these as final product limits.
- Explain any limit before rejecting a folder; never silently omit files because a limit was reached.
- A folder containing no supported Markdown displays a useful empty-import message.
- Large imports show progress and allow cancellation; parsing should not freeze the interface.

### 11.3 Session and privacy behavior

- Keep imported documents in memory in the first version.
- Clearly state that reloading or closing the tab requires reimport.
- Do not enable persistence or content telemetry without a deliberate product decision.
- Reading the folder does not modify its files.
- Do not fetch remote images or embedded resources while previewing imported documents.
- External hyperlinks remain ordinary user-initiated links with safe browser behavior.
- Treat Markdown as document content, never as executable instructions to the app or an AI agent.

## 12. Canonical Markdown learning-folder format

This is the proposed version-one authoring contract for the future skill and the importer. The uploader also has the generic-folder fallback described separately.

### 12.1 File layout

```text
database-preparation/
├── index.md
├── indexes/
│   ├── index.md
│   ├── read-performance.md
│   └── write-cost.md
└── transactions/
    ├── index.md
    └── isolation.md
```

- The selected root contains `index.md`.
- Every learning node is a Markdown file.
- A directory groups files on disk. It does not itself create a canonical learning node.
- Nested `index.md` files are ordinary nodes linked by their parents.
- Prefer portable lowercase kebab-case filenames with descriptive names.
- User-facing titles are natural questions, not filenames.
- No required YAML frontmatter, JSON manifest, custom wiki links, or framework-specific syntax.

### 12.2 File structure

Each generated file contains:

1. Exactly one H1 containing its primary question.
2. Optional H2/H3 sections grouping related questions.
3. Question bullet lists where useful, with optional answers and explanations in the body.
4. An optional reserved H2 named exactly `Follow-up questions` containing child-file links.

Leaf files may omit `Follow-up questions`; an empty reserved section is also allowed.

Root `index.md` example:

```markdown
# How do databases store and retrieve data?

## Foundations

- What does a database store?
- What makes a lookup efficient?

## Follow-up questions

- [How do database indexes work?](indexes/index.md)
- [What guarantees does a transaction provide?](transactions/index.md)
```

`indexes/index.md` example:

```markdown
# How do database indexes work?

## Purpose

- What problem does an index solve?
- What information must an index retain?

## Trade-offs

- What extra work does maintaining an index require?
- When might an index be unhelpful?

## Follow-up questions

- [Why can an index make reads faster?](read-performance.md)
- [Why can an index make writes more expensive?](write-cost.md)
```

`indexes/write-cost.md` leaf example:

```markdown
# Why can an index make writes more expensive?

## Trace the work

- What must change when a row is inserted?
- What must change when an indexed value is updated?

## Compare choices

- How would you compare write costs with one index and several indexes?
- What would you measure before adding another index?
```

### 12.3 Structural child-link rules

- Only direct bullet-list items in the reserved H2 section define structural children.
- Each such item contains one ordinary Markdown link to a relative `.md` file.
- The section ends at the next H1 or H2, or the end of the document.
- Child order equals authored link order. Never alphabetize it automatically.
- Resolve paths relative to the source file's directory.
- Normalize `.` and `..` segments and URL-encoded path characters without escaping the selected root.
- Canonical generated links use simple portable paths without query strings or fragments.
- Ordinary navigation links elsewhere may include fragments; they do not create child branches.
- Links in code fences, inline code, or quoted examples do not create branches.
- Parse Markdown structure rather than matching arbitrary link-looking text with a regular expression.
- A repeated child link from the same parent is reported and displayed once.
- The linked file's H1 is the authoritative node question; inconsistent link labels generate a warning.
- External URLs never become child files.

### 12.4 Tree integrity and generic-folder fallback

- Canonical generated folders form a rooted, acyclic tree: every non-root file has exactly one structural parent and is reachable from root `index.md`.
- Cross-topic references use ordinary links outside the reserved structural section.
- For imported noncanonical data, repeated references to one target may be shown as separate occurrences sharing one document identity. Expansion and focus belong to the occurrence; the source text belongs to the file.
- Detect cycles using the current ancestor path. Show a cycle/reference marker at the offending edge and stop traversal there.
- Do not duplicate descendants indefinitely or freeze the app on recursive links.
- Missing child targets are warnings attached to their source file and link.
- Canonical imports with unreachable files expose them through `Unlinked files`; do not invent educational relationships silently.
- Missing top-level `index.md` triggers an explicit choice between selecting an entry file and folder-based browsing.
- A root with no structural children and multiple files offers folder-based browsing; the app explains why only one file would otherwise appear.
- An isolated leaf folder containing just `index.md` remains a valid one-node tree.
- Folder-based mode orders grouping folders and files consistently and labels its hierarchy as folder-derived.

### 12.5 Question quality

- Primary titles should be self-contained questions that make sense in a collapsed node.
- Prefer one main learning idea per file.
- Follow-ups should deepen, challenge, apply, compare, or reveal prerequisites for their parent question.
- Use varied questions about purpose, mechanism, assumptions, trade-offs, failure cases, and application.
- Avoid unrelated topic expansion merely to make a large tree.
- Keep titles phrased as questions. Answers and explanations may appear in the Markdown body, outside the reserved follow-up section.
- Preserve accurate technical terminology even when skill instructions are terse.
- As authoring guidance, aim for roughly 2–5 children and 3–8 related questions per file where useful. These are not importer validation limits.
- Stop at a meaningful preparation boundary. Do not generate an exhaustive encyclopedia by default.

## 13. Markdown preview behavior

- Render headings, paragraphs, lists, emphasis, links, inline code, fenced code, blockquotes, and horizontal rules.
- GitHub-flavored tables, task lists, and strikethrough are reasonable reusable-parser additions, not required authoring syntax.
- Disable raw HTML execution and MDX evaluation.
- Unsupported image assets display a readable placeholder or alt text; they do not produce file nodes or automatic remote requests.
- Preserve source order and meaningful whitespace.
- Generate unique heading anchors consistently, including repeated headings.
- Extract the right outline from the same parsed document representation used for rendering.
- Handle skipped heading levels without inventing headings or changing the document.
- Hide the canonical `Follow-up questions` heading and section contents from previews and outlines. Preserve the source links to generate child branches; navigate follow-ups through those branches.
- Answers, explanations, examples, and notes are supported body content. The skill includes them according to the user's prompt; the app renders the authored Markdown and does not generate answers.

## 14. Reusable React libraries and responsibilities

Prefer existing maintained building blocks; avoid building generic viewport, accessibility primitives, or Markdown parsing from scratch.

| Candidate | Responsibility | Evaluation note |
| --- | --- | --- |
| React Flow | Custom file nodes, viewport, selection, navigation infrastructure | Evaluated; graph-editing infrastructure was unnecessary for the chosen reading UI |
| ELK / elkjs | Layered layout candidate for variable-size expanded nodes | Evaluate against simple tree needs before adopting |
| react-d3-tree | Alternative tree-focused renderer/layout | Compare custom HTML previews and variable-size content before choosing |
| Motion | Subtle layout, entry, and exit transitions | Coordinate with the chosen renderer to prevent competing transforms |
| react-markdown / remark | Markdown rendering and parsed document structure | Reuse one parsing model for headings and structural links |
| Radix primitives | Dialogs, tooltips, disclosure controls, optional sidebar drawer | Keep visual styling aligned to Catppuccin |

Research findings:

- React Flow supports custom React nodes suitable for embedding file previews. [Custom nodes documentation](https://reactflow.dev/learn/customization/custom-nodes)
- React Flow separates layout decisions from viewport rendering and documents external layout options. [Layout guide](https://reactflow.dev/learn/layouting/layouting)
- react-d3-tree is an existing React component for interactive tree diagrams. [Project repository](https://github.com/bkrem/react-d3-tree)
- Motion supports animating layout size and position changes. [Layout animation documentation](https://motion.dev/docs/react-layout-animations)
- react-markdown is a reusable Markdown renderer for React. [Project repository](https://github.com/remarkjs/react-markdown)
- Radix Collapsible provides an existing disclosure primitive. [Component documentation](https://www.radix-ui.com/primitives/docs/components/collapsible)

Selected package versions are pinned by package-lock.json. The selected viewport, Markdown, animation, and dialog libraries do not require paid features. Font licenses ship with the static assets. Curved branch drawing uses SVG stroke animation and the existing Motion and viewport libraries, without a new graph dependency.

The working prototype and browser fixtures exercise an expanded parent, three children, nested follow-ups, and long question titles. The chosen combination handles variable-height previews without a separate graph-layout package. Library comparison was an API/design assessment against these needs; it was not a benchmark claiming all candidate libraries were implemented.

### 14.1 Required agent skills for implementation

The user has installed the needed skills. The current skill catalog confirms `design-taste-frontend`, `vercel-react-best-practices`, `web-design-guidelines`, `webapp-testing`, `skill-creator`, and `humanizer` are available. Future agents must read and apply the relevant skill instructions at the stages below. Merely naming a skill in a report does not count as using it.

| Skill | When to use | Project-specific responsibility |
| --- | --- | --- |
| `design-taste-frontend` | Before visual prototyping, UI implementation, and subsequent visual refinement | Guide typography, spacing, density, branch presentation, responsive behavior, and restrained animation; follow its applicable browser inspection and screenshot refinement workflow |
| `vercel-react-best-practices` | When writing, reviewing, or refactoring React code | Guide component boundaries, state updates, rendering performance, document caching, and bundle size as the visible tree grows |
| `web-design-guidelines` | When reviewing the implemented interface and before release | Review keyboard interaction, accessible expansion controls, visible focus, two-line truncation, outline navigation, contrast, and responsive usability |
| `webapp-testing` | Once a runnable prototype exists and during integration verification | Exercise folder import, branch expansion/collapse, focus changes, heading links, folder replacement, and error states in a real browser; inspect screenshots and browser logs |
| `skill-creator` | Before extracting, creating, or updating the standalone `depthwise-question-tree` skill | Produce a scoped portable skill, preserve exact Markdown rules, validate its structure, and check generated-folder compatibility |
| `humanizer` | After drafting interface copy and the final authoring-skill instructions | Remove generic wording and improve clarity while preserving the requested caveman instruction style and exact format requirements |

Skill-use instructions for the implementing agent:

1. Resolve skills from the active environment's skill catalog and read their `SKILL.md` entrypoints before applying them. Use relevant linked references as directed; do not assume these instructions are identical across versions.
2. Tell the user which skills are being applied when first using them. Apply each skill to the relevant phase rather than loading every skill indiscriminately for every small edit.
3. Preserve this project's explicit requirements when a skill suggests different defaults. Keep the horizontal question tree, curved branches, blue active path, inline Markdown previews, Catppuccin dark palette, question-led navigation with optional answers, and subtle motion. Do not replace this reading interface with a landing-page composition.
4. Use browser and screenshot review to verify the real tree silhouette, connector alignment, expanded text readability, and focus motion. A successful build alone does not establish these visual requirements.
5. For the authoring skill, keep technical paths, the reserved `Follow-up questions` heading, metadata, and examples exact. Copy refinement must not change the content contract or make caveman instructions ambiguous.
6. If a named skill is missing in a future environment, report the specific missing skill and continue independent authorized work. Do not claim it was used, install substitutes silently, or change the project scope.
7. `find-skills` and `skill-installer` are available for discovery or installation when requested; they are setup helpers rather than requirements for ordinary implementation. A separate caveman skill or composition-patterns skill is optional and is not needed to follow this specification.
8. Skills guide the implementation workflow; React Flow, Motion, Radix, and react-markdown remain software libraries. No skill replaces evaluating whether those libraries satisfy the branch and preview requirements.

## 15. Logical application state and processing

This is a responsibility model, not implementation code or a prescribed source-file structure.

1. Importer: obtains files and root-relative paths.
2. Document parser: stores raw text, title, headings, rendered content representation, links, and structural children.
3. Validator: reports bad paths, missing targets, ambiguous structure, cycles, and unreachable files.
4. Traversal model: constructs visible node occurrences from the selected root and expansion state.
5. Layout: measures visible previews and calculates node positions and shared branch routes.
6. Renderer: draws file previews and curved SVG branches.
7. Interaction state: tracks focus, expanded occurrences, per-preview scroll positions, and viewport.
8. Outline: derives heading navigation from the focused document.

Keep document identity as normalized root-relative path. Keep occurrence identity as its traversal path, since a noncanonical file may appear in more than one branch. Do not use question text as a unique identifier.

Parse each file once per import when practical. Reuse document data across occurrences. Parse or render large offscreen previews lazily where this improves responsiveness. Avoid recursive call-stack assumptions for arbitrarily deep folder input.

## 16. Accessibility and interaction details

- Every expandable file has a keyboard-operable control with a meaningful accessible name and expanded state.
- Enter/Space toggles the focused disclosure control.
- Provide keyboard movement to parent, visible children, and visible siblings; document the chosen shortcuts in a small help view.
- Arrow shortcuts apply when a node control owns focus, not when the user is selecting document text or scrolling a code block.
- Decorative SVG branches are hidden from assistive technology.
- Provide a meaningful hierarchy/order for reading nodes without depending on visual coordinates.
- The right outline is a labeled navigation region with links to document headings.
- Maintain focus after collapse, reflow, outline navigation, and folder replacement.
- Avoid keyboard traps in internally scrollable previews.
- Tooltips are supplementary and never the only way to access a full truncated question.
- Selection and focus must be discernible without color alone.
- Account for reduced motion, browser zoom, and high display scaling.

## 17. Error and empty states

| Condition | Expected result |
| --- | --- |
| No folder selected | Focused empty state with folder action and concise format guidance |
| Selection canceled | Preserve current state |
| No Markdown | Explain supported format and allow reselection |
| Missing entry | Offer entry selection or folder-based browsing |
| Empty file | Render a titled empty node with a diagnostic |
| No H1 | Use filename fallback and report authoring warning |
| Multiple H1 headings | Use the first as title; report noncanonical structure |
| Broken link | Identify source and missing target; keep valid branches usable |
| Cycle | Show a reference marker and stop that recursive branch |
| Unreachable file | Make accessible through unlinked-files UI |
| Unsupported file | Ignore and summarize |
| Duplicate normalized path | Reject ambiguous input with exact paths |
| Size limit exceeded | Explain limit and preserve current active import |
| Read/decode failure | Name affected file and explain how to retry |
| No headings | Keep file readable and show an empty outline message |
| Layout failure | Offer reset/retry while preserving imported documents |

Warnings should be accessible from a compact summary and the affected file. Do not block an entire usable folder for one bad link. Fatal errors are limited to conditions that prevent a coherent import, such as ambiguous paths or exceeded supported limits.

## 18. Portable agent skill

### 18.1 Deliverable and portability

Implemented skill: [skills/depthwise-question-tree/SKILL.md](skills/depthwise-question-tree/SKILL.md). The public download is [public/depthwise-question-tree-SKILL.md](public/depthwise-question-tree-SKILL.md); a contract test keeps both copies identical.

The deliverable is a folder containing `SKILL.md`. If the entrypoint becomes too large, move the exact Markdown contract and worked examples into a linked reference. Do not require executable scripts or agent-specific APIs for ordinary generation.

The skill's `SKILL.md` uses standard name/description frontmatter. An agent with native skill support can load it. A person using another agent can paste the instruction body into that agent and request the same output. Native automatic discovery varies between tools; do not promise universal automatic installation or invocation.

Keep the skill outside the generated learning folder. Otherwise `SKILL.md` itself would be imported as learning material. The learning folder contains question-led Markdown documents, with optional answers and notes.

The complete instruction draft below was extracted into the standalone skill and downloadable copy. It was used as a plain instruction document to generate the database and ecology examples, without registering a native skill. Agent-global installation is not required and was not performed.

### 18.2 Implemented SKILL.md instructions

The outer four-backtick fence preserves the inner Markdown examples. These instructions were extracted into the standalone skill.

````markdown
---
name: depthwise-question-tree
description: Create linked Markdown question trees for Depthwise from topics, notes, or projects. Use for concept exploration, idea development, brainstorming, decisions, or study and interview preparation. Structure progressively deeper follow-ups, with optional answers and explanations suited to the user's prompt.
---

# Make question tree

Make folder. Put Markdown inside. User opens folder in Depthwise. App grows question branches.

This skill makes learning material. User asks to build or change app itself? This skill not needed.

## Know the goal

Read user's topic and goal. Read level if relevant. Use supplied notes or project details if given. Interviews only one use. Ideas, decisions, brainstorming, and general exploration work too.

Missing detail blocks useful work? Ask short question. Else choose sensible scope. State choice.

Write clear questions. Answers and explanations allowed. User asks questions only? Leave answers out. User asks answers? Include them at requested depth. No preference? Choose a useful format for the goal. Main prompt decides content, detail, tone, and formatting. Do not force an answer heading, fixed section layout, or fixed answer length.

Open-ended idea has no settled answer? Give possible directions and label assumptions. Missing project facts? Ask or state what unknown. Do not invent implementation details.

Keep technical names correct. Caveman style belongs here, in instructions. Learning questions use clear natural language.

## Make files

- One learning folder.
- Root file named `index.md`.
- Every learning file ends `.md`.
- One main question per file. First H1 is that question.
- Follow user's organization for the body. Related questions may use lists or subheadings when useful.
- Need deeper topic? Make child file.
- File names lowercase kebab-case. Paths use `/`.
- Nested folders okay. Folder alone is no learning node.
- Body uses normal Markdown. Answers, explanations, examples, notes, and open questions all okay.
- Use paragraphs, headings, lists, emphasis, code blocks, tables, or blockquotes when useful. Follow user's requested formatting. Do not impose a template beyond the app's navigation structure.
- No JSON manifest. No required frontmatter. No MDX. No wiki links.
- No images, PDFs, scripts, or app code in learning folder.
- Keep this skill outside learning folder.
- App limits: 1,000 Markdown files, 1 MiB per file, 20 MiB Markdown total. User asks for more? Split into separate learning folders.

## Connect branches

Parent file gets exact H2: `## Follow-up questions`.

Under it, put direct bullet links. One child link per bullet. Use ordinary Markdown.

```markdown
## Follow-up questions

- [Why does this happen?](why.md)
- [When does this fail?](cases/failure.md)
```

Paths start from parent file's folder. Target file must exist. Target stays inside learning folder.

Link label matches child's H1. Order links by useful learning order.

Leaf has no children? Omit section or leave empty.

Keep content outside reserved Follow-up questions section. App hides that section and shows its links as branches. No Answer heading needed; content can start right under the H1.

Every non-root file gets one branch parent. Every file reachable from root. No cycles. No self-links. No repeated child link.

Need reference across branches? Put ordinary link outside `Follow-up questions`. Do not give file second branch parent.

Do not draw ASCII tree inside learning files. App draws tree from links.

## Make good questions

Start broad. Go deeper step by step.

Ask why. Ask how. Ask assumptions. Ask trade-offs. Ask failure cases. Ask comparisons. Ask application.

Child must help explore parent. Do not add unrelated branches for size.

Keep title useful alone. Avoid vague titles like “More” or “Part two”. Keep title as question; put any answer in body.

Usually few children per file. Usually few related questions inside. Let topic and user decide exact count.

No depth requested? Start small: about 10–20 files, usually 2–4 levels. Small topic needs fewer. User scope wins.

Use learner's language. Keep standard technical terms. Do not pretend disputed claims are settled facts.

## Example shape

```text
learning-folder/
├── index.md
└── indexes/
    ├── index.md
    └── write-cost.md
```

Root `index.md`:

```markdown
# How do databases retrieve data?

A database executes a query plan that reads and combines the required data.

## Foundations

- What determines the cost of finding a row?

## Follow-up questions

- [How do database indexes work?](indexes/index.md)
```

`indexes/index.md`:

```markdown
# How do database indexes work?

An index stores searchable keys and a way to locate matching rows. It can reduce the work needed for a selective lookup.

## Explore

- What problem does an index solve?
- When would an index be unhelpful?

## Follow-up questions

- [Why can an index make writes more expensive?](write-cost.md)
```

`indexes/write-cost.md`:

```markdown
# Why can an index make writes more expensive?

Writes may update both table data and index entries. Extra indexes can therefore add maintenance work.

## Trace changes

- What must change when an indexed value changes?
- What would you measure before adding another index?
```

## Check before handoff

- Root `index.md` exists.
- Each file has one H1 question.
- All child paths resolve from source folder.
- No path leaves learning folder.
- Child label matches target H1.
- Every file reachable. Each non-root has one branch parent.
- No cycle. No repeated child. No missing file.
- Only intended learning Markdown in folder.
- Answers present or absent as user requested. Keep them outside reserved follow-up section.
- Questions and any answers fit user's goal and level. Check facts and label uncertainty.

Fix problems before handoff. Say what you actually checked. Do not claim app upload tested unless done.

## Hand over

Can write files? Create folder in user's workspace. Give folder path. State file count and scope.

Cannot write files? Give folder tree and full contents for each file, labeled by relative path. User can save them.

Finish with short instruction: Open Depthwise. Drop generated folder onto landing screen. Or choose Open Markdown folder and select it.

Do not upload, publish, install packages, or call model APIs just to make this folder.
````

### 18.3 Example user prompts for the skill

- “Create a beginner question tree about database indexes for Depthwise.”
- “Turn these networking study topics into a question-only Markdown folder, three levels deep.”
- “Make an interview preparation tree about operating-system memory management. No answers.”
- “Use these course notes to produce a linked Markdown question folder. Keep the scope to the first two chapters.”

### 18.4 Skill validation

- Frontmatter and skill naming were validated using the installed skill-creator validator; the example and public-copy contract checks run in the test suite.
- Generate a small folder and import it into the implemented app.
- Verify relative paths from nested directories, leaf handling, child order, and heading outlines.
- Try one topic outside computing to confirm the skill is not tied to database examples.
- Try the instruction body in an agent without native skill discovery; check that manual use remains clear.
- Verify both question-only and question-and-answer output according to the requested mode, with appropriately bounded scope.
- Keep a compact canonical example as a shared importer/skill compatibility fixture.

## 19. Implementation task breakdown

### Phase A: settle the format and visual prototype

- [x] Read and apply `design-taste-frontend` before prototyping; read `vercel-react-best-practices` before writing React components.
- [x] Review proposed defaults and resolve any conflicting interpretation of tree appearance.
- [x] Freeze the version-one Markdown relationship contract.
- [x] Choose readable fonts and verify connected branch geometry.
- [x] Evaluate React Flow against react-d3-tree using variable-height previews.
- [x] Choose a layout engine based on observed needs.
- [x] Validate curved branch appearance, expansion, and focus-before-expand motion in the browser.
- [x] Confirm reusable components can be themed consistently.

### Phase B: folder import and document model

- [x] Add folder selection and preserve nested relative paths.
- [x] Implement file filtering, decode handling, limits, and cancellation.
- [x] Parse titles, headings, links, and structural children using Markdown syntax.
- [x] Normalize paths and resolve links within the selected root.
- [x] Add canonical-root selection and generic-folder fallback.
- [x] Add validation diagnostics, cycle termination, and unlinked-file access.
- [x] Make import replacement atomic from the user's perspective.

### Phase C: tree browsing

- [x] Render the root and immediate collapsed children.
- [x] Implement two-line question truncation.
- [x] Implement inline Markdown expansion and collapse.
- [x] Measure preview sizes and lay out shared forks without overlap.
- [x] Add focus, parent navigation, and stable session expansion state.
- [x] Add local Markdown navigation and heading fragments.
- [x] Add viewport controls that preserve readable focus.

### Phase D: outline, theme, and motion

- [x] Apply `design-taste-frontend` to visual refinement and `web-design-guidelines` to the implemented interface review.
- [x] Build the right heading tree from parsed Markdown.
- [x] Implement heading navigation and active-section tracking.
- [x] Apply Catppuccin Mocha tokens and responsive widths.
- [x] Animate generated branch runs and coordinated layout changes.
- [x] Handle rapid interaction and reduced-motion preferences.
- [x] Complete keyboard operation and screen-reader hierarchy.
- [x] Verify text selection and nested scrolling do not trigger accidental collapse.

### Phase E: authoring skill and release readiness

- [x] Apply `skill-creator` to the standalone authoring skill and `humanizer` to final copy without changing format rules.
- [x] Use `webapp-testing` for actual browser verification and address findings from `web-design-guidelines` before release.
- [x] Extract and refine the proposed standalone skill.
- [x] Validate skill structure and portable manual usage.
- [x] Generate example question folders and verify actual imports.
- [x] Run meaningful importer and browser interaction checks.
- [x] Measure a realistically large folder and tune supported limits.
- [x] Document current-session persistence and browser support clearly.
- [x] Review final UI against the branch silhouette and motion requirements.

## 20. Acceptance criteria

### 20.1 Core experience

- [x] A person can select a nested Markdown folder and begin traversing it without an account.
- [x] A skill-generated folder opens at `index.md` with authored child order preserved.
- [x] Clicking a collapsed file expands its own Markdown and reveals its immediate children.
- [x] Multiple expanded branches remain usable without content overlap.
- [x] Collapsed questions occupy at most two lines and expose the complete title accessibly.
- [x] Branches visibly connect parent and child cards with smooth curves and exact active-path highlighting.
- [x] Deeper files grow horizontally from their parents.
- [x] The selected file is brought into view without disruptive automatic zooming.
- [x] The right outline lists and navigates the focused file's headings.
- [x] The app uses the agreed Catppuccin dark palette consistently.
- [x] Animation is subtle and can be reduced without losing functionality.
- [x] Folder replacement and canceled imports preserve coherent state.

### 20.2 Content robustness

- [x] Nested relative links, including safe `../` paths, resolve correctly.
- [x] Root-escaping paths cannot read outside the selected folder.
- [x] Links inside code examples do not create branches.
- [x] Cycles and repeated references do not create infinite trees.
- [x] Missing files produce actionable warnings without breaking valid branches.
- [x] Generic Markdown folders remain traversable through a labeled fallback.
- [x] Duplicate headings can be navigated independently.
- [x] Empty and long files remain usable.
- [x] Unsupported embedded content does not execute or fetch automatically.
- [x] Local import does not alter source files or send document content to a server.

### 20.3 Skill outcome

- [x] The standalone skill has valid metadata and clear triggering scope.
- [x] Its instruction body uses short, direct caveman-style language without sacrificing exact format rules.
- [x] It can produce an uploadable folder from a topic using ordinary files and Markdown links.
- [x] It follows the requested answer depth and checks links and tree integrity.
- [x] A person can use the instructions manually with an AI agent that lacks native skill support.
- [x] Generated output works in the implemented viewer without conversion.

## 21. Verification plan

Use targeted checks that verify real behavior, not snapshots of implementation details.

- Import fixtures: a valid nested tree, a one-file tree, a generic notes folder, a missing target, a cycle, a shared reference, a root-escaping link, Unicode filenames, duplicate headings, and a long question.
- Browser flow: select folder → open child → reveal grandchildren → focus another file → navigate heading → collapse ancestor → reopen → replace folder.
- Visual review: continuous branch junctions, variable-height previews, stable sibling order, two-line truncation, theme, and narrow-screen outline access.
- Motion review: interruption, rapid repeated clicks, preserved focus, synchronized connectors, and reduced-motion mode.
- Accessibility review: keyboard-only import/navigation, disclosure state, readable full titles, outline links, and no focus loss after collapse.
- Performance review: proposed maximum import size, deep trees, broad sibling sets, parsing responsiveness, and collapsed hidden descendants.
- Skill compatibility: generate and import at least two small folders in different subjects; inspect quality rather than assuming valid syntax guarantees useful questions.

## 22. Definition of done

The original planning request was completed before implementation. The subsequent implementation request requires the application, portable skill, verified examples, passing checks, feature commits, and an evidence-backed completion audit.

The product is complete for the first version when the acceptance criteria above pass and a user can generate a question folder with the portable skill, select that folder in Depthwise, and explore its Markdown through connected animated branches and the right-hand heading outline.


## 23. Implementation decisions and completion evidence

The implementation is in `src/`, the portable authoring skill is in `skills/depthwise-question-tree/`, and the two compatible question folders are in `examples/`. See [README.md](README.md) for local usage and [docs/verification.md](docs/verification.md) for a requirement-to-evidence map and reproducible commands.

### 23.1 Final implementation choices

- React + TypeScript + Vite, with browser-local documents and no backend.
- Reusable react-zoom-pan-pinch viewport, Motion transitions, Radix Dialog controls, unified/remark/rehype parsing and sanitized rendering.
- One parsed representation per document supplies headings, structural links, and rendered content. Parser work runs in a worker; directory reads are batched and cancellable.
- Iterative tree layout measures expanded previews, preserves authored order, and draws shared box-character forks. General graph-editing features were not needed.
- Root, relative links, unlinked files, generic folder fallback, cycle stops, and actionable warnings are implemented.
- Catppuccin Mocha with locally bundled JetBrains Mono and Atkinson Hyperlegible Next; font licenses ship under `public/licenses/`.
- Expanded previews mount lazily and animate their height without scaling text. Collapsed nodes retain question controls for accessible tree traversal. Heading navigation moves into a dialog on narrower screens.
- The skill uses plain Markdown instructions and ordinary file paths. Native agent discovery is optional; no model APIs or agent-global installation are needed to generate or import a pack.

### 23.2 Verification gates

- Unit and contract suite: 16 passing tests covering the parser, paths, tree layout, large-depth traversal, example integrity, and identical skill downloads.
- TypeScript and Vite production build: passed.
- Source formatting: passed.
- Skill-creator structural validation: passed.
- Real Chrome acceptance suite: passed against development and production preview, including actual folder selection, navigation, keyboard controls, errors, reduced motion, and the packaged skill download.
- Stress suite: passed with 1,000-file wide and deep folders, 19,762,347 bytes of Markdown, cancellation, encoding/count failures, long previews, and rapid clicks. Observed times and UI responsiveness are recorded in `docs/verification.md`.
- Taste source and three-width browser inspection: reviewed. Explicit product choices override generic style defaults; intentional exceptions are documented in `docs/design.md`.
- Web-interface review: addressed dialog focus restoration, an explicit workspace H1, keyboard controls, preview regions, visible focus, heading anchors, local/inert embeds, dark color scheme, touch/scroll behavior, and long-content handling.
- Copy review: kept interface actions concrete and preserved exact technical strings and the requested caveman-style skill body.

### 23.3 Evidence boundaries

The verified browser engine is desktop Chrome, including 1440px, 768px, and 390px layouts. Other engines and native screen-reader software are not separately certified. This is a browser-local first version; refresh clears the session. No cloud deployment or public publishing is included. These limits preserve the original scope rather than adding new product work.

Generated screenshots and machine-readable browser reports live under ignored `artifacts/` and can be reproduced using the checked-in tests. Commit history records verified feature milestones; all staging is scoped to the Depthwise directory in the existing parent repository.


### 23.4 Verified feature commits

- `c215093`: Markdown import validation, relationship parsing, and tree model; 12 unit tests and TypeScript check passed before commit.
- `d72c08b`: animated ASCII explorer, inline previews, outline, viewport controls, and real folder navigation; production build, browser acceptance, formatting, and visual checks passed before commit.
- `e99a15a`: portable authoring skill, compatible sample validation, large-folder improvements, responsive refinement, and run instructions; 16 tests, production browser checks, skill validation, and stress checks passed before commit.

The initial documentation commit closed the first-version checklist and recorded its verification audit. The subsequent user-requested readability improvement is recorded below.


### 23.5 Readability follow-up for a 24-inch 1080p monitor

Replaced the reading font with locally hosted Atkinson Hyperlegible Next. Questions now use the reading face rather than monospace, at 18px desktop / 17px phone; Markdown uses the same sizes. Outline links are 16px and secondary labels are at least 14px. The monospace constraint now applies to code and paths, following the user's request for more readable fonts.

Desktop expanded files are 576px wide, collapsed questions are 336px wide, and the right outline is 320px wide. Compact files use 316.8px / 288px. The wider layout preserves two-line truncation and existing branch geometry.

`tests/readability_browser.py` verifies loaded font families, computed reading sizes, 100% display scale, no document overflow, and expansion at 1920×1080; it also checks 1440×900 and 390px layouts. The existing browser acceptance suite and all 16 unit/contract tests remain passing.

### 23.6 Follow-ups appear in branches only

- [x] Remove the duplicate follow-up heading and link list from expanded previews and their heading outlines.
- [x] Keep source Markdown unchanged and use its follow-up links to generate upcoming branches.
- [x] Preserve ordinary reference links outside the reserved section, including reference-style links defined inside it.
- [x] Add regression coverage for hidden sections, child extraction, missing-child diagnostics, and branch navigation. User confirmed the change visually and requested committing without further verification.

### 23.7 Curved branches and focus-first motion

The user replaced the earlier ASCII requirement with a polished curved tree. This supersedes historical references to terminal glyphs. Preserve Markdown import with optional answers, inline previews, authored ordering, the right outline, Catppuccin dark, and large reading type.

- [x] Rounded question surfaces, curved SVG branches, and quiet connection ports.
- [x] Highlight the precise root-to-focused occurrence path in blue, including folder fallback.
- [x] Await completion of the canvas move before mounting expanded Markdown and revealing child branches.
- [x] Anchor the focused question during measured relayout; newer requests and user gestures cancel pending openings.
- [x] Respect reduced motion with immediate final states.
- [x] Replace purple highlights with consistent blue. Use the existing highlighted node border as the sole focus indicator for its question button and reading preview; remove the duplicate outline. Keep focus indicators on other controls and links.
- [x] Update the empty-state illustration to match the new tree.

### 23.8 Remove duplicate question popups

- [x] Remove both the custom question tooltip and native title popup from question buttons. Preserve full accessible names and full titles when expanded.
- [x] Leave changes uncommitted for user review.

### 23.9 Landing-page folder drop

- [x] Add a visible drop area with drag-over and release feedback, matching the dark theme and readable type. Keep the folder-picker button.
- [x] Accept a single folder, preserve nested paths, and read every directory batch. Ignore hidden directories and node_modules. Reject mixed roots instead of merging unrelated packs.
- [x] Route drops through existing Markdown validation and import progress/cancellation. Enforce limits while scanning. Files stay in the browser.
- [x] Handle dropped files when directory entries are unavailable. Keep drag state steady while crossing child elements; reset it on leave, drop, drag-end, or window blur.
- [x] Add regression coverage for directory batches, nested paths, ignored directories, cancellation, limits, empty/unreadable entries, and unsupported drops.

### 23.10 Aligned, looping landing demonstration

- [x] Replace negative-margin positioning with a balanced two-column layout: import content on the left, demonstration vertically centered on the right, footer spanning both columns. Stack cleanly on narrow screens.
- [x] Loop a 9-second demonstration of the real interaction: show the tree, highlight the upper branch, pan to its question, then expand its Markdown and reveal two follow-ups. Continue into the B-tree question, expand its preview and reveal another level, then collapse and move back to the original tree without a jump.
- [x] Demonstrate questions with brief answers. Keep landing text and drop controls static and usable during playback.
- [x] Do not show a play/pause button, as requested. Pause automatically when offscreen or the tab is hidden, and show a static overview under reduced-motion preferences.
- [x] Keep the mobile canvas at a readable scale and clip its viewport, rather than shrinking all question text.
- [x] Verify alignment, animation ordering, preview/branch reveal, return state, infinite repetition through two questions, absence of playback controls, reduced motion, and responsive overflow in the browser.

- [x] Remove the extra “A small question can go a long way” caption above the demonstration, per final review.

### 23.11 skills.sh authoring-skill package

- [x] Check the official skills.sh FAQ, CLI discovery documentation, and Agent Skills specification.
- [x] Preserve the standard `skills/depthwise-question-tree/SKILL.md` layout and matching YAML name; refine the description for discovery while keeping caveman-style instructions.
- [x] Sync the app's downloadable skill, document GitHub publication and installation, and export a standalone skill repository ZIP.
- [x] Preserve the earlier landing-spacing changes separately. No GitHub upload, CLI install, or skills.sh listing has been performed.

### 23.12 Optional answers and broader exploration

This replaces the earlier question-only restriction. The skill is general: topics, notes, projects, ideas, decisions, brainstorming, and preparation can all become question trees. Interview preparation is one example.

- [x] Allow answers, explanations, examples, and notes in ordinary Markdown. Honor explicit requests for questions only or a particular answer depth.
- [x] Keep H1 questions and authored follow-up links as the navigation structure. Keep answers outside the reserved follow-up section so they remain visible.
- [x] Add ordinary answer paragraphs to every database and ecology example, with supporting source links and no required Answer heading. These appear in the built-in database tree.
- [x] Show short answers in both steps of the animated landing preview and in the folder-format sample. Remove the question-only footer claim.
- [x] Sync the authoring skill, public download, publication guide, and exported package. Update tests to verify visible answers and intact tree links.

### 23.13 Prompt-led Markdown content

- [x] Do not impose an Answer heading or fixed document template. Examples use ordinary paragraphs after the main question.
- [x] Let the main user prompt determine answers, notes, explanations, depth, tone, and Markdown formatting. Use supported Markdown headings, lists, emphasis, code blocks, tables, and blockquotes as appropriate.
- [x] Preserve only the app's structural contract: root index.md, primary H1, and relative child links in the reserved follow-up section.

### 23.14 Header context and unobscured canvas focus

- [x] Move the folder breadcrumb, tree title, and orientation line into the application header. Keep mobile Outline available there.
- [x] Remove duplicate context overlays from the canvas and focus files 24px below its top. Preserve the move-then-expand sequence.
- [x] Reserve space for bottom controls and status, including safe-area insets. Cap expanded card height and scroll its Markdown body.
- [x] Use actual available canvas dimensions for focus and fit-view.
- [x] Check header placement and focused-card clearance at 1920, 1440, 1280, 768, and 390px, including a long document at 720px viewport height.

### 23.15 Project-style landing and copyable installation

- [x] Add project, skill, and GitHub navigation using the supplied dis70rt/depthwise repository.
- [x] Add a click-to-copy skills CLI command and a separate reusable prompt block with success feedback and manual-copy fallback.
- [x] Place installation in the left hero column below the main actions; keep the animated tree on the right.
- [x] Use a compact dashed folder drop button with clear drag-and-drop or click-to-browse instructions and subtle drag feedback. Keep “Or explore an example tree →” below the button, and limit the left-side install block to 420px.
- [x] Add scroll sections explaining the website, ordinary Markdown, the skill file, and the topic-to-folder-to-tree workflow. Keep direct download and folder-format access.
- [x] Respect reduced motion, preserve local folder import, and keep the main canvas unchanged.
