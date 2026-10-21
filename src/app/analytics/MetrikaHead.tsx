"use client";
import Script from "next/script";
import { useLayoutEffect, useRef } from "react";

const counterId = 105318220;
type Metrika = { (...args: unknown[]): void; a?: unknown[][]; l?: number };

export function MetrikaHead() {
  const active = useRef(false), initialized = useRef(false);
  useLayoutEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    active.current = true;
    const target = window as Window & { ym?: Metrika };
    if (!target.ym) {
      const queue: Metrika = (...args) => { (queue.a ??= []).push(args); };
      queue.l = Date.now(); target.ym = queue;
    }
    return () => {
      active.current = false;
      const ym = target.ym;
      // Не оставляем отложенный init, если transport ещё загружается.
      if (ym?.a) ym.a = ym.a.filter(args => args[0] !== counterId);
      if (initialized.current) ym?.(counterId, "destruct");
      initialized.current = false;
    };
  }, []);
  const initialize = () => {
    if (!active.current || initialized.current) return;
    initialized.current = true;
    (window as Window & { ym?: Metrika }).ym?.(counterId, "init", {
      ssr: true, clickmap: true, trackLinks: true, accurateTrackBounce: true,
      webvisor: true, ecommerce: "dataLayer",
    });
  };
  if (process.env.NODE_ENV !== "production") {
    return null;
  }

  return (
    <>
      <Script id="marketplace-metrika" src="https://mc.yandex.ru/metrika/tag.js" strategy="afterInteractive"
        onLoad={initialize} onReady={initialize}
      />
      {/* noscript — тоже в head, но после основного скрипта */}
      <noscript>
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://mc.yandex.ru/watch/105318220"
            style={{ position: "absolute", left: "-9999px" }}
            alt=""
          />
        </div>
      </noscript>
    </>
  );
}
