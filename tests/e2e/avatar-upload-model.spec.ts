import { expect, test } from "@playwright/test";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { createPrivateScope, PrivateScopeContext } from "@/shared/lib/query";
import { imageApi } from "@/entities/image";
import { useImageUpload } from "@/features/image-upload";

const file = (name = "avatar.png", type = "image/png") => new File(["image"], name, { type });
const deferred = () => {
  let resolve!: (ids: number[]) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<number[]>((done, fail) => { resolve = done; reject = fail; });
  return { promise, resolve, reject };
};
function setup() {
  const scope = createPrivateScope(1, () => true);
  let hook!: ReturnType<typeof useImageUpload>;
  function Probe() { hook = useImageUpload("PARTICIPANT"); return null; }
  renderToString(createElement(PrivateScopeContext.Provider, { value: scope }, createElement(Probe)));
  return { hook, close: () => { hook.resetImageState(); scope.dispose(); }, scope };
}

test("successful A stays paired with its ID through pending and failed B, including validation", async () => {
  const original = imageApi.saveImage;
  const env = setup();
  const gate = deferred();
  let calls = 0;
  imageApi.saveImage = async () => { calls++; return calls === 1 ? [81] : gate.promise; };
  try {
    await env.hook.handleImageChange(file("A.png"));
    const confirmed = env.hook.getImageState().selection;
    expect(confirmed).toMatchObject({ kind: "uploaded", id: 81 });
    const pending = env.hook.handleImageChange(file("B.png"));
    expect(env.hook.getImageState()).toMatchObject({ status: "uploading", selection: confirmed });
    gate.reject(new Error("Upload rejected"));
    await pending;
    expect(env.hook.getImageState()).toMatchObject({ status: "failed", selection: confirmed });
    await env.hook.handleImageChange(file("invalid.gif", "image/gif"));
    expect(env.hook.getImageState()).toMatchObject({ status: "failed", selection: confirmed });
    expect(calls).toBe(2);
    env.hook.removeImage();
    expect(env.hook.getImageState()).toMatchObject({ status: "explicitlyRemoved", selection: { kind: "explicitlyRemoved" } });
  } finally { imageApi.saveImage = original; env.close(); }
});

for (const fails of [false, true]) test(`reset invalidates late upload ${fails ? "error" : "success"} and clears pending`, async () => {
  const original = imageApi.saveImage;
  const gate = deferred(), env = setup();
  imageApi.saveImage = () => gate.promise;
  try {
    const pending = env.hook.handleImageChange(file());
    expect(env.hook.getImageState().status).toBe("uploading");
    env.hook.resetImageState();
    expect(env.hook.getImageState()).toEqual({ status: "unchanged", selection: { kind: "unchanged" }, error: null });
    if (fails) gate.reject(new Error("Late rejection")); else gate.resolve([81]);
    await pending;
    expect(env.hook.getImageState()).toEqual({ status: "unchanged", selection: { kind: "unchanged" }, error: null });
  } finally { imageApi.saveImage = original; env.close(); }
});

for (const replacement of ["upload", "invalid", "remove"] as const) test(`new ${replacement} invalidates the previous upload`, async () => {
  const original = imageApi.saveImage;
  const first = deferred(), second = deferred(), env = setup();
  let calls = 0;
  imageApi.saveImage = () => ++calls === 1 ? first.promise : second.promise;
  try {
    const old = env.hook.handleImageChange(file("old.png"));
    if (replacement === "upload") {
      const latest = env.hook.handleImageChange(file("latest.png"));
      first.resolve([81]); await old;
      expect(env.hook.getImageState().status).toBe("uploading");
      second.resolve([82]); await latest;
      expect(env.hook.getImageState().selection).toMatchObject({ kind: "uploaded", id: 82, file: { name: "latest.png" } });
    } else {
      if (replacement === "remove") env.hook.removeImage();
      else await env.hook.handleImageChange(file("invalid.gif", "image/gif"));
      const current = env.hook.getImageState();
      first.resolve([81]); await old;
      expect(env.hook.getImageState()).toEqual(current);
      expect(current.selection.kind).toBe(replacement === "remove" ? "explicitlyRemoved" : "unchanged");
    }
  } finally { imageApi.saveImage = original; env.close(); }
});

test("ended account scope ignores late upload", async () => {
  const original = imageApi.saveImage;
  const gate = deferred(), env = setup();
  imageApi.saveImage = () => gate.promise;
  try {
    const pending = env.hook.handleImageChange(file());
    env.scope.dispose(); gate.resolve([81]); await pending;
    expect(env.hook.getImageState().selection.kind).toBe("unchanged");
  } finally { imageApi.saveImage = original; env.close(); }
});
