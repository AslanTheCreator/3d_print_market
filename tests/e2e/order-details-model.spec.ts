import { expect, test } from "@playwright/test";
import {
  getCustomerOrderActionFlags,
  getOrderStatusActionHint,
  getSellerOrderActionFlags,
  isActiveOrderStatus,
  shouldShowPaymentProofForRole,
  shouldShowTrackingForRole,
  type ListOrdersModel,
  type OrderStatus,
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

// P09: docs/core-flows.md, «Личный кабинет», and docs/api-and-auth.md,
// «Суммы и этапы заказа» confirm the ordinary payment/fulfilment chains.
// docs/plans/backend-integration.md is the target contract confirmed for P09.
// Proof visibility and payment in DISPUTED still need integration/context;
// see the P09 blockers. User cancellation is tested separately below.
// Expected values are literals, independent of the production whitelists.
const customerStagePermissions = {
  BOOKED: { canPay: false, canPrePay: false, canConfirmReceipt: false },
  AWAITING_PREPAYMENT: { canPay: false, canPrePay: true, canConfirmReceipt: false },
  AWAITING_PREPAYMENT_APPROVAL: { canPay: false, canPrePay: false, canConfirmReceipt: false },
  AWAITING_PAYMENT: { canPay: true, canPrePay: false, canConfirmReceipt: false },
  ASSEMBLING: { canPay: false, canPrePay: false, canConfirmReceipt: false },
  ON_THE_WAY: { canPay: false, canPrePay: false, canConfirmReceipt: true },
  COMPLETED: { canPay: false, canPrePay: false, canConfirmReceipt: false },
  FAILED: { canPay: false, canPrePay: false, canConfirmReceipt: false },
} satisfies Record<
  Exclude<OrderStatus, "DISPUTED">,
  Pick<ReturnType<typeof getCustomerOrderActionFlags>, "canPay" | "canPrePay" | "canConfirmReceipt">
>;

const sellerStagePermissions = {
  BOOKED: { canConfirmOrder: true, canConfirmPreOrder: false, canShipOrder: false },
  AWAITING_PREPAYMENT: { canConfirmOrder: false, canConfirmPreOrder: false, canShipOrder: false },
  AWAITING_PREPAYMENT_APPROVAL: { canConfirmOrder: false, canConfirmPreOrder: true, canShipOrder: false },
  AWAITING_PAYMENT: { canConfirmOrder: false, canConfirmPreOrder: false, canShipOrder: false },
  ASSEMBLING: { canConfirmOrder: false, canConfirmPreOrder: false, canShipOrder: true },
  ON_THE_WAY: { canConfirmOrder: false, canConfirmPreOrder: false, canShipOrder: false },
  DISPUTED: { canConfirmOrder: false, canConfirmPreOrder: false, canShipOrder: false },
  COMPLETED: { canConfirmOrder: false, canConfirmPreOrder: false, canShipOrder: false },
  FAILED: { canConfirmOrder: false, canConfirmPreOrder: false, canShipOrder: false },
} satisfies Record<
  OrderStatus,
  Pick<ReturnType<typeof getSellerOrderActionFlags>, "canConfirmOrder" | "canConfirmPreOrder" | "canShipOrder">
>;

// docs/core-flows.md explicitly limits customer tracking to these two statuses
// and excludes tracking from seller details. Admin details use a separate UI.
const trackingPermissions = {
  BOOKED: { customer: false, seller: false },
  AWAITING_PREPAYMENT: { customer: false, seller: false },
  AWAITING_PREPAYMENT_APPROVAL: { customer: false, seller: false },
  AWAITING_PAYMENT: { customer: false, seller: false },
  ASSEMBLING: { customer: false, seller: false },
  ON_THE_WAY: { customer: true, seller: false },
  DISPUTED: { customer: false, seller: false },
  COMPLETED: { customer: true, seller: false },
  FAILED: { customer: false, seller: false },
} satisfies Record<OrderStatus, Record<"customer" | "seller", boolean>>;

// backend-integration.md, stage 2, and the user's P09 clarification:
// direct customer/seller cancellation is allowed only in BOOKED.
// Admin CANCEL has a separate, unconfirmed matrix (backend question B4).
const userCancellationPermissions = {
  BOOKED: true,
  AWAITING_PREPAYMENT: false,
  AWAITING_PREPAYMENT_APPROVAL: false,
  AWAITING_PAYMENT: false,
  ASSEMBLING: false,
  ON_THE_WAY: false,
  DISPUTED: false,
  COMPLETED: false,
  FAILED: false,
} satisfies Record<OrderStatus, boolean>;

test.describe("confirmed order permissions (P09 partial; requirement blockers in plan)", () => {
  for (const [status, expected] of Object.entries(customerStagePermissions)) {
    test(`customer ordinary stage permissions: ${status}`, () => {
      const { canPay, canPrePay, canConfirmReceipt } = getCustomerOrderActionFlags(status as OrderStatus);
      expect({ canPay, canPrePay, canConfirmReceipt }).toEqual(expected);
    });
  }

  for (const [status, expected] of Object.entries(sellerStagePermissions)) {
    test(`seller ordinary stage permissions: ${status}`, () => {
      const { canConfirmOrder, canConfirmPreOrder, canShipOrder } = getSellerOrderActionFlags(status as OrderStatus);
      expect({ canConfirmOrder, canConfirmPreOrder, canShipOrder }).toEqual(expected);
    });
  }

  for (const [status, expected] of Object.entries(trackingPermissions)) {
    for (const role of ["customer", "seller"] as const) {
      test(`${role} tracking permission: ${status}`, () => {
        expect(shouldShowTrackingForRole(status as OrderStatus, role)).toBe(expected[role]);
      });
    }
  }

  test("customer direct cancellation is restricted to BOOKED for every status", () => {
    const actual = Object.fromEntries(Object.keys(userCancellationPermissions).map((status) => [
      status,
      getCustomerOrderActionFlags(status as OrderStatus).canCancel,
    ]));
    expect(actual).toEqual(userCancellationPermissions);
  });

  test("seller direct cancellation is restricted to BOOKED for every status", () => {
    const actual = Object.fromEntries(Object.keys(userCancellationPermissions).map((status) => [
      status,
      getSellerOrderActionFlags(status as OrderStatus).canCancel,
    ]));
    expect(actual).toEqual(userCancellationPermissions);
  });
});

test.describe("order details model", () => {
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
