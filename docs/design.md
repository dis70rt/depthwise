# Depthwise design decisions

The screen answers: “Which question should I explore next?” Its largest region is the actual learning tree.

Objects: Markdown documents, questions, authored child links, headings, and import diagnostics. Learners read for extended sessions, chiefly on desktop, with a usable small-screen fallback. A canonical pack typically has 10–20 files and 2–4 levels. The supported import boundary is 1,000 files, 1 MiB each, 20 MiB total.

The product's own shape is its branching question path. Its mark repeats one trunk with two forks. The active ancestor branch uses the Catppuccin accent; other connections recede. Expanded Markdown stays in the same tree. There are no scores, vanity statistics, generated answers, decorative charts, or model controls.

Taste direction: data-terminal, seed 2020410840. Chosen for long reading sessions and monospace structure. Keep the user's Catppuccin Mocha palette and explicit right outline, rather than the skill's suggested icon rail or stock builder node shapes. Typography: JetBrains Mono for terminal branches and questions; DM Sans for extended reading. Both fonts are served locally. No external images are needed for this document interface.

Library evaluation: React Flow handles general node-graph interaction, but we do not need editable connections, handles, or per-node dragging. react-d3-tree's default SVG tree and fixed spacing make variable-height Markdown more awkward. Use react-zoom-pan-pinch for reusable pan/zoom, Motion for coordinated positions, Radix Dialog for modal accessibility, and unified/remark/rehype for one parsed document representation. A small iterative tree layout directly supports variable heights, stable authored order, and character-grid junctions without bundling a general graph layout solver.

Geometry: main workspace width = viewport minus 264 px outline on desktop. At narrow widths the outline moves to a dialog. Tree columns use the maximum visible node width at that depth plus a 96 px branch gap. Nodes and subtree allocations snap to a 20 px vertical grid. Shared branch glyphs snap to the same monospace advance. Preview widths adapt to narrow screens, and reading height is capped to avoid filling the vertical workspace with one document.

All import documents stay in browser memory. No document telemetry, remote embeds, storage, or write-back. A refresh starts a new session.
