import { spawn } from "node:child_process";
import { once } from "node:events";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";

const projectRoot = process.cwd();
const port = String(process.env.PLAYWRIGHT_PORT ?? process.env.PORT ?? 3000);
const baseUrl = `http://127.0.0.1:${port}`;
const fixtureApiPort = String(
  process.env.PLAYWRIGHT_FIXTURE_API_PORT ?? Number(port) + 1,
);
const fixtureApiBaseUrl = `http://127.0.0.1:${fixtureApiPort}`;
const fallbackApiBaseUrl =
  process.env.PLAYWRIGHT_API_BASE_URL ?? "http://127.0.0.1:9";
const testEnvironment = {
  ...process.env,
  TEST_BASE_URL: baseUrl,
  PLAYWRIGHT_FIXTURE_API_URL: fixtureApiBaseUrl,
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

const fixtureServer = spawn(
  process.execPath,
  ["scripts/playwright-api-fixture.mjs"],
  {
    cwd: projectRoot,
    env: {
      ...process.env,
      PORT: fixtureApiPort,
    },
    stdio: "inherit",
  },
);

const fixtureServerExit = once(fixtureServer, "exit").then(
  ([exitCode, signal]) => ({
    exitCode,
    signal,
  }),
);

const server = spawn(process.execPath, ["scripts/start-standalone.mjs"], {
  cwd: projectRoot,
  env: {
    ...process.env,
    PORT: port,
    HOSTNAME: "127.0.0.1",
    CLIENT_API_BASE_URL:
      process.env.CLIENT_API_BASE_URL ?? fallbackApiBaseUrl,
    API_BASE_URL:
      process.env.PLAYWRIGHT_API_BASE_URL ?? fixtureApiBaseUrl,
    ALLOW_LOCAL_API_URL: process.env.ALLOW_LOCAL_API_URL ?? "true",
  },
  stdio: "inherit",
});

const serverExit = once(server, "exit").then(([exitCode, signal]) => ({
  exitCode,
  signal,
}));

const waitForUrl = async ({
  url,
  processExit,
  processName,
  timeout = 180_000,
}) => {
  const deadline = Date.now() + timeout;

  while (Date.now() < deadline) {
    const result = await Promise.race([
      processExit.then(({ exitCode, signal }) => {
        throw new Error(
          `${processName} stopped before readiness${
            signal ? ` after receiving ${signal}` : ` with exit code ${exitCode}`
          }`,
        );
      }),
      fetch(url, { signal: AbortSignal.timeout(2_000) })
        .then((response) => response.ok)
        .catch(() => false),
    ]);

    if (result) {
      return;
    }

    await delay(500);
  }

  throw new Error(`${processName} did not become ready at ${url}`);
};

const stopProcess = async (child, processExit) => {
  if (child.exitCode !== null || child.signalCode !== null) {
    return;
  }

  child.kill("SIGTERM");
  const stoppedGracefully = await Promise.race([
    processExit.then(() => true),
    delay(5_000).then(() => false),
  ]);

  if (!stoppedGracefully) {
    child.kill("SIGKILL");
    await processExit;
  }
};

try {
  await waitForUrl({
    url: `${fixtureApiBaseUrl}/health`,
    processExit: fixtureServerExit,
    processName: "Playwright API fixture",
    timeout: 30_000,
  });
  await waitForUrl({
    url: `${baseUrl}/api/config`,
    processExit: serverExit,
    processName: "Standalone server",
  });
  await runNpmScript("test:smoke");
  await runNpmScript("test:e2e");
} finally {
  await Promise.all([
    stopProcess(server, serverExit),
    stopProcess(fixtureServer, fixtureServerExit),
  ]);
}
