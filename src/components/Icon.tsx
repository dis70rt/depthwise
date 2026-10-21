import type { CSSProperties } from "react";
const paths = {
  info: "M12 11v6 M12 7h.01 M22 12a10 10 0 11-20 0 10 10 0 0120 0",
  copy: "M9 9h12v12H9z M15 9V3H3v12h6",
  check: "M5 12l4 4L19 6",
  down: "M12 4v16 M6 14l6 6 6-6",
  folder: "M3 6h6l2 2h10v12H3z M3 6V4h6l2 2",
  root: "M4 12h16 M8 8l-4 4 4 4 M16 4v16",
  fit: "M8 3H3v5 M16 3h5v5 M3 16v5h5 M21 16v5h-5 M8 8h8v8H8z",
  plus: "M12 5v14 M5 12h14",
  minus: "M5 12h14",
  outline: "M8 5h13 M8 12h13 M8 19h13 M3 5h.01 M3 12h.01 M3 19h.01",
  help: "M9.1 9a3 3 0 115.8 1c-.7 1-2.9 1.3-2.9 3 M12 17h.01 M22 12a10 10 0 11-20 0 10 10 0 0120 0",
  close: "M6 6l12 12 M6 18L18 6",
  chevron: "M9 5l7 7-7 7",
  file: "M5 3h9l5 5v13H5z M14 3v6h5 M9 13h6 M9 17h6",
  warning: "M12 3L2 21h20z M12 9v5 M12 17h.01",
  download: "M12 3v12 M7 10l5 5 5-5 M4 16v5h16v-5",
  search: "M21 21l-5-5 M18 10a8 8 0 11-16 0 8 8 0 0116 0",
};
export function Icon({
  name,
  size = 18,
  style,
}: {
  name: keyof typeof paths;
  size?: number;
  style?: CSSProperties;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={style}
    >
      <path d={paths[name]} />
    </svg>
  );
}
export function Mark() {
  return (
    <svg
      className="brand-mark"
      width="24"
      height="28"
      viewBox="0 0 24 28"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M2 14h9M11 5v18M11 5h10M11 23h10M11 14h7"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <circle cx="21" cy="5" r="2" fill="currentColor" />
      <circle cx="21" cy="23" r="2" fill="currentColor" />
    </svg>
  );
}
