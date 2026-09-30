import { useAuthStore } from "./authStore";

// Обновление токена не меняет личность и не должно уничтожать открытые формы.
export const useAccountSessionKey = () => useAuthStore((state) =>
  state.isInitialized && state.isAuthenticated ? state.accountRevision : null,
);
