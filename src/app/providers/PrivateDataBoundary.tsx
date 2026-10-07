"use client";

import { useLayoutEffect, useMemo, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/entities/session";
import { bindCartQuantityProjection, useCartQuantityStore } from "@/entities/cart";
import { clearProductFormDraft } from "@/widgets/create-product-form";
import { createPrivateScope, PrivateScopeContext } from "@/shared/lib/query";
import { bindPrivateDataLifecycle } from "./privateDataLifecycle";

export function PrivateDataBoundary({ children }: { children: ReactNode }) {
  const client = useQueryClient();
  const authenticated = useAuthStore(state => state.isAuthenticated);
  const initialized = useAuthStore(state => state.isInitialized);
  const revision = useAuthStore(state => state.accountRevision);
  const id = initialized && authenticated ? revision : null;
  const scope = useMemo(() => createPrivateScope(id, () => {
    const state = useAuthStore.getState();
    return id !== null && state.isAuthenticated && state.accountRevision === id;
  }), [id]);

  useLayoutEffect(() => {
    // Persisted quantities have no confirmed owner; rebuild them from this account's GET.
    const unbindLifecycle = bindPrivateDataLifecycle(client, scope,
      () => useCartQuantityStore.getState().clearQuantities(), clearProductFormDraft);
    const unbindProjection = bindCartQuantityProjection(client, scope);
    return () => {
      unbindProjection();
      unbindLifecycle();
    };
  }, [client, scope]);

  return <PrivateScopeContext.Provider key={id ?? "guest"} value={scope}>{children}</PrivateScopeContext.Provider>;
}
