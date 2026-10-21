import { useEffect, useRef, useState } from "react";
import { Icon } from "./Icon";

export function CopyBlock({
  label,
  text,
  infoHref,
}: {
  label: string;
  text: string;
  infoHref?: string;
}) {
  const [state, setState] = useState<"ready" | "copied" | "manual">("ready");
  const code = useRef<HTMLElement>(null);
  const reset = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(reset.current), []);
  const copy = async () => {
    clearTimeout(reset.current);
    try {
      await navigator.clipboard.writeText(text);
      setState("copied");
      reset.current = setTimeout(() => setState("ready"), 2400);
    } catch {
      const selection = window.getSelection();
      if (code.current && selection) {
        const range = document.createRange();
        range.selectNodeContents(code.current);
        selection.removeAllRanges();
        selection.addRange(range);
      }
      setState("manual");
    }
  };
  return (
    <div className="copy-section">
      <p className="copy-label">
        {label}
        {infoHref && (
          <a
            className="skill-info-link"
            href={infoHref}
            aria-label="What is the authoring skill?"
          >
            <Icon name="info" size={17} />
          </a>
        )}
      </p>
      <button
        className={`copy-block ${state === "copied" ? "copy-done" : ""}`}
        onClick={() => void copy()}
        aria-label={`Copy ${label.toLowerCase()}`}
      >
        <code ref={code}>{text}</code>
        <span className="copy-action" aria-hidden="true">
          <Icon name={state === "copied" ? "check" : "copy"} size={17} />
          <span>{state === "copied" ? "Copied" : "Copy"}</span>
        </span>
      </button>
      <span
        className={state === "manual" ? "copy-feedback" : "visually-hidden"}
        role="status"
      >
        {state === "copied"
          ? "Copied to clipboard."
          : state === "manual"
            ? "Text selected. Copy it using your device’s copy command."
            : ""}
      </span>
    </div>
  );
}
