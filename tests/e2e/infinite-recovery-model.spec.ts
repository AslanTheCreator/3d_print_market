import { expect, test } from "@playwright/test";
import { hashKey, InfiniteQueryObserver, QueryClient } from "@tanstack/react-query";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import type { UseInfiniteProductsOptions } from "@/entities/product/model/useInfiniteProducts";
import type { useInfiniteProducts } from "@/entities/product/model/useInfiniteProducts";
import type { InfiniteScroll } from "@/shared/ui/infinite-scroll/InfiniteScroll";
import { productKeys } from "@/entities/product/model/queryKeys";
import type { ProductDto } from "@/entities/product";
import { orderFixture } from "./helpers/mobileAccount";

// Real query observer and source hooks/effect; only React scheduling and intersection are controlled.
function mount(initialOptions: UseInfiniteProductsOptions<ProductDto>) {
  const client = new QueryClient({ defaultOptions: { queries: { retryDelay: 0 } } });
  let observer: InfiniteQueryObserver | undefined;
  let unbind = () => {};
  let options = initialOptions;
  let index = 0;
  const slots: unknown[] = [];
  const effectDeps: unknown[][] = [];
  let effects: (() => void)[] = [];
  let closed = false;
  let queued = false;
  let result!: ReturnType<typeof useInfiniteProducts>;
  const schedule = () => {
    if (closed || queued) return;
    queued = true;
    queueMicrotask(() => { queued = false; if (!closed) render(); });
  };
  const react = {
    useState: (initial: unknown) => {
      const slot = index++;
      if (!(slot in slots)) slots[slot] = initial;
      return [slots[slot], (value: unknown) => {
        const next = typeof value === "function" ? value(slots[slot]) : value;
        if (!Object.is(next, slots[slot])) { slots[slot] = next; schedule(); }
      }];
    },
    useCallback: (callback: unknown) => { index++; return callback; },
    useEffect: (effect: () => void, dependencies: unknown[]) => {
      const slot = index++;
      if (!effectDeps[slot] || dependencies.some((value, position) => !Object.is(value, effectDeps[slot][position]))) {
        effectDeps[slot] = dependencies;
        effects.push(effect);
      }
    },
  };
  const load = <T,>(path: string, mocks: Record<string, unknown>): T => {
    const module = { exports: {} };
    vm.runInNewContext(ts.transpileModule(readFileSync(path, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX },
    }).outputText, { module, exports: module.exports, require: (name: string) => {
      if (!(name in mocks)) throw new Error(`Missing mock: ${name}`);
      return mocks[name];
    } });
    return module.exports as T;
  };
  const hook = load<{ useInfiniteProducts: typeof useInfiniteProducts }>("src/entities/product/model/useInfiniteProducts.ts", {
    react,
    "@tanstack/react-query": {
      hashKey,
      useInfiniteQuery: (queryOptions: Parameters<InfiniteQueryObserver["setOptions"]>[0]) => {
        if (!observer) {
          observer = new InfiniteQueryObserver(client, queryOptions);
          unbind = observer.subscribe(schedule);
        } else observer.setOptions(queryOptions);
        return observer.getCurrentResult();
      },
    },
  }).useInfiniteProducts;
  const entry = { isIntersecting: true };
  const scroll = load<{ InfiniteScroll: typeof InfiniteScroll }>("src/shared/ui/infinite-scroll/InfiniteScroll.tsx", {
    react, "react/jsx-runtime": { jsx: () => null, jsxs: () => null }, "@mui/material": {},
    "usehooks-ts": { useIntersectionObserver: () => ({ ref: () => {}, entry }) },
  }).InfiniteScroll;
  function render() {
    index = 0;
    effects = [];
    result = hook(options);
    scroll({ children: null, onLoadMore: () => void result.fetchNextPage(), hasNextPage: !!result.hasNextPage,
      isFetchingNextPage: result.isFetchingNextPage, isLoadMoreError: result.hasNextPageError,
      isLoadMoreBlocked: result.isLoadMoreBlocked });
    for (const effect of effects) effect();
  }
  render();
  return {
    result: () => result,
    refetchAutomatically: () => observer!.refetch(),
    change: (next: UseInfiniteProductsOptions<ProductDto>) => { options = next; render(); },
    close: () => { closed = true; unbind(); observer?.destroy(); client.clear(); },
  };
}

for (const retry of [false, 1] as const) {
  test(`visible sentinel exhausts one tail operation (retry=${retry}), stays paused and resets on every key input`, async () => {
    const reads = { first: 0, tail: 0 };
    let failTail = true;
    const product = { ...orderFixture(1, "BOOKED", 1).product, currency: "RUB", status: "ACTIVE", availability: "PURCHASABLE" } satisfies ProductDto;
    const options: UseInfiniteProductsOptions<ProductDto> = { queryKey: productKeys.catalog(null), size: 2, retry,
      fetchFunction: async params => {
        if (params.lastId !== undefined) {
          reads.tail++;
          if (failTail) throw new Error("Tail failure");
          return [{ ...product, id: 3 }];
        }
        reads.first++;
        return [{ ...product, id: 1 }, { ...product, id: 2 }];
      },
    };
    const env = mount(options);
    try {
      await expect.poll(() => env.result().hasNextPageError).toBe(true);
      expect(reads).toEqual({ first: 1, tail: retry === false ? 1 : 2 });
      await new Promise(resolve => setTimeout(resolve, 30));
      expect(reads.tail).toBe(retry === false ? 1 : 2);
      expect(env.result().data?.pages.flat().map(item => item.id)).toEqual([1, 2]);
      failTail = false;
      await env.refetchAutomatically();
      await expect.poll(() => env.result().isFetching).toBe(false);
      expect(env.result().hasNextPageError).toBe(true);
      expect(reads.tail).toBe(retry === false ? 1 : 2);
      await env.result().fetchNextPage();
      await expect.poll(() => env.result().hasNextPageError).toBe(false);
      expect(env.result().data?.pages.flat().map(item => item.id)).toEqual([1, 2, 3]);

      for (const change of [
        { filters: { categoryId: 32 } }, { filters: { name: "new" } },
        { filters: { participantId: 10, priceRange: { minPrice: 1000 } } },
        { queryKey: productKeys.catalog(7) }, { sortBy: "PRICE_ASC" as const },
      ]) {
        failTail = true;
        const changed = { ...options, ...change };
        env.change(changed);
        await expect.poll(() => env.result().hasNextPageError).toBe(true);
        const failedReads = reads.tail;
        failTail = false;
        // Revisit the original key too: a key transition must discard the old pause.
        env.change(options);
        await expect.poll(() => env.result().hasNextPageError).toBe(false);
        expect(env.result().data?.pages.flat().map(item => item.id)).toEqual([1, 2, 3]);
        expect(reads.tail).toBe(failedReads);
      }
    } finally { env.close(); }
  });
}
