# Depthwise question tree

An agent skill that turns a topic or supplied notes into a folder of linked Markdown questions with optional answers and explanations for visual learning in Depthwise.

The instructions use short caveman-style language. Generated learning questions use clear, natural language. The skill needs no model API, executable helper, or agent-specific integration.

## Install

After pushing the project repository to GitHub, install the skill with:

```sh
npx skills add dis70rt/depthwise --skill depthwise-question-tree
```

Choose your agent when prompted. The repository layout is:

```text
README.md
skills/
└── depthwise-question-tree/
    └── SKILL.md
```

The `SKILL.md` uses the standard Agent Skills format: YAML `name` and `description`, followed by Markdown instructions. Its folder name matches its skill name. No separate registration manifest is needed.

## Use

Ask your agent:

> Use depthwise-question-tree to create a beginner operating-system memory-management question tree for interview preparation. Start with about 12 files. Include brief answers and progressively deeper follow-ups.

If your agent does not support installing skills, give it the contents of `skills/depthwise-question-tree/SKILL.md` together with your topic and preparation goal.

Use it for learning, ideas, brainstorming, decisions, or preparation. Content, detail, tone, and Markdown formatting follow the user's prompt. Answers can be included, omitted, or expanded without a required Answer heading or fixed content template.

The output is a separate learning folder with a root `index.md`. Each file starts with one H1 question; direct relative links beneath `## Follow-up questions` supply child branches. Open Depthwise and drop the generated folder onto the landing screen, or choose **Open Markdown folder**.

## Publish on skills.sh

1. Create a public GitHub repository for this package, or use an existing public repository.
2. Upload this README and the `skills/depthwise-question-tree/SKILL.md` path, preserving the folder structure. Do not upload the ZIP file alone.
3. Commit the files to the repository's default branch.
4. Run the install command above using the real repository name.

There is no separate skill-file upload form required for the leaderboard. According to the skills.sh FAQ, listing happens automatically through installation telemetry. Publication to GitHub and appearance in the directory are separate steps; a listing is not guaranteed to appear immediately.

## References

- [skills CLI: creating skills and discovery paths](https://github.com/vercel-labs/skills/blob/main/docs/creating-skills.md)
- [Agent Skills specification](https://agentskills.io/specification)
- [skills.sh FAQ: hosting and leaderboard listing](https://skills.sh/docs/faq)
