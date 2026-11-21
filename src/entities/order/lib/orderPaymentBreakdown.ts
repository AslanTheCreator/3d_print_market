import type { ListOrdersDto } from "../model/types";

type Terms = Pick<ListOrdersDto, "calculation" | "termsVersion">;
const currencies = new Set(["USD", "EUR", "GBP", "JPY", "CNY", "RUB"]);
const fields = ["goodsAmount", "deliveryAmount", "totalAmount", "confirmedPaidAmount", "remainingAmount"] as const;
type Amounts = Record<(typeof fields)[number], string | null>;
const emptyAmounts: Amounts = {
  goodsAmount: null,
  deliveryAmount: null,
  totalAmount: null,
  confirmedPaidAmount: null,
  remainingAmount: null,
};

function decimal(value: unknown, scale: number): string | null {
  if (typeof value !== "string" || !/^\d+(?:\.\d+)?$/.test(value)) return null;
  const [integer, fraction = ""] = value.split(".");
  if (/[1-9]/.test(fraction.slice(scale))) return null;
  const digits = fraction.slice(0, scale).padEnd(scale, "0");
  return integer.replace(/^0+(?=\d)/, "") + (digits ? "." + digits : "");
}

// Признак предусмотренной предоплаты нужен для этапов, а не для вычисления суммы.
export function hasOrderPrepayment(order: Pick<ListOrdersDto, "prepaymentAmount">) {
  return (order.prepaymentAmount ?? 0) > 0;
}

export function getOrderPaymentBreakdown({ calculation, termsVersion }: Terms) {
  const amounts = { ...emptyAmounts };
  const version = typeof termsVersion === "number" && Number.isSafeInteger(termsVersion) && termsVersion >= 0 ? termsVersion : null;
  let message: string | null = null;
  let formatter: Intl.NumberFormat | undefined;
  if (calculation == null) message = "Актуальный расчёт не получен";
  else if (calculation.known === false) message = "Для оплаты нужна сверка администратором";
  else if (
    calculation.known !== true ||
    !calculation.currency || !currencies.has(calculation.currency) ||
    !Number.isInteger(calculation.scale) || calculation.scale < 0 || calculation.scale > 20
  ) {
    message = "Некорректный формат расчёта";
  } else {
    formatter = new Intl.NumberFormat("ru-RU", {
      style: "currency",
      currency: calculation.currency,
      minimumFractionDigits: calculation.scale,
      maximumFractionDigits: calculation.scale,
    });
    for (const field of fields) {
      amounts[field] = decimal(calculation[field], calculation.scale);
      if (calculation[field] !== null && amounts[field] === null) message = "Некорректный формат расчёта";
    }
    if (amounts.deliveryAmount === null && amounts.totalAmount !== null) {
      message = "Несогласованные суммы расчёта";
      amounts.totalAmount = null;
    }
    if ((amounts.totalAmount === null || amounts.confirmedPaidAmount === null) && amounts.remainingAmount !== null) {
      message = "Несогласованные суммы расчёта";
      amounts.remainingAmount = null;
    }
    if (amounts.totalAmount !== null) {
      // Все строки уже приведены к одному scale. Сравниваем целые минимальные единицы.
      const minorUnits = (amount: string) => BigInt(amount.replace(".", ""));
      const total = minorUnits(amounts.totalAmount);
      const paid = amounts.confirmedPaidAmount === null ? null : minorUnits(amounts.confirmedPaidAmount);
      const remaining = amounts.remainingAmount === null ? null : minorUnits(amounts.remainingAmount);
      if ((paid !== null && paid > total) ||
          (remaining !== null && paid !== null && paid + remaining > total)) {
        message = "Сумма оплаты превышает итог заказа. Обновите расчёт.";
        amounts.remainingAmount = null;
      }
    }
  }
  function format(field: keyof Amounts) {
    const value = amounts[field];
    if (value === null || !formatter) return null;
    // BigInt сохраняет целую часть во всех движках, дробь уже проверена по scale.
    const [integer, fraction] = value.split(".");
    return formatter.formatToParts(BigInt(integer)).map(part => part.type === "fraction" ? fraction : part.value).join("");
  }
  const prepaymentBlock = message ?? (version === null ? "Версия условий не получена" : null);
  let paymentBlock = prepaymentBlock;
  if (!paymentBlock && amounts.remainingAmount === null) paymentBlock = "Остаток пока неизвестен";
  if (!paymentBlock && !/[1-9]/.test(amounts.remainingAmount ?? "")) paymentBlock = "Доплата не требуется";
  const delivery = format("deliveryAmount");
  const deliveryLabel = delivery === null
    ? (calculation?.deliveryAmount === null ? "Стоимость доставки уточнит продавец" : "Нет данных")
    : /[1-9]/.test(amounts.deliveryAmount ?? "") ? delivery : "Бесплатно";
  return {
    format, amounts, message, prepaymentBlock, paymentBlock, deliveryLabel,
    legacy: calculation == null,
    showAmounts: calculation?.known === true,
    totalLabel: format("totalAmount") ?? message ?? "Пока неизвестно",
    fingerprint: JSON.stringify([version, calculation?.currency, calculation?.scale, ...fields.map(field => amounts[field]), message]),
  };
}
export type OrderPaymentBreakdown = ReturnType<typeof getOrderPaymentBreakdown>;
