import type { Metadata } from "next";
import "./globals.css";
import { MetrikaHead } from "@/app/analytics/MetrikaHead";
import { AppProviders } from "@/app/providers/AppProviders";
import { AppLayout } from "@/app/layouts/AppLayout";
import { montserrat } from "@/app/config/fonts";
import { SITE_INFO } from "@/shared/config";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_INFO.url),
  applicationName: SITE_INFO.name,
  title: {
    default: "Figurzilla — маркетплейс коллекционных фигурок и 3D-печати",
    template: "%s | Figurzilla",
  },
  description: "Интернет-магазин коллекционных фигурок",
  openGraph: {
    type: "website",
    locale: "ru_RU",
    url: "/",
    siteName: SITE_INFO.name,
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
