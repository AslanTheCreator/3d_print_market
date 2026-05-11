import type { Metadata } from "next";
import RegisterPageClient from "./RegisterPageClient";

export const metadata: Metadata = {
  title: "Регистрация",
  alternates: {
    canonical: "/auth/register",
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function RegisterPage() {
  return <RegisterPageClient />;
}
