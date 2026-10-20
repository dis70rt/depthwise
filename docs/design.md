# Depthwise design decisions

The screen answers: “Which question should I explore next?” Its largest region is the actual learning tree.

Objects: Markdown documents, questions, authored child links, headings, and import diagnostics. Learners read for extended sessions, chiefly on desktop, with a usable small-screen fallback. A canonical pack typically has 10–20 files and 2–4 levels. The supported import boundary is 1,000 files, 1 MiB each, 20 MiB total.

The product's own shape is its branching question path. Its mark repeats one trunk with two forks. The active ancestor branch uses the Catppuccin accent; other connections recede. Expanded Markdown stays in the same tree. There are no scores, vanity statistics, generated answers, decorative charts, or model controls.

Taste direction: data-terminal, seed 2020410840. Chosen for long reading sessions and the original terminal structure; the user subsequently replaced terminal branches with curves. Keep the user's Catppuccin Mocha palette and explicit right outline, rather than the skill's suggested icon rail or stock builder node shapes. Typography: JetBrains Mono for code and paths; Atkinson Hyperlegible Next for questions and extended reading. Both fonts are served locally. No external images are needed for this document interface.

Library evaluation: React Flow handles general node-graph interaction, but we do not need editable connections, handles, or per-node dragging. react-d3-tree's default SVG tree and fixed spacing make variable-height Markdown more awkward. Use react-zoom-pan-pinch for reusable pan/zoom, Motion for coordinated positions, Radix Dialog for modal accessibility, and unified/remark/rehype for one parsed document representation. A small iterative tree layout directly supports variable heights, stable authored order, and curved connectors without bundling a general graph layout solver.

Geometry: main workspace width = viewport minus 320 px outline on desktop. At narrow widths the outline moves to a dialog. Tree columns use the maximum visible node width at that depth plus a 128 px branch gap. Subtree allocations use an 8 px layout grid; connections use the measured node boundaries. Preview widths adapt to narrow screens, and reading height is capped to avoid filling the vertical workspace with one document.

All import documents stay in browser memory. No document telemetry, remote embeds, storage, or write-back. A refresh starts a new session.

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
