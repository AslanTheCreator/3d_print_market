"use client";
import { AppConfig, getConfig, loadConfig } from "@/shared/config/index";
import { ReactNode, useEffect, useState } from "react";

type Props = {
  children: ReactNode;
};

export function ConfigProvider({ children }: Props) {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    loadConfig().finally(() => setLoaded(true));
  }, []);

  //   if (!loaded) return <div>Загрузка конфигурации...</div>;

  return <>{children}</>;
}

// утилита для использования конфига в компонентах
export function useConfig(): AppConfig {
  return getConfig();
}
