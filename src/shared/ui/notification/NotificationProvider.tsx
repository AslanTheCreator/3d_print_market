"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  ReactNode,
} from "react";
import { Snackbar, Alert, Portal, Stack } from "@mui/material";

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
  maxNotifications?: number;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({
  children,
  maxNotifications = 3,
}) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [dialog, setDialog] = useState<HTMLElement | null>(null);
  const nextNotificationId = useRef(0);

  useEffect(() => {
    // Уведомления входят в DOM активного Dialog: ModalManager не скрывает их
    // от accessibility tree, а FocusTrap допускает кнопку закрытия уведомления.
    const updateHost = () => {
      const dialogs = Array.from(document.querySelectorAll<HTMLElement>('[role="dialog"]'));
      const active = dialogs.filter(element => !element.closest('[aria-hidden="true"]') &&
        element.getClientRects().length > 0 && getComputedStyle(element).visibility !== "hidden").at(-1);
      setDialog(active ?? null);
    };
    updateHost();
    const observer = new MutationObserver(updateHost);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true,
      attributeFilter: ["aria-hidden", "class", "style", "role"] });
    return () => observer.disconnect();
  }, []);

  const showNotification = useCallback(
    (
      message: React.ReactNode,
      severity: Notification["severity"] = "success",
    ) => {
      const id = `notification-${nextNotificationId.current}`;
      nextNotificationId.current += 1;
      const newNotification: Notification = { id, message, severity };

      setNotifications((prev) => {
        const updated = [...prev, newNotification];
        return updated.slice(-maxNotifications);
      });
    },
    [maxNotifications],
  );

  const hideNotification = useCallback((id: string) => {
    // Удаление сфокусированной кнопки не должно оставлять focus на body.
    // Не меняем focus при таймере/click-away или при закрытии самого Dialog.
    const active = document.activeElement;
    if (dialog && active instanceof HTMLElement &&
      active.closest(`[data-notification-id="${id}"]`)) {
      const target = Array.from(dialog.querySelectorAll<HTMLElement>(
        'button:not(:disabled), input:not(:disabled), a[href], [tabindex="0"]',
      )).find(element => !element.closest("[data-notification-region]") &&
        element.getClientRects().length > 0 && getComputedStyle(element).visibility !== "hidden");
      target?.focus();
    }
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, [dialog]);

  const contextValue = useMemo(
    () => ({ showNotification }),
    [showNotification],
  );

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
      {notifications.length > 0 && <Portal container={dialog}>
      <Stack
        data-notification-region
        role="region"
        aria-label="Уведомления"
        spacing={1}
        sx={dialog ? {
          // В потоке Dialog, без перекрытия его полей и действий на коротком экране.
          order: -1, flexShrink: 0, m: 2, mt: 6, maxHeight: "40dvh", overflowY: "auto",
        } : {
          position: "fixed",
          bottom: "calc(max(var(--shell-bottom-offset, 0px), var(--shell-fixed-action-offset, 0px)) + 16px)",
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: (theme) => theme.zIndex.snackbar,
          width: { xs: "calc(100% - 32px)", sm: "auto" },
          minWidth: { sm: 400 },
          maxWidth: { xs: "calc(100% - 32px)", sm: 600 },
        }}
      >
        {notifications.map((notification) => (
          <Snackbar
            key={notification.id}
            data-notification-id={notification.id}
            open={true}
            autoHideDuration={6000}
            onClose={() => hideNotification(notification.id)}
            sx={{ position: "static", m: 0, transform: "none", width: "100%" }}
          >
            <Alert
              onClose={() => hideNotification(notification.id)}
              closeText="Закрыть уведомление"
              severity={notification.severity}
              sx={{ width: "100%" }}
              variant="filled"
            >
              {notification.message}
            </Alert>
          </Snackbar>
        ))}
      </Stack>
      </Portal>}
    </NotificationContext.Provider>
  );
};
