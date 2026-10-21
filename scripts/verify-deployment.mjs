const target = new URL(process.argv[2] || "https://depthwise.saikat.in");
const local = ["127.0.0.1", "localhost"].includes(target.hostname);
if (
  !local &&
  (target.protocol !== "https:" ||
    target.origin !== "https://depthwise.saikat.in")
)
  throw new Error(
    "Use the approved dedicated HTTPS origin, or explicitly review this script for a future origin migration.",
  );
for (const pathname of [
  "/",
  "/LICENSE.txt",
  "/THIRD-PARTY-NOTICES.txt",
  "/.well-known/security.txt",
]) {
  const response = await fetch(new URL(pathname, target), {
    redirect: "error",
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`${pathname}: HTTP ${response.status}`);
  const csp = response.headers.get("content-security-policy") || "";
  for (const control of [
    "default-src 'none'",
    "script-src 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
  ])
    if (!csp.includes(control))
      throw new Error(`${pathname}: missing CSP ${control}`);
  for (const [name, value] of [
    ["x-content-type-options", "nosniff"],
    ["x-frame-options", "DENY"],
    ["referrer-policy", "no-referrer"],
  ])
    if (response.headers.get(name) !== value)
      throw new Error(`${pathname}: missing ${name}`);
  if (
    !local &&
    !response.headers.get("strict-transport-security")?.includes("max-age=")
  )
    throw new Error("Missing HSTS");
  if (
    pathname === "/" &&
    !response.headers.get("content-type")?.includes("text/html")
  )
    throw new Error("HTML MIME type is incorrect");
  console.log(`${pathname}: response policies verified`);
}
if (!local) {
  const response = await fetch(new URL("http://" + target.host), {
    redirect: "manual",
    signal: AbortSignal.timeout(15000),
  });
  if (
    ![301, 302, 307, 308].includes(response.status) ||
    new URL(response.headers.get("location"), "http://" + target.host)
      .origin !== target.origin
  )
    throw new Error("HTTP must redirect to the approved HTTPS origin");
}
console.log(
  local
    ? "Local built-site response check only. Production TLS, DNS, permissions and CDN remain unverified."
    : "HTTP response/HTTPS checks complete. This does not verify DNS ownership, sibling origin trust, admin MFA, retention or all TLS configurations.",
);
