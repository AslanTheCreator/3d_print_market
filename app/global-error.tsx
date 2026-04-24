"use client";

import { useEffect } from "react";
import Link from "next/link";

interface GlobalErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalErrorPage({
  error,
  reset,
}: GlobalErrorPageProps) {
  useEffect(() => {
    console.error("Global error boundary caught an error:", error);
  }, [error]);

  return (
    <html lang="ru">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#fafafa",
          color: "#212121",
          fontFamily:
            'var(--font-montserrat), "Segoe UI", "Helvetica Neue", Arial, "Noto Sans", sans-serif',
          padding: "24px",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "560px",
            textAlign: "center",
            backgroundColor: "#ffffff",
            border: "1px solid #e0e0e0",
            borderRadius: "16px",
            padding: "32px 24px",
            boxSizing: "border-box",
            boxShadow: "0 12px 32px rgba(15, 23, 42, 0.08)",
          }}
        >
          <div
            style={{
              width: "88px",
              height: "88px",
              borderRadius: "999px",
              margin: "0 auto 24px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "rgba(239, 66, 132, 0.08)",
              color: "#ef4284",
              fontSize: "40px",
              fontWeight: 700,
            }}
          >
            !
          </div>

          <h1
            style={{
              margin: "0 0 12px",
              fontSize: "28px",
              lineHeight: 1.25,
            }}
          >
            Приложение временно недоступно
          </h1>

          <p
            style={{
              margin: "0 0 28px",
              color: "#757575",
              fontSize: "16px",
              lineHeight: 1.6,
            }}
          >
            Произошла критическая ошибка. Попробуйте перезагрузить страницу или
            вернуться позже.
          </p>

          <div
            style={{
              display: "flex",
              gap: "12px",
              justifyContent: "center",
              flexWrap: "wrap",
            }}
          >
            <button
              type="button"
              onClick={reset}
              style={{
                border: "none",
                borderRadius: "10px",
                backgroundColor: "#ef4284",
                color: "#ffffff",
                padding: "12px 20px",
                fontSize: "15px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Попробовать снова
            </button>
            <Link
              href="/"
              style={{
                borderRadius: "10px",
                border: "1px solid #ef4284",
                color: "#ef4284",
                padding: "12px 20px",
                fontSize: "15px",
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              На главную
            </Link>
          </div>
        </div>
      </body>
    </html>
  );
}
