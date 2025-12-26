// src/app/providers/AuthProvider.tsx
"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/app/store";

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const initializeAuth = useAuthStore((state) => state.initializeAuth);

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  return <>{children}</>;
};
