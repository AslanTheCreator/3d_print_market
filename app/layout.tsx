import type { Metadata } from "next";
import "./globals.css";
import { MetrikaHead } from "@/app/analytics/MetrikaHead";
import { AppProviders } from "@/app/providers/AppProviders";
import { AppLayout } from "@/app/layouts/AppLayout";
import { montserrat } from "@/app/config/fonts";

export const metadata: Metadata = {
  title: "Figurzilla — маркетплейс коллекционных фигурок и 3D-печати",
  description: "Интернет-магазин коллекционных фигурок",
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
