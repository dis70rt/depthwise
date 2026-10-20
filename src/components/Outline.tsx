import { useState } from "react";
import type { Document } from "../lib/documents";
import { Icon } from "./Icon";
export function Outline({
  document,
  active,
  jump,
}: {
  document?: Document;
  active: string;
  jump: (id: string) => void;
}) {
  const [closed, setClosed] = useState<Set<string>>(() => new Set());
  const headings = document?.headings ?? [];
  let hiddenBelow = 7;
  return (
    <div className="outline-inner">
      <div className="rail-label">
        <Icon name="outline" size={16} />
        <h2>On this branch</h2>
      </div>
      {document ? (
        <>
          <p className="outline-question">{document.title}</p>
          <p className="file-path" title={document.path}>
            {document.path}
          </p>
          <nav aria-label="Markdown headings">
            <ul className="heading-list">
              {headings.map((heading, i) => {
                if (heading.depth > hiddenBelow) return null;
                hiddenBelow = closed.has(heading.id) ? heading.depth : 7;
                const hasChildren =
                  (headings[i + 1]?.depth ?? 0) > heading.depth;
                const depth = Math.max(
                  0,
                  heading.depth - (headings[0]?.depth ?? 1),
                );
                return (
                  <li
                    key={heading.id}
                    style={{ paddingLeft: Math.min(depth, 5) * 14 }}
                  >
                    {hasChildren ? (
                      <button
                        className="outline-disclosure"
                        aria-label={`${closed.has(heading.id) ? "Expand" : "Collapse"} heading ${heading.text}`}
                        aria-expanded={!closed.has(heading.id)}
                        onClick={() =>
                          setClosed((previous) => {
                            const next = new Set(previous);
                            if (next.has(heading.id)) next.delete(heading.id);
                            else next.add(heading.id);
                            return next;
                          })
                        }
                      >
                        <Icon
                          name="chevron"
                          size={12}
                          style={{
                            transform: closed.has(heading.id)
                              ? ""
                              : "rotate(90deg)",
                          }}
                        />
                      </button>
                    ) : (
                      <span className="heading-dot" aria-hidden="true">
                        ·
                      </span>
                    )}
                    <a
                      href={`#${heading.id}`}
                      className={active === heading.id ? "heading-active" : ""}
                      aria-current={
                        active === heading.id ? "location" : undefined
                      }
                      onClick={(event) => {
                        event.preventDefault();
                        jump(heading.id);
                      }}
                    >
                      {heading.text}
                    </a>
                  </li>
                );
              })}
            </ul>
            {!headings.length && (
              <p className="muted">No headings in this file.</p>
            )}
          </nav>
        </>
      ) : (
        <p className="outline-empty">
          Select a question to see its headings here.
        </p>
      )}
      <div className="rail-note">
        <Icon name="root" size={22} />
        <p>
          One question.
          <br />A little deeper.
        </p>
      </div>
    </div>
  );
}
