import { defineConfig } from "vite";
import { securityHeaders } from "./security-headers.ts";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "./",
  preview: { headers: securityHeaders },
  // remark's entity decoder has a DOM-only browser export. Its worker export
  // uses the same lookup table without requiring document.createElement.
  resolve: {
    conditions: ["worker", "module", "browser", "development|production"],
  },
});
