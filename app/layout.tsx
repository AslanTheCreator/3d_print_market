import type { Metadata } from "next";
import "./globals.css";
import { AppProviders } from "@/app/providers/AppProviders";
import { AppLayout } from "@/app/layouts/AppLayout";
import { MetrikaHead } from "@/app/MetrikaHead";

export const metadata: Metadata = {
  title: "Figurzilla",
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
      <body>
        <AppProviders>
          <AppLayout>{children}</AppLayout>
        </AppProviders>
      </body>
    </html>
  );
}
