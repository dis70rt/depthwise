import { CopyBlock } from "./CopyBlock";
import { Icon } from "./Icon";
import { LandingTree } from "./LandingTree";

export const PROJECT_URL = "https://github.com/dis70rt/depthwise";
export const INSTALL_COMMAND = "npx skills@1.7.4 add dis70rt/depthwise";
export const EXAMPLE_PROMPT =
  "Use depthwise-question-tree to explore [my topic, idea, or project]. Create a Markdown folder with progressively deeper follow-up questions. Match my goals, level of detail, and formatting. Include answers and examples where useful.";
const markdown = `# Why build it this way?

Start with the constraint that matters most.
Explain the choice in your own words.

## Things to explore

- What did this choice make easier?
- What would change at a larger scale?

## Follow-up questions

- [What could fail?](failure-modes.md)
- [What else could work?](alternatives.md)`;

export function LandingPage({
  dragActive,
  busy,
  onBrowse,
  onExample,
  onFormat,
  onResume,
  resumeName,
}: {
  dragActive: boolean;
  busy: boolean;
  onBrowse: () => void;
  onExample: () => void;
  onFormat: () => void;
  onResume?: () => void;
  resumeName?: string;
}) {
  return (
    <div className="landing-page">
      <div className="empty-layout">
        <section className="empty-intro">
          <h1>
            Follow the question<span className="accent">.</span>
          </h1>
          <p className="empty-description">
            Explore questions, answers, and ideas as a connected tree. Bring
            your Markdown, or give your AI agent the skill to make it.
          </p>
          {onResume && (
            <button
              className="resume-session-button"
              onClick={onResume}
              disabled={busy}
            >
              <span>
                Continue exploring <span aria-hidden="true">→</span>
              </span>
              <small>{resumeName}</small>
            </button>
          )}
          <div
            className={`folder-dropzone ${dragActive ? "drop-active" : ""}`}
            role="region"
            aria-label="Markdown folder drop zone"
            aria-busy={busy}
          >
            <button
              className="folder-import-button"
              onClick={onBrowse}
              disabled={busy}
              aria-label="Open Markdown folder"
            >
              <Icon name="folder" size={26} />
              <span className="folder-import-copy">
                <span className="dropzone-heading">
                  {dragActive
                    ? "Release to open your folder"
                    : "Drop a Markdown folder here"}
                </span>
                <span className="dropzone-note">
                  or <span className="browse-label">click to browse</span>
                </span>
              </span>
            </button>
            <button
              className="example-button"
              onClick={onExample}
              disabled={busy}
            >
              Or explore an example tree <span aria-hidden="true">→</span>
            </button>
          </div>
          <p className="privacy-note">
            <span className="status-dot" />
            Files stay in your browser. No account needed.
          </p>
          <div className="landing-install">
            <CopyBlock
              label="Install the authoring skill"
              text={INSTALL_COMMAND}
              infoHref="#skill"
            />
            <p className="install-note">
              Run in your terminal. Choose the agent you use.
            </p>
          </div>
        </section>
        <div className="landing-preview">
          <LandingTree />
        </div>
        <a className="landing-scroll-link" href="#project">
          A folder, a skill, and room to think <Icon name="down" size={17} />
        </a>
      </div>

      <section
        className="landing-doc-section"
        id="project"
        aria-labelledby="project-heading"
      >
        <div className="landing-explanation">
          <h2 id="project-heading">Your ideas have branches.</h2>
          <p>
            Depthwise is a visual workspace for an ordinary folder of Markdown.
            Each file is a question. Its contents can be an explanation, a
            worked example, a few notes, or a question you haven’t answered yet.
          </p>
          <p>
            Open a question to read in place and reveal its follow-ups. The
            active path keeps you oriented as you go deeper.
          </p>
          <dl className="project-details">
            <div>
              <dt>Follow your own thinking</dt>
              <dd>
                Prepare for a project discussion, explore a new concept, or test
                an idea from different angles.
              </dd>
            </div>
            <div>
              <dt>Keep your own files</dt>
              <dd>
                Use regular headings, lists, code, and tables. Edit in your
                favorite editor, then reopen the folder here.
              </dd>
            </div>
          </dl>
          <button className="text-link" onClick={onFormat}>
            See the folder format <span aria-hidden="true">↗</span>
          </button>
        </div>
        <div className="markdown-source">
          <div className="source-caption">
            <Icon name="file" size={16} />
            <span>project-decisions / index.md</span>
            <span>Markdown</span>
          </div>
          <pre>
            <code>{markdown}</code>
          </pre>
        </div>
        <ol className="landing-workflow" aria-label="How Depthwise works">
          <li>
            <h3>Start with a topic</h3>
            <p>
              Give your agent a goal and any notes, project details, or
              questions you already have.
            </p>
          </li>
          <li>
            <h3>Make the folder</h3>
            <p>
              The skill helps your agent connect related Markdown files into
              deeper follow-ups.
            </p>
          </li>
          <li>
            <h3>Explore your tree</h3>
            <p>
              Drop the folder here. Read, follow a branch, and come back to the
              bigger picture.
            </p>
          </li>
        </ol>
      </section>

      <section
        className="landing-doc-section skill-explanation"
        id="skill"
        aria-labelledby="skill-heading"
      >
        <div className="landing-explanation">
          <h2 id="skill-heading">A skill for your agent.</h2>
          <p>
            The authoring skill is a small <code>SKILL.md</code> instruction
            file. It teaches your AI agent how to create Markdown folders that
            Depthwise can turn into branches.
          </p>
          <p>
            Your prompt decides the topic, depth, answers, and formatting. Use
            it for learning, brainstorming, decisions, or interview preparation.
            The website opens what your agent creates.
          </p>
          <div className="skill-section-install">
            <CopyBlock
              label="Install with your terminal"
              text={INSTALL_COMMAND}
            />
            <p className="install-note">Choose your AI agent when prompted.</p>
          </div>
          <a
            className="text-link"
            href="./depthwise-question-tree-SKILL.md"
            download
          >
            <Icon name="download" size={16} />
            Download the skill file
          </a>
          <p className="skill-download-note">
            Prefer to skip installation? Give the file directly to your agent
            with your prompt.
          </p>
        </div>
        <div className="skill-prompt">
          <CopyBlock label="Start with your own prompt" text={EXAMPLE_PROMPT} />
          <p>
            Replace the bracketed topic with what you want to explore. Add your
            own constraints and context.
          </p>
          <a
            className="text-link"
            href={`${PROJECT_URL}/tree/main/skills/depthwise-question-tree`}
            target="_blank"
            rel="noreferrer"
          >
            Read the skill on GitHub <span aria-hidden="true">↗</span>
          </a>
        </div>
      </section>

      <footer className="empty-footer landing-footer">
        <a href={PROJECT_URL} target="_blank" rel="noreferrer">
          Source on GitHub <span aria-hidden="true">↗</span>
        </a>
        <button onClick={onFormat}>Folder format</button>
        <a href="./depthwise-question-tree-SKILL.md" download>
          Authoring skill
        </a>
        <span>Made for your Markdown.</span>
      </footer>
    </div>
  );
}
