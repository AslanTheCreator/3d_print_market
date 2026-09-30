"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
export function useUrlState() {
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const set = (values: Record<string, string | number | null>) => {
    const next = new URLSearchParams(params.toString());
    Object.entries(values).forEach(([key, value]) => value === null ? next.delete(key) : next.set(key, String(value)));
    router.replace(`${pathname}?${next}`, { scroll: false });
  };
  return { params, set, currentUrl: `${pathname}${params.size ? `?${params}` : ""}` };
}
