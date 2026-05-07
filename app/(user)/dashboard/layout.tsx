import { ReactNode } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { RequireAuth } from "@/features/auth";

const ACCESS_TOKEN_COOKIE = "access_token";
const REFRESH_TOKEN_COOKIE = "refresh_token";
const LOGIN_PATH = "/auth/login";
const DASHBOARD_PATH = "/dashboard";

interface DashboardLayoutProps {
  children: ReactNode;
}

export default async function DashboardLayout({
  children,
}: DashboardLayoutProps) {
  const cookieStore = await cookies();
  const hasAuthCookie = Boolean(
    cookieStore.get(ACCESS_TOKEN_COOKIE)?.value ||
      cookieStore.get(REFRESH_TOKEN_COOKIE)?.value,
  );

  if (!hasAuthCookie) {
    redirect(`${LOGIN_PATH}?redirect=${encodeURIComponent(DASHBOARD_PATH)}`);
  }

  return <RequireAuth>{children}</RequireAuth>;
}
