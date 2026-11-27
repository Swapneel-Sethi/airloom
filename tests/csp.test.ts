import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("CSP script-src allows Next.js inline hydration scripts", () => {
  const nextConfig = fs.readFileSync("next.config.ts", "utf8");
  const cspMatch = nextConfig.match(/Content-Security-Policy",\s*value:\s*"([^"]+)"/);
  assert.ok(cspMatch, "Content-Security-Policy header found in next.config.ts");
  const csp = cspMatch[1];
  // script-src must include 'unsafe-inline' so Next.js inline hydration scripts (__next_f.push) execute.
  assert.ok(
    /script-src\s+'self'\s+'unsafe-inline'/.test(csp),
    "CSP script-src must allow unsafe-inline for Next.js hydration",
  );
  // Security protections must remain intact.
  assert.ok(csp.includes("frame-ancestors 'none'"), "frame-ancestors preserved");
  assert.ok(csp.includes("base-uri 'self'"), "base-uri preserved");
  assert.ok(csp.includes("form-action 'self'"), "form-action preserved");
});