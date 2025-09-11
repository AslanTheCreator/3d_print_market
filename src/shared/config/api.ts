import { AppConfig, loadConfig, getConfig } from "./index";

// Создаём "синхронный" объект конфигурации для API
const config: AppConfig = getConfig();

// Загружаем динамический конфиг при старте (client-side)
if (typeof window !== "undefined") {
  loadConfig().then(() => {
    // После загрузки обновляем объект
    Object.assign(config, getConfig());
  });
}

export default config;
