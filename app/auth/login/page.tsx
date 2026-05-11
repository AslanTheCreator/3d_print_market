import type { Metadata } from "next";
import LoginPageClient from "./LoginPageClient";

export const metadata: Metadata = {
  title: "Вход",
  alternates: {
    canonical: "/auth/login",
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function LoginPage() {
  return <LoginPageClient />;
}
