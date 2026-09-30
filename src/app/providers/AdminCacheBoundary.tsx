"use client";
import { useEffect, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/entities/session";

export function AdminCacheBoundary({ children }: { children: ReactNode }) {
  const client = useQueryClient();
  useEffect(() => useAuthStore.subscribe((state, previous) => {
    if (state.accountRevision === previous.accountRevision && state.isAuthenticated === previous.isAuthenticated) return;
    const filters = { predicate: (query: { queryKey: readonly unknown[] }) => query.queryKey[0] === "admin" &&
      (!state.isAuthenticated || query.queryKey[1] !== state.accountRevision) };
    void client.cancelQueries(filters);
    client.removeQueries(filters);
  }), [client]);
  return children;
}
