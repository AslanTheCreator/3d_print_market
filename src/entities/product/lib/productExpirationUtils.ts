export interface ExpirationStatus {
  isExpired: boolean;
  daysRemaining: number;
  shouldShowWarning: boolean; // За 4-7 дней
  shouldShowExtendButton: boolean; // За 7 дней и после истечения
  statusColor: "success" | "warning" | "error" | "default";
  statusText: string;
}

const PRODUCT_RENEWAL_THRESHOLD_DAYS = 7;
const PRODUCT_EXPIRATION_URGENT_THRESHOLD_DAYS = 3;

export const getExpirationStatus = (
  expirationDate: string
): ExpirationStatus => {
  const now = new Date();
  const expiration = new Date(expirationDate);
  const timeDiff = expiration.getTime() - now.getTime();
  const daysRemaining = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

  const isExpired = daysRemaining <= 0;
  const shouldShowWarning =
    daysRemaining <= PRODUCT_RENEWAL_THRESHOLD_DAYS &&
    daysRemaining > PRODUCT_EXPIRATION_URGENT_THRESHOLD_DAYS;
  const shouldShowExtendButton =
    daysRemaining <= PRODUCT_RENEWAL_THRESHOLD_DAYS;

  let statusColor: ExpirationStatus["statusColor"] = "success";
  let statusText = `Активен (${daysRemaining} дн.)`;

  if (isExpired) {
    statusColor = "error";
    statusText = "Истёк срок";
  } else if (daysRemaining <= PRODUCT_EXPIRATION_URGENT_THRESHOLD_DAYS) {
    statusColor = "error";
    statusText = `Осталось ${daysRemaining} дн.`;
  } else if (daysRemaining <= PRODUCT_RENEWAL_THRESHOLD_DAYS) {
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
