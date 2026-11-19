import { expect, test } from "@playwright/test";
import { hashKey, InfiniteQueryObserver, QueryClient } from "@tanstack/react-query";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import type { UseInfiniteProductsOptions } from "@/entities/product/model/useInfiniteProducts";
import type { useInfiniteProducts } from "@/entities/product/model/useInfiniteProducts";
import type { InfiniteScroll } from "@/shared/ui/infinite-scroll/InfiniteScroll";
import { productKeys } from "@/entities/product/model/queryKeys";
import { buildProductRequest } from "@/entities/product/lib/buildProductRequest";
import { productSortFields, type ProductRequestModel } from "@/entities/product/model/productRequest";
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
    "./productRequest": { productSortFields },
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

const timestamp = "2026-11-19T10:12:13.123456789+03:00";
const catalogItem = (id: number, sellerRating: number | null): ProductDto => ({
  ...orderFixture(1, "BOOKED", 1).product, status: "ACTIVE", availability: "PURCHASABLE",
  currency: "RUB", id, price: 10.125, sellerRating, createdAt: timestamp,
});

for (const [sortBy, field] of [
  ["DATE_DESC", "lastCreatedAt"], ["DATE_ASC", "lastCreatedAt"],
  ["PRICE_ASC", "lastPrice"], ["PRICE_DESC", "lastPrice"],
  ["SELLER_RATING_ASC", "lastSellerRating"], ["SELLER_RATING_DESC", "lastSellerRating"],
] as const) {
  test(`${sortBy} sends the exact wire cursor for every page and stops on empty`, async () => {
    const rows = [catalogItem(13, 4.675), catalogItem(11, 4.675), catalogItem(9, 0), catalogItem(6, null)];
    const requests: ProductRequestModel[] = [];
    const filters = { categoryId: 32, name: "test" };
    const env = mount({
      queryKey: productKeys.catalog(null), filters, size: 1, sortBy, retry: false,
      fetchFunction: async params => {
        const index = requests.length;
        requests.push(buildProductRequest(params));
        return rows.slice(index, index + 1);
      },
    });
    try {
      await expect.poll(() => env.result().isSuccess && !env.result().hasNextPage).toBe(true);
      const firstPage = { size: 1, sortBy };
      expect(requests).toEqual([
        { ...filters, pageable: firstPage },
        ...rows.map(row => ({ ...filters, pageable: { ...firstPage, lastId: row.id,
          [field]: field === "lastSellerRating" ? row.sellerRating : field === "lastPrice" ? row.price : row.createdAt,
        } })),
      ]);
      expect(env.result().data?.pages.flat().map(item => item.id)).toEqual(rows.map(item => item.id));
      const cursor = { lastCreatedAt: timestamp, lastPrice: 10.125, lastSellerRating: null };
      expect(buildProductRequest({ ...firstPage, ...cursor }).pageable).toEqual(firstPage);
      expect(buildProductRequest({ ...firstPage, ...cursor, lastId: 6 }).pageable)
        .toEqual({ ...firstPage, lastId: 6, [field]: cursor[field] });
    } finally { env.close(); }
  });
}

test("changing sort, price and search discards the old cursor and ignores a delayed tail", async () => {
  let release!: (rows: ProductDto[]) => void;
  const delayed = new Promise<ProductDto[]>(resolve => { release = resolve; });
  let tailSignal: AbortSignal | undefined;
  const requests: ProductRequestModel[] = [];
  const options: UseInfiniteProductsOptions<ProductDto> = {
    size: 2, filters: { name: "old" }, sortBy: "PRICE_ASC", queryKey: productKeys.catalog(null),
    fetchFunction: async (params, signal) => {
      requests.push(buildProductRequest(params));
      if (params.lastId === 10) {
        tailSignal = signal;
        return delayed;
      }
      if (params.lastId === 30) return [catalogItem(20, 3), catalogItem(10, 3)];
      return params.sortBy === "PRICE_ASC"
        ? [catalogItem(40, 3), catalogItem(30, 3)] : [catalogItem(51, null)];
    },
  };
  const env = mount(options);
  try {
    await expect.poll(() => Boolean(tailSignal)).toBe(true);
    const filters = [{ name: "old" }, { name: "old", priceRange: { minPrice: 3 } }, { name: "new", priceRange: { minPrice: 3 } }];
    for (const filter of filters) {
      env.change({ ...options, filters: filter, sortBy: "DATE_ASC" });
      await expect.poll(() => env.result().isSuccess && !env.result().hasNextPage).toBe(true);
      expect(requests.at(-1)).toEqual({ ...filter, pageable: { size: 2, sortBy: "DATE_ASC" } });
    }
    expect(tailSignal?.aborted).toBe(true);
    release([catalogItem(999, 0)]);
    await delayed;
    expect(env.result().data?.pages.flat().map(item => item.id)).toEqual([51]);
    expect(requests).toHaveLength(6);
  } finally { release([]); env.close(); }
});
