import { expect, test } from "@playwright/test";
import type {
  OrderCase,
  OrderCaseDetail,
  OrderCaseSummary,
  OrderCaseKind,
  OrderCaseState,
  OrderCaseOutcome,
  OrderCaseResolutionOutcome,
  ResolveOrderCaseRequest,
  OrderStatus,
} from "@/entities/order";
import {
  getOrderStatusMeta,
  getCustomerOrderActionFlags,
  getSellerOrderActionFlags,
} from "@/entities/order/lib/orderStatusMeta";
import type {
  AdminGiveawayProductRequest,
  AdminGiveawayProductResponse,
  AdminProductDto,
  AdminProductInput,
  Availability,
  GiveawayResponse,
  GiveawaySettingsRequest,
  ProductDto,
} from "@/entities/product";

// Поля сверены с GET http://localhost:8081/v3/api-docs 14.10.2026.
const orderCase = {
  id: 10, version: 0, orderId: 20, kind: "DISPUTE", state: "RESOLVED",
  openedBy: 30, openingComment: "Причина", previousOrderStatus: "ON_THE_WAY",
  telegramUrl: "https://t.me/discussion", resolvedBy: 40, outcome: "LEGACY",
  resolutionComment: "Историческое решение", createdAt: "2026-10-01T10:00:00Z",
  resolvedAt: "2026-10-02T10:00:00Z",
} satisfies OrderCase;

const detail = {
  orderCase, orderStatus: "FAILED", buyerId: 30, sellerId: 50, productId: 60,
  count: 2, totalPrice: 1500.5, prepaymentAmount: 100.25, currency: "RUB",
  paymentProofImageId: 70, orderImages: [70, 71], caseImages: [72],
} satisfies OrderCaseDetail;

const summary = {
  caseId: 10, orderId: 20, kind: "DISPUTE", state: "RESOLVED", openedBy: 30,
  openingComment: "Причина", createdAt: "2026-10-01T10:00:00Z", orderStatus: "FAILED",
} satisfies OrderCaseSummary;

test("case DTOs preserve every confirmed field and distinct proof/image collections", () => {
  const completeCase: keyof OrderCase extends keyof typeof orderCase ? true : false = true;
  const completeDetail: keyof OrderCaseDetail extends keyof typeof detail ? true : false = true;
  const completeSummary: keyof OrderCaseSummary extends keyof typeof summary ? true : false = true;
  expect([completeCase, completeDetail, completeSummary]).toEqual([true, true, true]);
  expect(detail.orderCase.previousOrderStatus).toBe("ON_THE_WAY");
  expect(detail.paymentProofImageId).toBe(70);
  expect(detail.orderImages).toEqual([70, 71]);
  expect(detail.caseImages).toEqual([72]);
  const hasCurrency: "currency" extends keyof OrderCaseDetail ? true : false = true;
  expect(hasCurrency).toBe(true);
  expect(detail.currency).toBe("RUB");
});

test("new read DTOs accept omitted fields and tolerate null without inventing defaults", () => {
  const sparse: [OrderCase, OrderCaseDetail, OrderCaseSummary, GiveawayResponse, AdminGiveawayProductResponse] = [{}, {}, {}, {}, {}];
  const nullable: OrderCaseDetail = {
    orderCase: { previousOrderStatus: null, outcome: null, resolvedAt: null },
    paymentProofImageId: null, orderImages: null, caseImages: null,
  };
  const giveaway: AdminGiveawayProductResponse = { product: { giveawayEnabled: null }, categories: null };
  expect(sparse).toEqual([{}, {}, {}, {}, {}]);
  expect(nullable.paymentProofImageId).toBeNull();
  expect(giveaway.product?.giveawayEnabled).toBeNull();
});

test("case enums and resolution query exclude LEGACY only from new decisions", () => {
  const kinds: Record<OrderCaseKind, true> = { CANCELLATION_REQUEST: true, DISPUTE: true, PAYMENT_APPEAL: true };
  const states: Record<OrderCaseState, true> = { OPEN: true, RESOLVED: true };
  const outcomes: Record<OrderCaseOutcome, true> = { BUYER: true, SELLER: true, CANCELLED: true, REJECTED: true, LEGACY: true };
  const decisions: Record<OrderCaseResolutionOutcome, true> = { BUYER: true, SELLER: true, CANCELLED: true, REJECTED: true };
  const legacyAllowed: "LEGACY" extends ResolveOrderCaseRequest["outcome"] ? true : false = false;
  const missingCommentAllowed: { outcome: "BUYER" } extends ResolveOrderCaseRequest ? true : false = false;
  const unknownStateAllowed: "OTHER" extends OrderCaseState ? true : false = false;
  const request: ResolveOrderCaseRequest = { outcome: "REJECTED", comment: "Причина решения" };
  expect(Object.keys(kinds)).toEqual(["CANCELLATION_REQUEST", "DISPUTE", "PAYMENT_APPEAL"]);
  expect(Object.keys(states)).toEqual(["OPEN", "RESOLVED"]);
  expect(Object.keys(outcomes)).toContain("LEGACY");
  expect(Object.keys(decisions)).toEqual(["BUYER", "SELLER", "CANCELLED", "REJECTED"]);
  expect([legacyAllowed, missingCommentAllowed, unknownStateAllowed]).toEqual([false, false, false]);
  expect(request).toEqual({ outcome: "REJECTED", comment: "Причина решения" });
});

test("CANCELLED has terminal metadata and never exposes ordinary actions", () => {
  const status: OrderStatus = "CANCELLED";
  expect(getOrderStatusMeta(status)).toMatchObject({ label: "Отменён", isActive: false });
  expect(Object.values(getCustomerOrderActionFlags(status))).not.toContain(true);
  expect(Object.values(getSellerOrderActionFlags(status))).not.toContain(true);
});

const settings = {
  enabled: false, telegramUrl: "https://t.me/giveaway", startAt: "2026-10-15T10:00:00+03:00",
  endAt: "2026-10-16T10:00:00+03:00", winnersCount: 2, rules: "Правила", homeText: "Анонс",
} satisfies GiveawaySettingsRequest;

const giveaway = {
  productId: 60, name: "Розыгрыш", description: "Описание", imageIds: [71],
  telegramUrl: settings.telegramUrl, startAt: settings.startAt, endAt: settings.endAt,
  winnersCount: 2, rules: "Правила", homeText: "Анонс", status: "AWAITING_GIVEAWAY",
} satisfies GiveawayResponse;

test("giveaway DTOs preserve settings, separate raw product and relations", () => {
  const completeSettings: keyof GiveawaySettingsRequest extends keyof typeof settings ? true : false = true;
  const completeGiveaway: keyof GiveawayResponse extends keyof typeof giveaway ? true : false = true;
  const response: AdminGiveawayProductResponse = {
    product: {
      id: 60, availability: "GIVEAWAY", status: "AWAITING_GIVEAWAY", count: null,
      giveawayEnabled: false, giveawayTelegramUrl: settings.telegramUrl,
      giveawayStartAt: settings.startAt, giveawayEndAt: settings.endAt,
      giveawayWinnersCount: 2, giveawayRules: "Правила", giveawayHomeText: "Анонс",
      currency: "CREATE", used: false,
    }, imageIds: [71], categories: [{ id: 3, name: "Фигурки" }],
  };
  const adminFields: Pick<AdminProductDto, "giveawayEnabled" | "giveawayTelegramUrl" | "giveawayStartAt" | "giveawayEndAt" | "giveawayWinnersCount" | "giveawayRules" | "giveawayHomeText"> = response.product!;
  expect([completeSettings, completeGiveaway]).toEqual([true, true]);
  expect(adminFields.giveawayEnabled).toBe(false);
  expect(response.categories).toEqual([{ id: 3, name: "Фигурки" }]);
  expect(response.imageIds).toEqual(giveaway.imageIds);
});

test("administrative giveaway request stays separate from existing external editor input", () => {
  const request: AdminGiveawayProductRequest = {
    availability: "GIVEAWAY", name: "Розыгрыш", giveaway: settings,
    categoryIds: [3], imageIds: [71], count: null, used: false, currency: "CREATE",
  };
  const externalEditorAllowsGiveaway: "GIVEAWAY" extends AdminProductInput["availability"] ? true : false = false;
  // Только структурная допустимость по OpenAPI; минимальный валидный payload остаётся B3.
  const sparse: AdminGiveawayProductRequest = { availability: "GIVEAWAY" };
  const sparseSettings: GiveawaySettingsRequest = {};
  const badEnabledAllowed: { enabled: string } extends GiveawaySettingsRequest ? true : false = false;
  const wrappedSettingsAllowed: { giveaway: GiveawaySettingsRequest } extends GiveawaySettingsRequest ? true : false = false;
  expect(request.giveaway).toEqual(settings);
  expect(sparse).toEqual({ availability: "GIVEAWAY" });
  expect(sparseSettings).toEqual({});
  expect([externalEditorAllowsGiveaway, badEnabledAllowed, wrappedSettingsAllowed]).toEqual([false, false, false]);
  const availability: Record<Availability, true> = { PURCHASABLE: true, PREORDER: true, EXTERNAL_PRODUCT: true, GIVEAWAY: true };
  const statuses: Record<ProductDto["status"], true> = { ACTIVE: true, AWAITING_GIVEAWAY: true, TIME_EXPIRED: true, BLOCKED: true, DELETED: true };
  expect(Object.keys(availability)).toContain("GIVEAWAY");
  expect(Object.keys(statuses)).toContain("AWAITING_GIVEAWAY");
});
