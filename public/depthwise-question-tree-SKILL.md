---
name: depthwise-question-tree
license: Apache-2.0
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
