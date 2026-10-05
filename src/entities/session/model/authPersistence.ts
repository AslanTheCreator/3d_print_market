import type { StateStorage } from "zustand/middleware";

export const createAuthStorage = (
  getStorage: () => Storage = () => localStorage,
): StateStorage => {
  const memory = new Map<string, string>();
  let memoryOnly = false;

  return {
    getItem(name) {
      if (!memoryOnly) {
        try {
          const value = getStorage().getItem(name);
          if (value === null) memory.delete(name);
          else memory.set(name, value);
          return value;
        } catch {
          memoryOnly = true;
        }
      }
      return memory.get(name) ?? null;
    },
    setItem(name, value) {
      memory.set(name, value);
      if (!memoryOnly) {
        try {
          getStorage().setItem(name, value);
        } catch {
          memoryOnly = true;
        }
      }
    },
    removeItem(name) {
      memory.delete(name);
      if (!memoryOnly) {
        try {
          getStorage().removeItem(name);
        } catch {
          memoryOnly = true;
        }
      }
    },
  };
};
