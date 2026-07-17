import { spawn } from "node:child_process";
import { once } from "node:events";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";

const projectRoot = process.cwd();
const port = String(process.env.PLAYWRIGHT_PORT ?? process.env.PORT ?? 3000);
const baseUrl = `http://127.0.0.1:${port}`;
const fallbackApiBaseUrl =
  process.env.PLAYWRIGHT_API_BASE_URL ?? "http://127.0.0.1:9";
const testEnvironment = {
  ...process.env,
  TEST_BASE_URL: baseUrl,
};

const runNpmScript = async (scriptName) => {
  const isWindows = process.platform === "win32";
  const command = isWindows ? (process.env.ComSpec ?? "cmd.exe") : "npm";
  const args = isWindows
    ? ["/d", "/s", "/c", `npm run ${scriptName}`]
    : ["run", scriptName];
  const child = spawn(command, args, {
    cwd: projectRoot,
    env: testEnvironment,
    stdio: "inherit",
  });
  const [exitCode, signal] = await once(child, "exit");

  if (exitCode !== 0) {
    throw new Error(
      `npm run ${scriptName} failed${
        signal ? ` after receiving ${signal}` : ` with exit code ${exitCode}`
      }`,
    );
  }
};

const server = spawn(process.execPath, ["scripts/start-standalone.mjs"], {
  cwd: projectRoot,
  env: {
    ...process.env,
    PORT: port,
    HOSTNAME: "127.0.0.1",
    CLIENT_API_BASE_URL:
      process.env.CLIENT_API_BASE_URL ?? fallbackApiBaseUrl,
    API_BASE_URL: process.env.API_BASE_URL ?? fallbackApiBaseUrl,
    ALLOW_LOCAL_API_URL: process.env.ALLOW_LOCAL_API_URL ?? "true",
  },
  stdio: "inherit",
});

const serverExit = once(server, "exit").then(([exitCode, signal]) => ({
  exitCode,
  signal,
}));

const waitForServer = async () => {
  const deadline = Date.now() + 180_000;

  while (Date.now() < deadline) {
    const result = await Promise.race([
      serverExit.then(({ exitCode, signal }) => {
        throw new Error(
          `Standalone server stopped before readiness${
            signal ? ` after receiving ${signal}` : ` with exit code ${exitCode}`
          }`,
        );
      }),
      fetch(`${baseUrl}/api/config`, { signal: AbortSignal.timeout(2_000) })
        .then((response) => response.ok)
        .catch(() => false),
    ]);

    if (result) {
      return;
    }

    await delay(500);
  }

  throw new Error(`Standalone server did not become ready at ${baseUrl}`);
};

const stopServer = async () => {
  if (server.exitCode !== null || server.signalCode !== null) {
    return;
  }

  server.kill("SIGTERM");
  const stoppedGracefully = await Promise.race([
    serverExit.then(() => true),
    delay(5_000).then(() => false),
  ]);

  if (!stoppedGracefully) {
    server.kill("SIGKILL");
    await serverExit;
  }
};

try {
  await waitForServer();
  await runNpmScript("test:smoke");
  await runNpmScript("test:e2e");
} finally {
  await stopServer();
}
