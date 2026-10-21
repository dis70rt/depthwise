import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
const root = process.cwd();
const lock = JSON.parse(await readFile("package-lock.json", "utf8"));
const sections = [
  "Depthwise third-party notices\n\nApplication and portable skill: Apache-2.0. See LICENSE.txt.\n\nThis conservative inventory covers all installed production dependencies in the lockfile, including packages used by browser and parser/edit workers. Some portions may be eliminated by bundling. Development tools are not distributed in the website artifact. Font notices also appear in licenses/.\n",
];
const supplements = JSON.parse(
  await readFile("docs/legal/license-supplements.json", "utf8"),
);
let count = 0;
for (const [relative, metadata] of Object.entries(lock.packages).sort(
  ([a], [b]) => a.localeCompare(b),
)) {
  if (!relative || metadata.dev) continue;
  const folder = path.join(root, relative);
  const pkg = JSON.parse(
    await readFile(path.join(folder, "package.json"), "utf8"),
  );
  if (pkg.version !== metadata.version)
    throw new Error(`Installed/locked version mismatch: ${relative}`);
  const files = (await readdir(folder))
    .filter((name) => /^(licen[sc]e|copying|notice)(\.[\w-]+)?$/i.test(name))
    .sort();
  const supplement = supplements[`${pkg.name}@${pkg.version}`];
  if (!files.some((name) => /^(licen[sc]e|copying)/i.test(name)) && !supplement)
    throw new Error(
      `No license text found for ${pkg.name}; review before distribution.`,
    );
  sections.push(
    `\n${"=".repeat(72)}\n${pkg.name}@${pkg.version} — ${pkg.license || "SEE PACKAGE TERMS"}\n`,
  );
  for (const name of files)
    sections.push(
      `\n--- ${name} ---\n${await readFile(path.join(folder, name), "utf8")}\n`,
    );
  if (supplement)
    sections.push(
      `\n--- Reviewed upstream license supplement ---\nSource: ${supplement.source}\n${supplement.reason}\n\n${await readFile(supplement.file, "utf8")}\n`,
    );
  count++;
}
const text = sections.join("");
const file = "public/THIRD-PARTY-NOTICES.txt";
if (process.argv.includes("--check")) {
  if ((await readFile(file, "utf8")) !== text)
    throw new Error(
      "Dependency notices are stale. Run node scripts/licenses.mjs and review the changes.",
    );
} else await writeFile(file, text);
console.log(`License texts verified for ${count} locked production packages.`);
