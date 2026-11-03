import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";

const image = process.argv[2];
if (!image || process.argv.length !== 3) {
  throw new Error("Usage: npm run test:docker -- <image>");
}
const expectedNode = `v${readFileSync(new URL("../.nvmrc", import.meta.url), "utf8").trim()}`;
assert.equal(process.version, expectedNode, "Run the smoke test with the project Node version");
const name = `figurzilla-runtime-${process.pid}-${Date.now()}`;
const fixturePath = join(tmpdir(), `${name}.png`);
const docker = (...args) => execFileSync("docker", args, {
  encoding: "utf8", timeout: 60_000, stdio: ["ignore", "pipe", "pipe"],
}).trim();
const inContainer = code => docker("exec", name, "node", "-e", code);
let created = false;

try {
  assert.equal(docker("image", "inspect", image, "--format", "{{.Config.User}}"), "node");
  const fixture = docker("run", "--rm", "--entrypoint", "node", image, "-e",
    "require('sharp')({create:{width:128,height:64,channels:3,background:'#ef4284'}}).png().toBuffer().then(b=>console.log(b.toString('base64'))).catch(e=>{console.error(e);process.exit(1)})");
  writeFileSync(fixturePath, Buffer.from(fixture, "base64"), { flag: "wx" });
  docker("create", "--name", name, "--publish", "127.0.0.1::3000",
    "--env", "CLIENT_API_BASE_URL=http://127.0.0.1:9",
    "--env", "API_BASE_URL=http://127.0.0.1:9",
    "--env", "ALLOW_LOCAL_API_URL=true", image);
  created = true;
  // Next.js enumerates public assets when the standalone server starts.
  docker("cp", fixturePath, `${name}:/app/public/__runtime-smoke.png`);
  docker("start", name);
  assert.equal(docker("exec", name, "id", "-un"), "node");
  assert.equal(inContainer("console.log(process.version)"), expectedNode);
  console.log("Container:", expectedNode, "npm", docker("exec", name, "npm", "--version"), "user node");
  docker("exec", name, "apk", "info", "-e", "libatomic", "libstdc++");
  assert.doesNotMatch(docker("exec", name, "ldd", "/usr/local/bin/node"), /not found|Error loading/);
  const address = docker("port", name, "3000/tcp");
  assert.match(address, /^127\.0\.0\.1:\d+$/);
  const baseURL = `http://${address}`;
  // Synchronous Docker probes can outlive an idle HTTP connection between requests.
  const request = path => fetch(new URL(path, baseURL), {
    signal: AbortSignal.timeout(10_000), headers: { Connection: "close" },
  });
  let ready = false;
  for (let attempt = 0; attempt < 60; attempt++) {
    try {
      const response = await request("/api/config");
      if (response.ok) { ready = true; break; }
    } catch { /* The standalone server may still be starting. */ }
    await delay(500);
  }
  assert.ok(ready, "Standalone server did not become ready");
  const about = await request("/about");
  assert.equal(about.status, 200);
  assert.equal(about.headers.get("x-content-type-options"), "nosniff");
  const html = await about.text();
  assert.match(html, /data-emotion="mui/);
  assert.match(html, /@layer mui/);
  execFileSync(process.execPath, ["--test", "tests/smoke/http-smoke.test.mjs"], {
    env: { ...process.env, TEST_BASE_URL: baseURL }, stdio: "inherit", timeout: 120_000,
  });
  const optimized = await request("/_next/image?url=%2F__runtime-smoke.png&w=64&q=75");
  assert.equal(optimized.status, 200, optimized.ok ? undefined : await optimized.text());
  assert.match(optimized.headers.get("content-type") ?? "", /^image\//);
  const encoded = Buffer.from(await optimized.arrayBuffer()).toString("base64");
  const metadata = JSON.parse(inContainer(`require('sharp')(Buffer.from('${encoded}','base64')).metadata().then(m=>console.log(JSON.stringify(m))).catch(e=>{console.error(e);process.exit(1)})`));
  assert.equal(metadata.width, 64);
  assert.equal(metadata.height, 32);
  console.log("Docker runtime PASS: standalone, HTTP smoke, SSR CSS, native sharp and Next Image 64x32");
} finally {
  if (existsSync(fixturePath)) unlinkSync(fixturePath);
  if (created) {
    console.log(docker("logs", name));
    docker("stop", "--time", "5", name);
    docker("rm", name);
  }
}
