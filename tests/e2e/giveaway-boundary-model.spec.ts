import { expect, test } from "@playwright/test";
import { readGiveawayAfterBoundary } from "@/entities/product";
import { deferred } from "./helpers/adminGiveaway";
import { giveawayFixture, giveawayNow } from "./helpers/giveaway";

for (const boundary of ["start", "end"] as const) test(`initial GET spanning ${boundary} never publishes its snapshot`, async () => {
  const time = giveawayNow + 1000, old = giveawayFixture({ [boundary === "start" ? "startAt" : "endAt"]: new Date(time).toISOString() });
  let now = time - 1, calls = 0;
  const started = deferred(), release = deferred(), next = boundary === "start" ? { ...old, name: "fresh", status: "ACTIVE" as const } : null;
  const result = readGiveawayAfterBoundary(async () => { calls++; if (calls === 1) { started.resolve(); await release.promise; return old; } return next; }, new AbortController().signal, undefined, () => now);
  await started.promise; now = time; release.resolve();
  expect(await result).toEqual(next); expect(calls).toBe(2);
});

test("both boundaries crossed by sequential GETs require a read begun after end", async () => {
  const old = giveawayFixture({ startAt: new Date(giveawayNow + 10).toISOString(), endAt: new Date(giveawayNow + 20).toISOString() });
  let now = giveawayNow, calls = 0;
  expect(await readGiveawayAfterBoundary(async () => { calls++; now += 10; return calls < 3 ? old : null; }, new AbortController().signal, old, () => now)).toBeNull();
  expect(calls).toBe(3);
});

test("failed pre-boundary GET cannot consume the boundary; fresh error is surfaced without retries", async () => {
  const old = giveawayFixture(), end = Date.parse(old.endAt!);
  let now = end - 1, calls = 0;
  const failure = new Error("fresh GET failed");
  await expect(readGiveawayAfterBoundary(async () => { calls++; now = end; throw failure; }, new AbortController().signal, old, () => now)).rejects.toBe(failure);
  expect(calls).toBe(2);
  calls = 0;
  await expect(readGiveawayAfterBoundary(async () => { calls++; throw failure; }, new AbortController().signal, old, () => now)).rejects.toBe(failure);
  expect(calls).toBe(1);
});

test("cancellation rejects a late response before exposing data or starting a follow-up GET", async () => {
  const controller = new AbortController(), release = deferred(), old = giveawayFixture(); let calls = 0;
  const result = readGiveawayAfterBoundary(async () => { calls++; await release.promise; return old; }, controller.signal);
  controller.abort(); release.resolve(); await expect(result).rejects.toMatchObject({ name: "AbortError" }); expect(calls).toBe(1);
});

test("changing server windows cannot cause unlimited reads; explicit retry remains possible", async () => {
  let now = giveawayNow, calls = 0;
  await expect(readGiveawayAfterBoundary(async () => { calls++; const endAt = new Date(now + 1).toISOString(); now++; return giveawayFixture({ endAt }); }, new AbortController().signal, undefined, () => now)).rejects.toThrow("Повторите загрузку");
  expect(calls).toBe(3);
  expect(await readGiveawayAfterBoundary(async () => { calls++; return null; }, new AbortController().signal, undefined, () => now)).toBeNull();
  expect(calls).toBe(4);
});
