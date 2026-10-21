# Depthwise design decisions

The screen answers: “Which question should I explore next?” Its largest region is the actual learning tree.

Objects: Markdown documents, questions, authored child links, headings, and import diagnostics. Learners read for extended sessions, chiefly on desktop, with a usable small-screen fallback. A canonical pack typically has 10–20 files and 2–4 levels. The supported import boundary is 1,000 files, 1 MiB each, 20 MiB total.

The product's own shape is its branching question path. Its mark repeats one trunk with two forks. The active ancestor branch uses the Catppuccin accent; other connections recede. Expanded Markdown stays in the same tree. There are no scores, vanity statistics, generated answers, decorative charts, or model controls.

Taste direction: data-terminal, seed 2020410840. Chosen for long reading sessions and the original terminal structure; the user subsequently replaced terminal branches with curves. Keep the user's Catppuccin Mocha palette and explicit right outline, rather than the skill's suggested icon rail or stock builder node shapes. Typography: JetBrains Mono for code and paths; Atkinson Hyperlegible Next for questions and extended reading. Both fonts are served locally. No external images are needed for this document interface.

Library evaluation: React Flow handles general node-graph interaction, but we do not need editable connections, handles, or per-node dragging. react-d3-tree's default SVG tree and fixed spacing make variable-height Markdown more awkward. Use react-zoom-pan-pinch for reusable pan/zoom, Motion for coordinated positions, Radix Dialog for modal accessibility, and unified/remark/rehype for one parsed document representation. A small iterative tree layout directly supports variable heights, stable authored order, and curved connectors without bundling a general graph layout solver.

Geometry: main workspace width = viewport minus 320 px outline on desktop. At narrow widths the outline moves to a dialog. Tree columns use the maximum visible node width at that depth plus a 128 px branch gap. Subtree allocations use an 8 px layout grid; connections use the measured node boundaries. Preview widths adapt to narrow screens, and reading height is capped to avoid filling the vertical workspace with one document.

Imported documents stay in the browser. The latest pack and navigation state persist in IndexedDB; reloads and new tabs automatically resume the saved exploration. Navigation writes are debounced, with a flush when the page becomes hidden. Same-size windows restore the canvas position; changed viewport sizes bring the saved focus into view. Help offers an explicit Forget saved session action. Storage failures show feedback while allowing exploration. No document telemetry or remote embeds. Source files change only through the explicit Save to folder action.

## Final review

The right outline folds into a dialog at 1,100px and below, giving the tree usable space on tablets. Collapsed questions use a two-line clamp; expanding shows the full title. Question popups are omitted to avoid repeating the highlighted question. The full question remains in the accessible button name, and body text stays selectable. Markdown is only mounted for expanded files. Folder reads run in batches of 16, parser work runs in a worker, and import progress does not redraw the existing workspace.

The main preview animates its height for 200ms so text is revealed without being scaled. Position changes and focus pans remain brief. This is an intentional exception to the generic guideline to animate only transforms and opacity: scaling a reading preview would distort its text. Reduced-motion preferences remove that animation. The Catppuccin palette takes precedence over generic style defaults. The readability follow-up uses a proportional reading face for question text with curves independent of font geometry. Shadows are limited to dialogs and notices that float over the workspace.

The large tree retains lightweight collapsed controls so keyboard and assistive-technology traversal can access the complete visible hierarchy. Expensive Markdown previews are mounted lazily; large file-picker lists use content visibility. This preserves measured layout and the full accessible question names. The supported 1,000-file limit is exercised in Chrome, including replacement of an already large tree.

Copy review keeps the interface about concrete actions: open a folder, follow a question, collapse a branch, return to root. It promises no scores, mastery, or automatic learning outcomes. The portable skill keeps short instructions while preserving exact section names, paths, and valid metadata.


## Readability at 1080p

The user found the original 11–15px interface difficult to read on a 24-inch 1080p monitor. Use Atkinson Hyperlegible Next at 18px for both question titles and body text, with 20px section headings, 16px outline links, and 14px secondary labels. On phones, questions and body text remain 17px. Curved branches do not dictate the reading font. Desktop previews widen to 576px, collapsed questions to 336px, and the outline to 320px. Review screenshots at 100% scale on a 1920×1080 viewport, including an expanded follow-up.

Follow-up headings and lists are source structure for the upcoming tree branches. Hide the entire reserved section from expanded previews and heading outlines so it does not duplicate the branch questions. Ordinary reference links outside that section remain usable.

## Curved tree and focus-first opening

The current direction replaces the original terminal branching at the user's request. Rounded question surfaces carry curved SVG connections; blue indicates the exact ancestor route to the focused occurrence. Other branches remain muted. Expanded text keeps its large reading size. The empty-state miniature uses the same visual language.

Opening awaits react-zoom-pan-pinch's actual transform promise (360ms), then expands the preview and draws new branch strokes (420ms). During measured relayout the focused question stays pinned to its reached screen position. A request token invalidates stale openings after another click, manual pan, zoom, or unmount. Keyboard and Markdown-link navigation share the same opening flow; destinations behind collapsed ancestors materialize their ancestor path before moving to the destination. Reduced motion skips travel and stroke drawing.

Accessibility highlights use the same Catppuccin blue as the active path, replacing purple. The highlighted node border alone indicates focus within its question button and reading preview, without a second outline. Other controls and individual Markdown links retain their keyboard focus indicators.

## Landing-page folder drop

A compact drop area sits beneath the introductory copy. Its folder icon, readable prompt, and browse button make import the main action; a blue border and quiet surface change acknowledge a file drag. The whole landing workspace accepts the drop, so users do not have to aim at the button. A depth counter prevents flicker while the drag crosses nested elements. The picker remains the keyboard and touch equivalent.

Directory traversal captures entries while the drop data store is readable, drains every directory-reader batch, and preserves nested paths using the same contract as directory selection. One folder per drop avoids accidentally merging packs. Existing progress, cancellation, worker parsing, and limits apply; traversal also checks limits before collecting an excessive pack.

## Landing demonstration

The landing content and tree now share a two-column grid, vertically centered in the same row; the footer spans the full grid width. This replaces the previous negative margins that pushed the tree below the import control. At 1100px and below the layout stacks.

The user explicitly requested an infinite loop. A 9-second SVG scene highlights the upper branch, moves to that question, expands its Markdown, and reveals deeper questions, then continues into the B-tree question, expands it and reveals another level, before closing and returning to the overview. Camera travel finishes before expansion. The demonstration shows a question with a brief answer at each step, following the actual reading interaction. The user requested removing the play/pause button. Intersection observation and document visibility automatically pause the loop when it is not being viewed; reduced motion shows a static overview. On phones a clipped canvas preserves readable question sizes while the camera travels between them.

The desktop hero row uses its content height instead of stretching to fill the viewport. This moves both columns upward together by roughly 60px at 1440×900, while the footer remains at the bottom. Narrow-screen spacing stays as before.

## Optional authored answers

Question-led navigation remains the structure, while file bodies may contain answers, explanations, examples, or exploratory notes. The skill follows the user's requested answer depth and supports open-ended thinking as well as preparation. The app remains a local Markdown viewer; it does not generate answers. Example documents place answer paragraphs directly in the Markdown body, with supporting source links. No Answer heading or fixed content template is required. The hidden Follow-up questions section remains structural only.

## Workspace context in the header

The imported folder name, tree mode, and short orientation line live in the main application header instead of overlaying the canvas. A header portal keeps the context and Outline action attached to the active workspace, including detached files. Tablet and phone headers wrap the context into a compact second row; the phone omits the helper sentence.

The transform viewport reserves 100px above the workspace bottom for controls and session status, including safe-area spacing. Focus navigation places the question 24px below the canvas top before expansion. Expanded cards use the available workspace height, with flex layout shrinking the scrollable Markdown area while preserving the question, file path, and collapse footer. Long files therefore scroll without covering the bottom controls. Fit-view uses the actual transform viewport size.

## Project landing and skill installation

The landing page now presents the project source, a copyable skills CLI command for dis70rt/depthwise, and scrollable explanations of the viewer and authoring skill. The hero keeps import actions and the install block in the left column, with the animated tree on the right. The install block sits beneath the main actions. Folder import uses a compact dashed drop target with explicit drag-and-drop and click-to-browse instructions. “Or explore an example tree →” sits below it. The install block is limited to 420px, matching the import control.

The project section explains local Markdown traversal and shows a real source example. The skill section explains how agent instructions turn the user's prompt into connected files, with a copyable example prompt and direct skill download. GitHub links point to the supplied repository. Copy feedback appears only after the clipboard write succeeds; unavailable clipboard access selects the text for manual copying. No installation or command executes from the page.

The logo returns to the landing page without deleting the saved exploration. A Continue exploring button names the folder and restores the preserved view. Refreshing or reopening still automatically resumes the saved workspace.

## Markdown authoring and save controls

The screen keeps reading first. Edit replaces Collapse at the right of an expanded node footer, using a neutral filled control with clear text contrast. Collapsing remains on the question header. A faint plus and thin branch continuation create a new child: beside a leaf, or below the existing child group. The iterative layout reserves room for these controls, including nested groups, and interpolates their positions with the nodes. Reference and missing nodes do not get creation controls.

The editor uses the existing Catppuccin palette, reading font and monospace source font. Editing existing Markdown happens inside its expanded node, with Write/Preview, draft status, Keep draft, Discard draft and Update tree. Adding a follow-up uses the dialog with a new file path and Add to tree. Collapsing an edited branch keeps its draft; Resume draft reveals and expands the source node. Editor contents scroll in short windows and remain usable on phones. Preview uses the same sanitized rendering as the reader. A single draft persists independently of the applied pack, with atomic pack-update/draft-removal transactions.

A quiet workspace save bar distinguishes browser persistence and modified-file counts. Save & export offers ZIP downloads in every supported reading browser and direct folder saving only when available. Folder writes require user selection/permission, compare against original content, preserve unrelated files, and track remaining changes after partial failure. ZIP work is loaded on demand. Replacing an edited workspace requires an explicit in-product choice.
