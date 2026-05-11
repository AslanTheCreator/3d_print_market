import type { Metadata } from "next";
import CheckoutPageClient from "./CheckoutPageClient";

export const metadata: Metadata = {
  title: "Оформление заказа",
  alternates: {
    canonical: "/checkout",
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function CheckoutPage() {
  return <CheckoutPageClient />;
}
