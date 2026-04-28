import type { Metadata } from "next";
import "./globals.css";
import { MetrikaHead } from "@/app/analytics/MetrikaHead";
import { AppProviders } from "@/app/providers/AppProviders";
import { AppLayout } from "@/app/layouts/AppLayout";
import { montserrat } from "@/app/config/fonts";

const SITE_URL = "https://figurzilla.ru";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: "Figurzilla",
  title: {
    default: "Figurzilla — маркетплейс коллекционных фигурок и 3D-печати",
    template: "%s | Figurzilla",
  },
  description: "Интернет-магазин коллекционных фигурок",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "ru_RU",
    url: "/",
    siteName: "Figurzilla",
    title: "Figurzilla",
    description: "Маркетплейс коллекционных фигурок и 3D-печати",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru">
      <head>
        <MetrikaHead />
      </head>
      <body className={montserrat.variable}>
        <AppProviders>
          <AppLayout>{children}</AppLayout>
        </AppProviders>
      </body>
    </html>
  );
}
