import type { ReactNode } from "react";
import { ApiError, ErrorCodes } from "@/shared/lib/errorHandler";
import { AppLink } from "@/shared/ui/app-link";

interface CreateProductErrorNotification {
  message: ReactNode;
  severity: "error" | "info";
}

const SHIPPING_SETTINGS_PATH = "/dashboard/settings?tab=shipping";
const PAYMENT_SETTINGS_PATH = "/dashboard/settings?tab=payment";
const CONTACTS_SETTINGS_PATH = "/dashboard/settings?tab=contacts";

export const getCreateProductErrorNotification = (
  error: unknown,
): CreateProductErrorNotification => {
  if (error instanceof ApiError) {
    if (error.isCode(ErrorCodes.TRANSFER_NOT_FOUND)) {
      return {
        severity: "info",
        message: (
          <>
            {error.message}.{" "}
            <AppLink
              href={SHIPPING_SETTINGS_PATH}
              color="primary"
              underline="hover"
              sx={{ fontWeight: 600 }}
            >
              Настроить доставку →
            </AppLink>
          </>
        ),
      };
    }

    if (error.isCode(ErrorCodes.ACCOUNT_NOT_FOUND)) {
      return {
        severity: "info",
        message: (
          <>
            {error.message}.{" "}
            <AppLink
              href={PAYMENT_SETTINGS_PATH}
              color="primary"
              underline="hover"
              sx={{ fontWeight: 600 }}
            >
              Настроить способ оплаты →
            </AppLink>
          </>
        ),
      };
    }

    if (error.isCode(ErrorCodes.SOCIAL_NETWORK_NOT_FOUND)) {
      return {
        severity: "info",
        message: (
          <>
            {error.message}.{" "}
            <AppLink
              href={CONTACTS_SETTINGS_PATH}
              color="inherit"
              sx={{ fontWeight: 600 }}
            >
              Настроить соц. сети →
            </AppLink>
          </>
        ),
      };
    }

    return {
      message: error.message,
      severity: "error",
    };
  }

  return {
    message: "Произошла ошибка при создании товара",
    severity: "error",
  };
};
