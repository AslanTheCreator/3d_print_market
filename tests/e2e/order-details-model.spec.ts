import { expect, test } from "@playwright/test";
import {
  getOrderStatusActionHint,
  isActiveOrderStatus,
  shouldShowPaymentProofForRole,
  shouldShowTrackingForRole,
  type ListOrdersModel,
} from "@/entities/order";
import {
  formatOrderDate,
  sortOrders,
} from "@/widgets/orders/model/dashboardOrders";
import {
  getSafeTrackingUrl,
  sortOrderHistories,
} from "@/widgets/orders/model/orderDetails";
import { parseOrderDateTimestamp } from "@/widgets/orders/model/orderDate";

type OrderHistory = ListOrdersModel["histories"][number];

const history = (
  status: OrderHistory["status"],
  changedAt: string,
): OrderHistory => ({
  status,
  changedAt,
  comment: status,
});

test.describe("order details model", () => {
  test("allows only absolute HTTP tracking links", () => {
    expect(getSafeTrackingUrl(" https://tracking.example/order/42 ")).toBe(
      "https://tracking.example/order/42",
    );
    expect(getSafeTrackingUrl("http://tracking.example/order/42")).toBe(
      "http://tracking.example/order/42",
    );
    expect(getSafeTrackingUrl("javascript:alert(1)")).toBeNull();
    expect(getSafeTrackingUrl("/track/42")).toBeNull();
    expect(getSafeTrackingUrl("not a url")).toBeNull();
    expect(getSafeTrackingUrl("   ")).toBeNull();
  });

  test("sorts history chronologically and keeps invalid dates stable at the end", () => {
    const invalidFirst = history("FAILED", "invalid-first");
    const invalidSecond = history("DISPUTED", "invalid-second");
    const booked = history("BOOKED", "2026-07-17T08:00:00.000Z");
    const assembling = history(
      "ASSEMBLING",
      "17.07.2026 13:00:00",
    );

    expect(
      sortOrderHistories([
        invalidFirst,
        assembling,
        invalidSecond,
        booked,
      ]),
    ).toEqual([booked, assembling, invalidFirst, invalidSecond]);
  });

  test("parses ISO and backend local dates for display and order sorting", () => {
    const localDate = "17.07.2026 12:34:56";

    expect(parseOrderDateTimestamp(localDate)).toBe(
      new Date(2026, 6, 17, 12, 34, 56).getTime(),
    );
    expect(parseOrderDateTimestamp("2026-07-17T08:00:00.000Z")).toBe(
      Date.parse("2026-07-17T08:00:00.000Z"),
    );
    expect(parseOrderDateTimestamp("31.02.2026 12:00:00")).toBeNull();
    expect(formatOrderDate(localDate)).not.toBe("Дата неизвестна");

    const olderOrder = {
      orderId: 1,
      actualStatus: "BOOKED",
      createdAt: "16.07.2026 12:00:00",
    } as ListOrdersModel;
    const newerOrder = {
      orderId: 2,
      actualStatus: "BOOKED",
      createdAt: "2026-07-17T12:00:00",
    } as ListOrdersModel;
    const invalidOrder = {
      orderId: 3,
      actualStatus: "BOOKED",
      createdAt: "invalid-date",
    } as ListOrdersModel;

    expect(
      sortOrders(
        [newerOrder, invalidOrder, olderOrder],
        "oldest",
        "seller",
      ).map((order) => order.orderId),
    ).toEqual([1, 2, 3]);
  });

  test("keeps prepayment approval active and uses preorder-aware action hints", () => {
    expect(isActiveOrderStatus("AWAITING_PREPAYMENT_APPROVAL")).toBe(true);
    expect(getOrderStatusActionHint("BOOKED", "seller", true)).toContain(
      "перейти к предоплате",
    );
    expect(
      getOrderStatusActionHint(
        "AWAITING_PREPAYMENT_APPROVAL",
        "seller",
        true,
      ),
    ).toContain("оплатил остаток");
  });

  test("keeps payment proof and tracking private to the intended role", () => {
    expect(
      shouldShowPaymentProofForRole(
        "AWAITING_PREPAYMENT_APPROVAL",
        "seller",
      ),
    ).toBe(true);
    expect(
      shouldShowPaymentProofForRole(
        "AWAITING_PREPAYMENT_APPROVAL",
        "customer",
      ),
    ).toBe(false);
    expect(shouldShowTrackingForRole("ON_THE_WAY", "customer")).toBe(true);
    expect(shouldShowTrackingForRole("ON_THE_WAY", "seller")).toBe(false);
    expect(shouldShowTrackingForRole("ASSEMBLING", "customer")).toBe(false);
  });
});
