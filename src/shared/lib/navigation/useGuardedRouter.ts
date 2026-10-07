"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { confirmDiscardChanges, isNavigationPending } from "./unsavedChangesGuard";

export function useGuardedRouter() {
  const router = useRouter();
  return useMemo(() => ({
    ...router,
    back: () => {
      if (isNavigationPending()) return false;
      router.back();
      return true;
    },
    forward: () => {
      if (isNavigationPending()) return false;
      router.forward();
      return true;
    },
    push: (...args: Parameters<typeof router.push>) => {
      if (!confirmDiscardChanges()) return false;
      router.push(...args);
      return true;
    },
    replace: (...args: Parameters<typeof router.replace>) => {
      if (!confirmDiscardChanges()) return false;
      router.replace(...args);
      return true;
    },
  }), [router]);
}
