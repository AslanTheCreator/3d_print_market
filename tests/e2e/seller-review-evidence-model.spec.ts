import { reviewHistory } from "@/features/order-payment/model/paymentEvidence";
import { expect, test } from "@playwright/test";
import { decodeOrderTermsEvents } from "@/entities/order/lib/orderTermsHistory";
import { reviewEvidence, type ReviewDecision } from "@/features/order-payment/model/reviewEvidence";
import { orderCalculation } from "./helpers/orderCalculation";

const decision: ReviewDecision = { stage: "prepayment", actor: 1, buyer: 2, paidBefore: "0", currency: "RUB", scale: 2, action: "return", reason: "Чек A", version: 7, imageId: 70 };
function review(id: number, version: number, imageId: number, approve = false) {
  return { id, kind: approve ? "PAYMENT_APPROVED" : "PAYMENT_RETURNED", actor_id: 1, payload: JSON.stringify({
    imageId, confirmedPaidAmount: approve ? "1000" : "0", request: { expectedVersion: version, reason: "Чек A" } }) };
}
function submit(id: number, expectedVersion: number, imageId: number) {
  return { id, kind: "PAYMENT_SUBMITTED", actor_id: 2, payload: JSON.stringify({ imageId, expectedVersion }) };
}
const cycle = [review(82, 7, 70), submit(88, 8, 71), review(91, 9, 71, true), submit(95, 10, 75)];
const row = { actualStatus: "AWAITING_PAYMENT_APPROVAL", paymentProofImageId: 75, termsVersion: 11, calculation: orderCalculation() } as const;
const decode = (rows: unknown[]) => decodeOrderTermsEvents(JSON.stringify(rows));

test("observes the original return across later prepayment and full payment cycles", () => {
  expect(reviewEvidence(row, decode(cycle.toReversed()), decision, 80)).toBe(true);
  for (const change of [{ actor: 9 }, { action: "approve" as const }, { imageId: 75 }, { version: 8 }, { reason: "Чек B" }, { buyer: 3 }]) {
    expect(reviewEvidence(row, decode(cycle), { ...decision, ...change }, 80)).toBe(false);
  }
  for (const baseline of [undefined, 82, 95]) expect(reviewEvidence(row, decode(cycle), decision, baseline)).toBe(false);
  for (const events of [cycle.slice(1), cycle.filter((_, i) => i !== 2), [...cycle, cycle[0]], [cycle[0], review(83, 7, 70), ...cycle.slice(1)]]) {
    expect(reviewEvidence(row, decode(events), decision, 80)).toBe(false);
  }
});

test("requires exact event identity, stage, version and matching financial data", () => {
  const raw = JSON.stringify(cycle);
  for (const damaged of [raw.replace('"id":82', '"id":82.00000000000000001'), raw.replace('"actor_id":1','"actor_id":1.0'),
    raw.replace('expectedVersion\\":7','expectedVersion\\":7e0'), raw.replace('imageId\\":70','imageId\\":70.0')]) {
    expect(damaged).not.toBe(raw);
    expect(reviewEvidence(row, decodeOrderTermsEvents(damaged), decision, 80)).toBe(false);
  }
  for (const change of [{ termsVersion: 12 }, { actualStatus: "ASSEMBLING" as const }, { paymentProofImageId: 71 },
    { calculation: orderCalculation({ confirmedPaidAmount: "0", remainingAmount: "4500" }) },
    { calculation: orderCalculation({ remainingAmount: "1000.00" }) }]) {
    expect(reviewEvidence({ ...row, ...change }, decode(cycle), decision, 80)).toBe(false);
  }
});

test("current submission agrees with the buyer, status, version and previous return", () => {
  const current = { ...row, calculation: orderCalculation({ confirmedPaidAmount: "0", remainingAmount: "4500" }), termsVersion: 9, paymentProofImageId: 71 };
  expect(reviewHistory(current, decode(cycle.slice(0, 2)), 2).previous?.imageId).toBe(70);
  expect(reviewHistory(row, decode(cycle), 2).previous).toBeUndefined();
  expect(reviewHistory(row, decode(cycle), 2).state).toBe("current");
  expect(reviewHistory({ ...row, actualStatus: "AWAITING_PREPAYMENT_APPROVAL" }, decode(cycle), 2).state).toBe("conflict");
  expect(reviewHistory(row, decode(cycle), 9).state).toBe("conflict");
  expect(reviewHistory(row, decode(cycle.slice(0, 2)), 2).state).toBe("behind");
  expect(reviewHistory(current, decode(cycle), 2).state).toBe("ahead");
  expect(reviewHistory(row, decode([...cycle.slice(0, -1), { ...cycle[3], payload: "{}" }]), 2).state).toBe("invalid");
  expect(reviewHistory({ ...row, termsVersion: 0 }, [], 2).state).toBe("legacy");
});

for (const actualStatus of ["ASSEMBLING", "ON_THE_WAY", "COMPLETED"] as const) {
  test("full approval requires a fully paid balance at " + actualStatus, () => {
    const job: ReviewDecision = { ...decision, stage: "full", action: "approve" };
    for (const [paid, remaining, expected] of [
      ["4500", "0", true], ["1000", "3500", false], ["1000", null, false], ["1000", "2500", false],
    ] as const) {
      const event = { ...review(82, 7, 70, true), payload: JSON.stringify({ request: { expectedVersion: 7 }, imageId: 70, confirmedPaidAmount: paid }) };
      const calculation = orderCalculation({ confirmedPaidAmount: paid, remainingAmount: remaining });
      expect(reviewEvidence({ actualStatus, termsVersion: 8, paymentProofImageId: 70, calculation }, decode([event]), job, 80)).toBe(expected);
    }
  });
}

test("reconciliation checks each financial transition even when a later approval settles the full balance", () => {
  const job: ReviewDecision = { ...decision, paidBefore: "1000", action: "approve" };
  const order = { ...row, actualStatus: "ASSEMBLING" as const, termsVersion: 10,
    calculation: orderCalculation({ confirmedPaidAmount: "4500", remainingAmount: "0" }) };
  const events = decode([review(82, 7, 70, true), submit(88, 8, 71), review(91, 9, 71, true)]);
  const full = { ...events[2], confirmedPaidAmount: "4500" };
  for (const [amount, valid] of [["500", false], ["1000", true], ["1500", true], ["1000.001", false], [null, false]] as const) {
    const first = { ...events[0], confirmedPaidAmount: amount };
    expect(reviewEvidence(order, [first, events[1], full], job, 80)).toBe(valid);
  }
  expect(reviewEvidence(order, [events[0], events[1], full], { ...job, paidBefore: null }, 80)).toBe(false);
});

test("delivery between return and resubmission preserves the last exact paid amount", () => {
  const delivery = { id: 85, actor_id: 1, kind: "DELIVERY_CHANGED", payload: JSON.stringify({
    before: { deliveryAmount: "500" }, after: { deliveryAmount: "500", expectedVersion: 8 } }) };
  for (const [paid, state] of [["500", "conflict"], ["1500", "conflict"], ["1000.000", "current"], ["1000.001", "conflict"]] as const) {
    const returned = { ...review(82, 7, 70), payload: JSON.stringify({
      imageId: 70, confirmedPaidAmount: paid, request: { expectedVersion: 7, reason: "Чек A" } }) };
    const events = decode([returned, delivery, submit(91, 9, 71)]);
    expect(reviewHistory({ ...row, termsVersion: 10, paymentProofImageId: 71 }, events, 2).state).toBe(state);
  }
});
