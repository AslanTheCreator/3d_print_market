export interface ExpirationStatus {
  isExpired: boolean;
  daysRemaining: number;
  shouldShowWarning: boolean; // За 7 дней
  shouldShowExtendButton: boolean; // За 3 дня
  statusColor: "success" | "warning" | "error" | "default";
  statusText: string;
}

export const getExpirationStatus = (
  expirationDate: string
): ExpirationStatus => {
  const now = new Date();
  const expiration = new Date(expirationDate);
  const timeDiff = expiration.getTime() - now.getTime();
  const daysRemaining = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

  const isExpired = daysRemaining <= 0;
  const shouldShowWarning = daysRemaining <= 7 && daysRemaining > 3;
  const shouldShowExtendButton = daysRemaining <= 3;

  let statusColor: ExpirationStatus["statusColor"] = "success";
  let statusText = `Активен (${daysRemaining} дн.)`;

  if (isExpired) {
    statusColor = "error";
    statusText = "Истёк срок";
  } else if (daysRemaining <= 3) {
    statusColor = "error";
    statusText = `Осталось ${daysRemaining} дн.`;
  } else if (daysRemaining <= 7) {
    statusColor = "warning";
    statusText = `Осталось ${daysRemaining} дн.`;
  } else if (daysRemaining <= 14) {
    statusColor = "default";
    statusText = `Активен (${daysRemaining} дн.)`;
  }

  return {
    isExpired,
    daysRemaining,
    shouldShowWarning,
    shouldShowExtendButton,
    statusColor,
    statusText,
  };
};

export const formatExpirationDate = (expirationDate: string): string => {
  const date = new Date(expirationDate);
  return date.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};
