"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

const SEARCH_DEBOUNCE_MS = 300;
const formatUrl = (pathname: string, params: URLSearchParams) =>
  `${pathname}${params.size ? `?${params}` : ""}`;

export function useAdminProductSearch() {
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const currentUrl = formatUrl(pathname, new URLSearchParams(params.toString()));
  const [searchDraft, setSearchDraft] = useState(params.get("q") ?? "");
  const draft = useRef(searchDraft);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navigation = useRef({
    snapshot: currentUrl,
    params: new URLSearchParams(params.toString()),
    ownUrls: new Set<string>(),
  });

  const cancelDebounce = useCallback(() => {
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = null;
  }, []);

  useEffect(() => {
    const state = navigation.current;
    if (state.snapshot === currentUrl) return;
    state.snapshot = currentUrl;
    // An acknowledgement of our replace must not overwrite newer input or filters.
    if (state.ownUrls.delete(currentUrl)) return;
    state.params = new URLSearchParams(params.toString());
    cancelDebounce();
    draft.current = state.params.get("q") ?? "";
    setSearchDraft(draft.current);
  }, [currentUrl, params, cancelDebounce]);

  useEffect(() => {
    const handlePopState = () => {
      const state = navigation.current;
      state.params = new URLSearchParams(window.location.search);
      state.snapshot = formatUrl(window.location.pathname, state.params);
      cancelDebounce();
      draft.current = state.params.get("q") ?? "";
      setSearchDraft(draft.current);
    };
    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
      cancelDebounce();
    };
  }, [cancelDebounce]);

  const set = useCallback((values: Record<string, string | number | null>) => {
    cancelDebounce();
    const state = navigation.current;
    const next = new URLSearchParams(state.params);
    const searchChanged = draft.current !== (next.get("q") ?? "");
    Object.entries(values).forEach(([key, value]) =>
      value === null ? next.delete(key) : next.set(key, String(value)));
    next.set("q", draft.current);
    if (searchChanged) next.set("page", "0");
    const nextUrl = formatUrl(pathname, next);
    state.params = next;
    state.ownUrls.add(nextUrl);
    router.replace(nextUrl, { scroll: false });
  }, [cancelDebounce, pathname, router]);

  const changeSearch = useCallback((value: string) => {
    draft.current = value;
    setSearchDraft(value);
    cancelDebounce();
    timer.current = setTimeout(() => set({ page: 0 }), SEARCH_DEBOUNCE_MS);
  }, [cancelDebounce, set]);

  const submitSearch = useCallback(() => set({ page: 0 }), [set]);

  return { params, currentUrl, set, searchDraft, changeSearch, submitSearch };
}
