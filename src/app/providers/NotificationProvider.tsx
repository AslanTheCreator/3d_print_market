"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";
import { Snackbar, Alert, Stack } from "@mui/material";

interface Notification {
  id: string;
  message: React.ReactNode;
  severity: "success" | "error" | "warning" | "info";
}

interface NotificationContextType {
  showNotification: (
    message: React.ReactNode,
    severity?: Notification["severity"],
  ) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined,
);

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotification must be used within NotificationProvider");
  }
  return context;
};

interface NotificationProviderProps {
  children: ReactNode;
  maxNotifications?: number; // Максимальное количество одновременных уведомлений
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({
  children,
  maxNotifications = 3,
}) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const showNotification = (
    message: React.ReactNode,
    severity: Notification["severity"] = "success",
  ) => {
    const id = Date.now().toString();
    const newNotification: Notification = { id, message, severity };

    setNotifications((prev) => {
      // Ограничиваем количество уведомлений
      const updated = [...prev, newNotification];
      return updated.slice(-maxNotifications);
    });
  };

  const hideNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  return (
    <NotificationContext.Provider value={{ showNotification }}>
      {children}
      <Stack
        spacing={1}
        sx={{
          position: "fixed",
          bottom: 16,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 9999,
          width: { xs: "calc(100% - 32px)", sm: "auto" },
          minWidth: { sm: 400 },
          maxWidth: { xs: "calc(100% - 32px)", sm: 600 },
        }}
      >
        {notifications.map((notification) => (
          <Snackbar
            key={notification.id}
            open={true}
            autoHideDuration={6000}
            onClose={() => hideNotification(notification.id)}
            sx={{ position: "relative", left: 0, right: 0, transform: "none" }}
          >
            <Alert
              onClose={() => hideNotification(notification.id)}
              severity={notification.severity}
              sx={{ width: "100%" }}
              variant="filled"
            >
              {notification.message}
            </Alert>
          </Snackbar>
        ))}
      </Stack>
    </NotificationContext.Provider>
  );
};
