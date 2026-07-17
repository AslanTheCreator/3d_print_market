import { access, cp, mkdir } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const projectRoot = process.cwd();
const standaloneDirectory = path.join(projectRoot, ".next", "standalone");
const serverEntry = path.join(standaloneDirectory, "server.js");
const publicDirectory = path.join(projectRoot, "public");
const staticDirectory = path.join(projectRoot, ".next", "static");

const requirePath = async (target, message) => {
  try {
    await access(target);
  } catch {
    throw new Error(message);
  }
};

await Promise.all([
  requirePath(
    serverEntry,
    "Standalone build not found. Run `npm run build` before starting it.",
  ),
  requirePath(
    publicDirectory,
    "Public assets directory not found. Expected `public` in the project root.",
  ),
  requirePath(
    staticDirectory,
    "Next.js static assets not found. Run `npm run build` before starting the standalone server.",
  ),
]);

await mkdir(path.join(standaloneDirectory, ".next"), { recursive: true });
await Promise.all([
  cp(publicDirectory, path.join(standaloneDirectory, "public"), {
    recursive: true,
    force: true,
  }),
  cp(staticDirectory, path.join(standaloneDirectory, ".next", "static"), {
    recursive: true,
    force: true,
  }),
]);

process.chdir(standaloneDirectory);
await import(pathToFileURL(serverEntry).href);
