export type AppConfig = {
  apiBaseUrl: string;
};

let config: AppConfig = {
  apiBaseUrl: "http://localhost:8081", // дефолт локальный
};

let isConfigLoaded = false;

export async function loadConfig(): Promise<void> {
  if (isConfigLoaded) return; // предотвращаем повторную загрузку

  try {
    const res = await fetch("/config.json");
    if (!res.ok) throw new Error("Не удалось загрузить config.json");
    const data = await res.json();
    config = { ...config, ...data };
    isConfigLoaded = true;
    console.log("Конфигурация загружена:", config);
  } catch (e) {
    console.warn("Используется дефолтный config:", e);
    isConfigLoaded = true;
  }
}

export function getConfig(): AppConfig {
  return config;
}

export function isLoaded(): boolean {
  return isConfigLoaded;
}
