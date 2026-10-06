"use client";

import { createContext, useContext } from "react";
import { type QueryKey } from "@tanstack/react-query";

export interface PrivateScope {
  id: number | null;
  signal: AbortSignal;
  isCurrent: () => boolean;
  key: (key: QueryKey) => QueryKey;
}

export function createPrivateScope(id: number | null, isCurrent: () => boolean): PrivateScope & { dispose: () => void } {
  const controller = new AbortController();
  return {
    id,
    signal: controller.signal,
    isCurrent: () => !controller.signal.aborted && isCurrent(),
    key: (key) => ["private", id, ...key],
    dispose: () => controller.abort(),
  };
}

const guestScope = createPrivateScope(null, () => false);
export const PrivateScopeContext = createContext<PrivateScope>(guestScope);
export const usePrivateScope = () => useContext(PrivateScopeContext);
