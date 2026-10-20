import { memo, useMemo } from "react";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { toJsxRuntime } from "hast-util-to-jsx-runtime";
import type { Document } from "../lib/documents";

export const Markdown = memo(function Markdown({
  document,
  navigate,
}: {
  document: Document;
  navigate: (href: string) => void;
}) {
  return useMemo(
    () => (
      <div className="markdown">
        {toJsxRuntime(document.html, {
          Fragment,
          jsx,
          jsxs,
          components: {
            a: ({ href, children }) => {
              const external = /^(https?:|mailto:)/i.test(href ?? "");
              return external ? (
                <a href={href} target="_blank" rel="noopener noreferrer">
                  {children}
                </a>
              ) : (
                <a
                  href={href || "#"}
                  onClick={(event) => {
                    event.preventDefault();
                    if (href) navigate(href);
                  }}
                >
                  {children}
                </a>
              );
            },
            img: ({ alt }) => (
              <span className="image-placeholder">
                [Image: {alt || "unsupported image"}]
              </span>
            ),
          },
        })}
      </div>
    ),
    [document, navigate],
  );
});
