# Depthwise: implementation task and product specification

Status: completed and verified (2026-10-21, Asia/Kolkata). The user subsequently authorized building this specification and committing features after passing checks. The original planning-only restriction has been superseded. See section 23 and docs/verification.md for implementation decisions and verification evidence.

## 1. Purpose

Depthwise helps people prepare concepts by exploring questions and follow-up questions as a visual tree. A person brings a folder of Markdown files, opens it in the application, and traverses the relationships between those files. Opening a question expands its Markdown preview in its branch and reveals further questions.

The first version provides questions, navigation, and visual structure. It does not generate answers, assess mastery, score responses, or act as a tutor. The learning activity is thinking through a question and choosing where to explore next.

The defining experience is a horizontally growing, animated ASCII tree with Markdown embedded in its branches. The right side contains a conventional outline of the focused file's headings.

## 2. Confirmed requirements from the discussion

- [x] Accept a user-selected folder containing Markdown files and nested folders.
- [x] Let the user traverse the imported learning material.
- [x] Support Markdown as the content format.
- [x] Present concepts and follow-up questions in a tree.
- [x] Generate branches automatically; authors do not manually draw connector characters.
- [x] Make branches visibly fork and remain connected like tree branches.
- [x] Preserve the ASCII/terminal character appearance of the main tree.
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
- [x] Keep answers and answer generation outside the current scope.
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
| Selected viewport/layout | react-zoom-pan-pinch with a small iterative tree layout | Supports variable-height Markdown and ASCII junctions without graph-editing infrastructure |
| Mobile | Usable responsive fallback; desktop is the primary target | Horizontal exploration needs space |
| Packaging | Directory selection required; ZIP import deferred | Preserves the requested folder workflow |

Implementation defaults selected under the instruction to complete this task:

1. Branches are connected terminal-style forks, preserving the requested ASCII appearance.
2. The right outline covers the focused file’s headings. At 1,100px and below it moves into a dialog.
3. Selecting a child preserves expanded siblings.
4. Supported limits are 1,000 Markdown files, 1 MiB per file, and 20 MiB total; large-folder checks exercise these boundaries.
5. Imports remain in memory for the current session. Persistence is outside this version.

## 4. What the first version excludes

- Answers, explanations presented as answers, answer generation, hints that give away solutions, quizzes, scoring, and mastery tracking.
- In-app AI chat, model selection, API keys, and server-side generation.
- In-app Markdown editing, file creation, rename, move, or write-back to the source folder.
- User accounts, collaboration, sharing links, cloud storage, and publishing.
- PDF, DOCX, MDX, HTML documents, executable content, and image-based learning nodes.
- A generic graph editor, manually drawn connections, draggable layout authoring, or arbitrary node creation.
- Mandatory custom JSON manifests, databases, or application-specific markup for authors.
- A full-screen file manager as the central experience.
- Skill installation into the user's agent configuration during this planning task.

Formatting features such as inline code and code blocks remain available within Markdown. Supporting those features does not mean generating solved examples or answers.

## 5. Primary user journeys

### 5.1 Generate a learning folder with an AI agent

1. User gives the future skill to their preferred AI agent.
2. User supplies a topic, learner level, and optional preparation goal or depth.
3. Agent creates an ordinary folder of `.md` files following the contract below.
4. Agent checks links, reachability, question quality, and the absence of answers.
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

ASCII is being used in the familiar terminal-art sense. The examples use Unicode box-drawing characters (`─`, `│`, `┌`, `├`, `└`, `┤`) rather than strictly seven-bit ASCII. A strict ASCII fallback may use `-`, `|`, and `+`; this distinction must not accidentally change the visual direction.

### 6.3 Right heading outline

- Narrow, independently scrollable sidebar; proposed width 240–280 px.
- Shows headings from the focused Markdown file in document order.
- Reflects H1–H6 nesting using indentation and small disclosure controls.
- Clicking a heading brings that heading into view inside the expanded file.
- Highlights the current section when the user scrolls through a long preview.
- Shows the focused file title and relative path as orientation context.
- A file with no headings displays `No headings in this file`.
- Treat the structural `Follow-up questions` section as a normal outline entry when present.
- Do not replace this with an operating-system directory browser.
- On narrow screens, expose the outline through a drawer or toggle while preserving access to the main tree.

## 7. File node behavior

### 7.1 Collapsed

- Display only the primary question/title with a maximum of two lines.
- Use consistent width, wrapping, and ellipsis at the end of the second line.
- Keep the full title available to keyboard and assistive-technology users.
- Do not truncate the underlying imported text.
- Provide an unobtrusive expansion affordance, not extra descriptive body text.
- Hover may reveal the full title; keyboard focus must offer an equivalent way to read it.
- File paths and diagnostic badges belong in secondary UI, not the collapsed question text.

### 7.2 Expanded

- Display rendered Markdown within the same branch node.
- Keep the question title identifiable throughout expansion.
- Reveal immediate child nodes in their authored order.
- Keep deeper descendants hidden until their own parent opens.
- Support text selection, normal links, and keyboard navigation inside the preview.
- Do not make every click in the document collapse the node; use the title/disclosure control for toggling.
- Proposed preview width: approximately 480–640 px, adjusted for available viewport size.
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

The implemented viewport uses react-zoom-pan-pinch. A custom connector renderer places box-drawing glyphs along calculated orthogonal routes. React Flow and react-d3-tree were evaluated against variable-height Markdown previews; neither was needed for the selected reading interaction. See docs/design.md for the rationale.

SVG paths may be used internally for measuring routes or clipping an animation, but the visible result must preserve the agreed terminal branch appearance. Do not substitute ordinary curves simply because the library makes them easy.

Measure glyph advance and line height, snap routes to the same character grid, and keep junctions aligned. Avoid creating one React component per character across the whole forest; use grouped text runs or a similarly efficient renderer. Validate connector alignment at supported zoom levels and browser display scaling before committing to an approach.

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
| Branch opens | Reveal connector runs from parent toward the new children, about 180–240 ms |
| Child appears | Small 8–12 px horizontal settle and opacity transition, about 160–220 ms |
| Markdown expands | Smooth size/layout transition, about 220–300 ms |
| Siblings move | Coordinated position changes, about 220–300 ms |
| Focus navigation | Minimal viewport pan, about 250–350 ms |
| Collapse | Children fade, connectors retract, layout closes, about 180–240 ms |

Requirements:

- Animate branch segments as growing connected runs; do not scramble glyphs randomly.
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

- Use monospace for tree glyphs, question titles, and small navigation labels.
- Evaluate a readable text face for Markdown bodies; monospace throughout remains an option if comfortable for long reading.
- Keep body text around 15–16 px at normal zoom with generous line height.
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
- Directory drag-and-drop is optional progressive enhancement, not the only import method.
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
3. Question-only bullet lists where useful.
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
- Do not embed answers in a question's wording or append explanations after questions.
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
- Keep canonical follow-up links visible in the preview as navigation controls even though the same relationships also appear as branches.
- Imported answers, if present in an existing document, are not automatically detected or deleted. The app does not generate answers; the skill produces question-only folders.

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

Selected package versions are pinned by package-lock.json. The selected viewport, Markdown, animation, and dialog libraries do not require paid features. Font licenses ship with the static assets. General graph-library edge animations were not used as a substitute for the ASCII connector renderer.

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
3. Preserve this project's explicit requirements when a skill suggests different defaults. Keep the horizontal ASCII tree, connected forks, inline Markdown previews, Catppuccin dark palette, question-only scope, and subtle motion. Do not replace this reading interface with a landing-page composition.
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
6. Renderer: draws file previews and ASCII branches.
7. Interaction state: tracks focus, expanded occurrences, per-preview scroll positions, and viewport.
8. Outline: derives heading navigation from the focused document.

Keep document identity as normalized root-relative path. Keep occurrence identity as its traversal path, since a noncanonical file may appear in more than one branch. Do not use question text as a unique identifier.

Parse each file once per import when practical. Reuse document data across occurrences. Parse or render large offscreen previews lazily where this improves responsiveness. Avoid recursive call-stack assumptions for arbitrarily deep folder input.

## 16. Accessibility and interaction details

- Every expandable file has a keyboard-operable control with a meaningful accessible name and expanded state.
- Enter/Space toggles the focused disclosure control.
- Provide keyboard movement to parent, visible children, and visible siblings; document the chosen shortcuts in a small help view.
- Arrow shortcuts apply when a node control owns focus, not when the user is selecting document text or scrolling a code block.
- Decorative ASCII branches are hidden from assistive technology.
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

Keep the skill outside the generated learning folder. Otherwise `SKILL.md` itself would be imported as learning material. The learning folder contains question documents only.

The complete instruction draft below was extracted into the standalone skill and downloadable copy. It was used as a plain instruction document to generate the database and ecology examples, without registering a native skill. Agent-global installation is not required and was not performed.

### 18.2 Implemented SKILL.md instructions

The outer four-backtick fence preserves the inner Markdown examples. These instructions were extracted into the standalone skill.

````markdown
---
name: depthwise-question-tree
description: Create a folder of linked Markdown questions for visual learning in Depthwise. Use when someone wants a question tree or a Depthwise learning folder. Produces questions only, without answers.
---

# Make question tree

Make folder. Put Markdown inside. User opens folder in Depthwise. App grows question branches.

## Know the goal

Read user's topic. Read level. Read preparation goal. Use supplied notes if given.

Missing detail blocks useful work? Ask short question. Else choose sensible scope. State choice.

User asks topic questions? Write accurate questions. No answers. No hidden answer in question. No long teaching paragraphs.

Keep technical names correct. Caveman style belongs here, in instructions. Learning questions use clear natural language.

## Make files

- One learning folder.
- Root file named `index.md`.
- Every learning file ends `.md`.
- One main question per file. First H1 is that question.
- Add related questions as bullets. Group with H2/H3 when useful.
- Need deeper topic? Make child file.
- File names lowercase kebab-case. Paths use `/`.
- Nested folders okay. Folder alone is no learning node.
- No answers. No JSON manifest. No required frontmatter. No MDX. No wiki links.
- No images, PDFs, scripts, or app code in learning folder.
- Keep this skill outside learning folder.

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

Every non-root file gets one branch parent. Every file reachable from root. No cycles. No self-links. No repeated child link.

Need reference across branches? Put ordinary link outside `Follow-up questions`. Do not give file second branch parent.

Do not draw ASCII tree inside learning files. App draws tree from links.

## Make good questions

Start broad. Go deeper step by step.

Ask why. Ask how. Ask assumptions. Ask trade-offs. Ask failure cases. Ask comparisons. Ask application.

Child must help explore parent. Do not add unrelated branches for size.

Keep title useful alone. Avoid vague titles like “More” or “Part two”. Avoid giving answer away.

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

## Foundations

- What determines the cost of finding a row?

## Follow-up questions

- [How do database indexes work?](indexes/index.md)
```

`indexes/index.md`:

```markdown
# How do database indexes work?

## Explore

- What problem does an index solve?
- When would an index be unhelpful?

## Follow-up questions

- [Why can an index make writes more expensive?](write-cost.md)
```

`indexes/write-cost.md`:

```markdown
# Why can an index make writes more expensive?

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
- Only intended question Markdown in learning folder.
- No answers or solution paragraphs.
- Questions fit user's level and goal.

Fix problems before handoff. Say what you actually checked. Do not claim app upload tested unless done.

## Hand over

Can write files? Create folder in user's workspace. Give folder path. State file count and scope.

Cannot write files? Give folder tree and full contents for each file, labeled by relative path. User can save them.

Finish with short instruction: Open Depthwise. Choose Open Markdown folder. Select generated folder.

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
- Verify question-only output and appropriately bounded scope manually.
- Keep a compact canonical example as a shared importer/skill compatibility fixture.

## 19. Implementation task breakdown

### Phase A: settle the format and visual prototype

- [x] Read and apply `design-taste-frontend` before prototyping; read `vercel-react-best-practices` before writing React components.
- [x] Review proposed defaults and resolve any conflicting interpretation of tree appearance.
- [x] Freeze the version-one Markdown relationship contract.
- [x] Choose fonts and verify connected box-drawing glyphs.
- [x] Evaluate React Flow against react-d3-tree using variable-height previews.
- [x] Choose a layout engine based on observed needs.
- [x] Validate ASCII branch appearance, expansion, and focus motion in one small prototype.
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
- [x] Branches are visibly connected forks with the agreed ASCII appearance.
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
- [x] It produces question-only content and checks links and tree integrity.
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
- Catppuccin Mocha with locally bundled JetBrains Mono and DM Sans; font licenses ship under `public/licenses/`.
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

The final documentation commit closes the task checklists and records the verification audit. No application code was changed after the final passing production acceptance and visual-inspection run.
