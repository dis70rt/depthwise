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
