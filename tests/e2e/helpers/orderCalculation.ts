import type { OrderCalculationDto } from "@/entities/order";

export function orderCalculation(overrides: Partial<OrderCalculationDto> = {}): OrderCalculationDto {
  return { known: true, currency: "RUB", scale: 2, goodsAmount: "4000.00", deliveryAmount: "500.00",
    totalAmount: "4500.00", confirmedPaidAmount: "1000.00", remainingAmount: "3500.00", ...overrides };
}
