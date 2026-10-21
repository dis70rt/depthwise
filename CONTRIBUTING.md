# Contributing

The application, portable skill, documentation and examples use Apache-2.0 except identified third-party material. By intentionally submitting a contribution for inclusion, you offer it under the project’s Apache-2.0 license. Include the origin and license of copied code/assets, retain notices, and submit only material you have authority to contribute. No trademark rights are granted.

Use synthetic Markdown in tests and bug reports. Do not include private user folders, resumes, saved browser data, secrets or copied proprietary interview material. Report security issues privately using SECURITY.md.

Run `npm ci --ignore-scripts`, `npm run check:licenses`, `npm run check`, `npm audit --audit-level=low --ignore-scripts`, and `node scripts/check-release.mjs`. New runtime dependencies require review of their real license texts; regenerate and review notices with `node scripts/licenses.mjs` when the lockfile changes. Meaningful browser checks run against the built site with its response policies.
