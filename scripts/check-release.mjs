import fs from "node:fs";
import { securityHeaders } from "../security-headers.ts";
import assert from "node:assert/strict";
const read = (name) => fs.readFileSync(name, "utf8");
assert.equal(read("LICENSE"), read("public/LICENSE.txt"));
assert.equal(read("LICENSE"), read("skills/depthwise-question-tree/LICENSE"));
assert.equal(
  read("skills/depthwise-question-tree/SKILL.md"),
  read("public/depthwise-question-tree-SKILL.md"),
);
const notices = read("dist/THIRD-PARTY-NOTICES.txt");
for (const name of [
  "react@",
  "react-dom@",
  "fflate@",
  "rehype-sanitize@",
  "@radix-ui/react-dialog@",
])
  assert.ok(notices.includes(name), `Missing notice: ${name}`);
for (const [name, value] of Object.entries(securityHeaders))
  assert.ok(
    read("public/_headers").includes(`${name}: ${value}`),
    `Header template drift: ${name}`,
  );
function walk(dir) {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((item) =>
      item.isDirectory()
        ? walk(`${dir}/${item.name}`)
        : [`${dir}/${item.name}`],
    );
}
for (const file of walk("dist")) {
  assert.ok(!file.endsWith(".map"), `Public source map: ${file}`);
  if (/\.(js|html|json|txt)$/.test(file))
    assert.ok(
      !/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(read(file)),
      `Private key marker in ${file}`,
    );
}
console.log(
  "Release artifact license, policy, skill and private-key-marker checks passed. This is not a comprehensive secret scan.",
);
