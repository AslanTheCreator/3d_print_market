export type AppConfig = {
  apiBaseUrl: string;
};

let config: AppConfig = {
  apiBaseUrl: "http://localhost:8081", // дефолт локальный
};

export async function loadConfig(): Promise<void> {
  try {
    const res = await fetch("/config.json");
    if (!res.ok) throw new Error("Не удалось загрузить config.json");
    const data = await res.json();
    config = { ...config, ...data }; // мержим с дефолтом
  } catch (e) {
    console.warn("Используется дефолтный config:", e);
  }
}

export function getConfig(): AppConfig {
  return config;
}
