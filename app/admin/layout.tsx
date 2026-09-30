import type { Metadata } from "next";
import { Suspense, type ReactNode } from "react";
import { RequireAuth } from "@/features/auth";
import { AdminAccess } from "@/features/admin-access";
import { AdminShell } from "@/widgets/admin-shell";
import Loading from "./loading";
export const metadata: Metadata = { title: "Администрирование", robots: { index: false, follow: false } };
export default function AdminLayout({ children }: { children: ReactNode }) {
  return <Suspense fallback={<Loading />}><RequireAuth><AdminAccess><AdminShell>{children}</AdminShell></AdminAccess></RequireAuth></Suspense>;
}
