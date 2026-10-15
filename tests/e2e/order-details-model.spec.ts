import { expect, test } from "@playwright/test";
import {
  getOrderStatusActionHint,
  getOrderStatusMeta,
  getCustomerOrderActionFlags,
  getSellerOrderActionFlags,
  getAdminOrderActionFlags,
  shouldShowOrderProgress,
  getOrderProgressSteps,
  adminOrderStatuses,
  isActiveOrderStatus,
  shouldShowPaymentProofForRole,
  shouldShowTrackingForRole,
  type ListOrdersModel,
} from "@/entities/order";
import {
  formatOrderDate,
  sortOrders,
  filterOrdersByStatus,
  getOrdersFilters,
} from "@/widgets/orders/model/dashboardOrders";
import {
  getSafeTrackingUrl,
  sortOrderHistories,
} from "@/widgets/orders/model/orderDetails";
import { parseOrderDateTimestamp } from "@/widgets/orders/model/orderDate";
import { filterMobileOrders, sortMobileOrders } from "@/widgets/orders/model/mobileOrders";

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
  test("cancelled, failed and disputed keep distinct filters, history, terminal UI and action policies", () => {
    const statuses = ["BOOKED", "AWAITING_PREPAYMENT", "AWAITING_PREPAYMENT_APPROVAL", "AWAITING_PAYMENT", "ASSEMBLING", "ON_THE_WAY", "DISPUTED", "COMPLETED", "CANCELLED", "FAILED"] as const;
    const orders = statuses.map((actualStatus, orderId) => ({ orderId, actualStatus })) as ListOrdersModel[];
    for (const role of ["seller", "customer"] as const) {
      expect(getOrdersFilters(role).find(item => item.id === "cancelled")?.label).toBe("Отменены");
      expect(filterOrdersByStatus(orders, "cancelled", role).map(item => item.actualStatus)).toEqual(["CANCELLED"]);
      expect(filterMobileOrders(orders, "disputed", role).map(item => item.actualStatus)).toEqual(["DISPUTED", "FAILED"]);
      expect(filterMobileOrders(orders, "cancelled", role).map(item => item.actualStatus)).toEqual(["CANCELLED"]);
    }
    expect(adminOrderStatuses).toContain("CANCELLED");
    for (const status of statuses) {
      expect(getCustomerOrderActionFlags(status).canCancel).toBe(status === "BOOKED");
      expect(getSellerOrderActionFlags(status).canCancel).toBe(status === "BOOKED");
      const admin = getAdminOrderActionFlags(status);
      expect(admin.canCancel).toBe(status === "BOOKED");
      expect(admin.canConfirmOrder).toBe(status === "BOOKED");
      expect(admin.canConfirmPreOrder).toBe(status === "AWAITING_PREPAYMENT_APPROVAL");
      expect(admin.canShipOrder).toBe(status === "ASSEMBLING");
    }
    for (const [status, label] of [["CANCELLED", "Отменён"], ["FAILED", "Спор решён в пользу покупателя"], ["DISPUTED", "На рассмотрении"]] as const) {
      expect(getOrderStatusMeta(status).label).toBe(label);
      expect(isActiveOrderStatus(status)).toBe(false);
      expect(Object.values(getCustomerOrderActionFlags(status))).not.toContain(true);
      expect(Object.values(getSellerOrderActionFlags(status))).not.toContain(true);
      for (const prepayment of [true, false]) expect(shouldShowOrderProgress(status, prepayment)).toBe(false);
    }
    expect(sortOrderHistories([history("FAILED", "2026-10-01T10:00:00Z"), history("CANCELLED", "2026-10-02T10:00:00Z")]).map(item => item.status)).toEqual(["FAILED", "CANCELLED"]);
    expect(getOrderProgressSteps(false).map(item => item.key)).toEqual(["BOOKED", "AWAITING_PAYMENT", "ASSEMBLING", "ON_THE_WAY", "COMPLETED"]);
    expect(getOrderProgressSteps(true).map(item => item.key)).toEqual(["BOOKED", "AWAITING_PREPAYMENT", "AWAITING_PREPAYMENT_APPROVAL", "AWAITING_PAYMENT", "ASSEMBLING", "ON_THE_WAY", "COMPLETED"]);
  });
  test("mobile priority keeps action first, then active, then completed without mutating input", () => {
    const orders = [
      { orderId: 1, actualStatus: "COMPLETED", createdAt: "2026-07-25T10:00:00Z" },
      { orderId: 2, actualStatus: "BOOKED", createdAt: "24.07.2026 12:00:00" },
      { orderId: 3, actualStatus: "ON_THE_WAY", createdAt: "2026-07-20T10:00:00Z" },
      { orderId: 4, actualStatus: "AWAITING_PREPAYMENT_APPROVAL", createdAt: "2026-07-21T10:00:00Z" },
    ] as ListOrdersModel[];
    expect(sortMobileOrders(orders, "attention", "customer").map((order) => order.orderId)).toEqual([3, 2, 4, 1]);
    expect(sortMobileOrders(orders, "newest", "customer").map((order) => order.orderId)).toEqual([1, 2, 4, 3]);
    expect(filterMobileOrders(orders, "confirmation", "seller").map((order) => order.orderId)).toEqual([2, 4]);
    expect(filterMobileOrders(orders, "active", "customer")).toHaveLength(3);
    expect(orders.map((order) => order.orderId)).toEqual([1, 2, 3, 4]);
  });
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
