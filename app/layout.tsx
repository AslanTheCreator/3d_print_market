// app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import { AppProviders } from "@/app/providers/AppProviders";
import { AppLayout } from "@/app/layouts/AppLayout";

export const metadata: Metadata = {
  title: "Figurzilla",
  description: "Интернет-магазин коллекционных фигурок",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru">
      <body>
        <AppProviders>
          <AppLayout>{children}</AppLayout>
        </AppProviders>
      </body>
    </html>
  );
}
