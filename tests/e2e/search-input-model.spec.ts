import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import type { KeyboardEvent } from "react";
import type { useAdminProductSearch } from "@/widgets/admin-products/model/useAdminProductSearch";
import type { useSearch } from "@/widgets/header/model/useSearch";

// Execute the source hooks with controlled React effects, URL acknowledgements and timers.
function mount<T>(file: string, exportedName: string, initialUrl: string) {
  let location = new URL(initialUrl, "https://figurzilla.invalid");
  let params = new URLSearchParams(location.search);
  let index = 0;
  let dirty = false;
  let result!: T;
  const slots: unknown[] = [];
  const effectDeps: unknown[][] = [];
  const cleanups = new Map<number, () => void>();
  let effects: Array<{ slot: number; run: () => (() => void) | void }> = [];
  const timers = new Map<number, () => void>();
  const listeners = new Map<string, () => void>();
  let timerId = 0;
  const writes: string[] = [];
  const suggestions = { data: ["dragon one", "dragon two", "dragon three"], isFetching: false, isError: false };
  const same = (a: unknown[] | undefined, b: unknown[]) =>
    !!a && a.length === b.length && b.every((value, i) => Object.is(value, a[i]));
  const useMemo = (factory: () => unknown, deps: unknown[]) => {
    const slot = index++;
    const previous = slots[slot] as { deps: unknown[]; value: unknown } | undefined;
    if (!previous || !same(previous.deps, deps)) slots[slot] = { deps, value: factory() };
    return (slots[slot] as { value: unknown }).value;
  };
  const react = {
    useState: (initial: unknown) => {
      const slot = index++;
      if (!(slot in slots)) slots[slot] = initial;
      return [slots[slot], (value: unknown) => {
        const next = typeof value === "function" ? value(slots[slot]) : value;
        if (!Object.is(next, slots[slot])) { slots[slot] = next; dirty = true; }
      }];
    },
    useRef: (initial: unknown) => {
      const slot = index++;
      if (!(slot in slots)) slots[slot] = { current: initial };
      return slots[slot];
    },
    useMemo,
    useCallback: (callback: unknown, deps: unknown[]) => useMemo(() => callback, deps),
    useEffect: (run: () => (() => void) | void, deps: unknown[]) => {
      const slot = index++;
      if (!same(effectDeps[slot], deps)) {
        effectDeps[slot] = deps;
        effects.push({ slot, run });
      }
    },
  };
  const router = {
    replace: (url: string, options: { scroll: boolean }) => { expect(options.scroll).toBe(false); writes.push(url); },
    push: (url: string) => { writes.push(url); return true; },
  };
  const mocks: Record<string, unknown> = {
    react,
    "next/navigation": { usePathname: () => location.pathname, useSearchParams: () => params, useRouter: () => router },
    "@/shared/lib": { useGuardedRouter: () => router },
    "@/entities/product": { useProductNameSuggestions: () => suggestions },
  };
  const windowMock = {
    get location() { return location; },
    addEventListener: (name: string, listener: () => void) => listeners.set(name, listener),
    removeEventListener: (name: string) => listeners.delete(name),
  };
  const module = { exports: {} as Record<string, () => T> };
  vm.runInNewContext(ts.transpileModule(readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText, {
    module, exports: module.exports, URLSearchParams, window: windowMock,
    setTimeout: (callback: () => void) => { timers.set(++timerId, callback); return timerId; },
    clearTimeout: (id: number) => timers.delete(id),
    require: (name: string) => {
      if (!(name in mocks)) throw new Error(`Missing mock: ${name}`);
      return mocks[name];
    },
  });
  const render = (flushEffects = true) => {
    for (let attempt = 0; attempt < 10; attempt++) {
      index = 0; dirty = false; effects = [];
      result = module.exports[exportedName]();
      if (!flushEffects) return result;
      for (const { slot, run } of effects) {
        cleanups.get(slot)?.();
        const cleanup = run();
        if (cleanup) cleanups.set(slot, cleanup); else cleanups.delete(slot);
      }
      if (!dirty) return result;
    }
    throw new Error("Hook did not settle");
  };
  render();
  return {
    result: () => result, render, writes, suggestions,
    acknowledge: (url: string) => {
      location = new URL(url, location); params = new URLSearchParams(location.search); render();
    },
    pop: (url: string) => {
      location = new URL(url, location); listeners.get("popstate")?.();
      params = new URLSearchParams(location.search); render();
    },
    flushTimers: () => { const callbacks = [...timers.values()]; timers.clear(); callbacks.forEach(callback => callback()); render(); },
    close: () => { cleanups.forEach(cleanup => cleanup()); },
  };
}

const mountAdmin = () => mount<ReturnType<typeof useAdminProductSearch>>(
  "src/widgets/admin-products/model/useAdminProductSearch.ts", "useAdminProductSearch",
  "/admin/products?agent=2&status=ACTIVE&page=3&q=old",
);

test("admin local input survives delayed and out-of-order URL acknowledgements; pending filter changes compose", () => {
  const env = mountAdmin();
  try {
    for (const value of ["ф", "фи", "фигурка"]) { env.result().changeSearch(value); env.render(); expect(env.result().searchDraft).toBe(value); }
    expect(env.writes).toEqual([]);
    env.flushTimers();
    const first = env.writes[0];
    expect(Object.fromEntries(new URL(first, "https://figurzilla.invalid").searchParams))
      .toEqual({ agent: "2", status: "ACTIVE", page: "0", q: "фигурка" });
    env.result().changeSearch("фигурка 123"); env.render();
    env.acknowledge(first);
    expect(env.result().searchDraft).toBe("фигурка 123");
    env.result().set({ status: "BLOCKED", page: 0 });
    const statusUrl = env.writes.at(-1)!;
    env.result().set({ agent: 3, page: 0 });
    const agentUrl = env.writes.at(-1)!;
    expect(Object.fromEntries(new URL(agentUrl, "https://figurzilla.invalid").searchParams))
      .toEqual({ agent: "3", status: "BLOCKED", page: "0", q: "фигурка 123" });
    env.acknowledge(agentUrl); env.acknowledge(statusUrl);
    env.result().changeSearch("новый"); env.render(); env.flushTimers();
    expect(Object.fromEntries(new URL(env.writes.at(-1)!, "https://figurzilla.invalid").searchParams))
      .toEqual({ agent: "3", status: "BLOCKED", page: "0", q: "новый" });
  } finally { env.close(); }
});

test("admin history restores draft and cancels debounce; a late old replace cannot roll back a new history draft", () => {
  const env = mountAdmin();
  try {
    env.result().changeSearch("pending"); env.render(); env.result().submitSearch();
    const pending = env.writes[0];
    env.result().changeSearch("unsent"); env.render();
    env.pop("/admin/products?agent=3&status=BLOCKED&page=2&q=back");
    expect(env.result().searchDraft).toBe("back");
    env.flushTimers(); expect(env.writes).toHaveLength(1);
    env.result().changeSearch("new history input"); env.render();
    env.acknowledge(pending);
    expect(env.result().searchDraft).toBe("new history input");
    env.flushTimers();
    expect(Object.fromEntries(new URL(env.writes.at(-1)!, "https://figurzilla.invalid").searchParams))
      .toEqual({ agent: "3", status: "BLOCKED", page: "0", q: "new history input" });
    env.pop("/admin/products?agent=2&q=forward");
    expect(env.result().searchDraft).toBe("forward");
  } finally { env.close(); }
});

test("admin Enter flushes once, clear preserves filters, and unmount cancels debounce", () => {
  const env = mountAdmin();
  env.result().changeSearch(""); env.render(); env.result().submitSearch(); env.flushTimers();
  expect(env.writes).toHaveLength(1);
  expect(Object.fromEntries(new URL(env.writes[0], "https://figurzilla.invalid").searchParams))
    .toEqual({ agent: "2", status: "ACTIVE", page: "0", q: "" });
  env.result().changeSearch("unmounted"); env.render(); env.close(); env.flushTimers();
  expect(env.writes).toHaveLength(1);
});

for (const beforeEffects of [false, true]) {
  test(`header shrink 3 → 1 uses typed search, including Enter before reset effect=${beforeEffects}`, () => {
    const env = mount<ReturnType<typeof useSearch>>("src/widgets/header/model/useSearch.ts", "useSearch", "/catalog/search?query=dragon");
    try {
      env.result().handleSearchFocus(); env.render();
      const key = (value: string) => ({ key: value, preventDefault: () => {} }) as KeyboardEvent<HTMLInputElement>;
      for (let i = 0; i < 3; i++) { env.result().handleSearchKeyDown(key("ArrowDown")); env.render(); }
      expect(env.result().highlightedSuggestionIndex).toBe(2);
      env.suggestions.data = ["dragon updated"];
      env.render(!beforeEffects);
      if (!beforeEffects) expect(env.result().highlightedSuggestionIndex).toBe(-1);
      env.result().handleSearchKeyDown(key("Enter"));
      // With no active selection the native form calls handleSearchSubmit.
      if (!beforeEffects) env.result().handleSearchSubmit();
      expect(env.writes).toEqual(["/catalog/search?query=dragon"]);
    } finally { env.close(); }
  });
}
