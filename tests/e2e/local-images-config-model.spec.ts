import { execFileSync } from "node:child_process";
import { expect, test } from "@playwright/test";

for (const allow of ["false", "true"]) test(`production local images require explicit opt-in ${allow}`, () => {
  const result = JSON.parse(execFileSync(process.execPath, ["--input-type=module", "-e", `
    const {default: config} = await import('./next.config.mjs');
    console.log(JSON.stringify({images: config.images, headers: await config.headers()}));
  `], { cwd: process.cwd(), env: { ...process.env, NODE_ENV: "production", ALLOW_LOCAL_API_URL: allow }, encoding: "utf8" }));
  const csp = result.headers[0].headers.find((header: { key: string }) => header.key === "Content-Security-Policy").value;
  for (const host of ["localhost", "127.0.0.1"]) {
    expect(result.images.remotePatterns.some((pattern: { hostname: string }) => pattern.hostname === host)).toBe(allow === "true");
    expect(csp.includes(`http://${host}:9000`)).toBe(allow === "true");
  }
  expect(csp).not.toContain("unsafe-eval");
  expect(result.images.dangerouslyAllowLocalIP).toBe(allow === "true");
  expect(result.images.qualities).toEqual([75, 100]);
  expect(result.images.minimumCacheTTL).toBe(60);
});
