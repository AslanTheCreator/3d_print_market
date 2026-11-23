import { expect, test } from "@playwright/test";
import { AxiosError, type InternalAxiosRequestConfig } from "axios";
import { authClient } from "@/shared/api";
import { adminOrderStatuses, getOrderPaymentActions, orderPaymentApi, orderTermsApi,
  type ApprovePaymentRequest, type PaymentContext, type ReturnPaymentRequest } from "@/entities/order";
import { decodeOrderTermsEvents, deliveryEvents } from "@/entities/order/lib/orderTermsHistory";
import { orderCalculation } from "./helpers/orderCalculation";

const buyer = { role: "customer" } as const;
const seller = { role: "seller" } as const;
const admin = { role: "admin", agentId: 8 } as const;
const version = { expectedVersion: 0 };
const receipt = { ...version, imageId: 601 };
const signal = new AbortController().signal;
const orderId = 42;

test("шесть денежных маршрутов передают точный JSON и показанную версию", async () => {
  const previous = authClient.defaults.adapter;
  const sent: InternalAxiosRequestConfig[] = [];
  authClient.defaults.adapter = async config => {
    sent.push(config);
    return { data: String(orderId), status: 200, statusText: "OK", headers: {}, config };
  };
  try {
    const reason = "я".repeat(500);
    const returned = { expectedVersion: 11, reason };
    const expected = [];
    for (const stage of ["prepayment", "full"] as const) {
      expect(await orderPaymentApi.submit(buyer, orderId, stage, receipt, signal)).toBe(orderId);
      expected.push([`/order/42/payments/${stage}`, receipt]);
    }
    for (const context of [seller, admin]) {
      const path = context.role === "admin" ? "/admin/actions/agents/8/orders/42" : "/order/42";
      expect(await orderPaymentApi.approve(context, orderId, version, signal)).toBe(orderId);
      expect(await orderPaymentApi.returnPayment(context, orderId, { ...returned, reason: ` ${reason} ` }, signal)).toBe(orderId);
      expected.push([path + "/payments/review/approve", version], [path + "/payments/review/return", returned]);
    }
    expect(sent.map(config => [config.url, JSON.parse(config.data)])).toEqual(expected);
    for (const config of sent) {
      expect(config.method).toBe("post");
      expect(config.signal).toBe(signal);
      expect(config.replayAfterRefresh).toBe(false);
      expect(config.responseType).toBe("text");
    }
  } finally { authClient.defaults.adapter = previous; }
});

test("недопустимые параметры и роль отклоняются до транспорта", async () => {
  const previous = authClient.defaults.adapter;
  let count = 0;
  authClient.defaults.adapter = async () => { count++; throw Error("Запрос дошёл до транспорта"); };
  try {
    for (const invalid of [null, undefined, -1, 1.5, Number.MAX_SAFE_INTEGER + 1, "0"]) {
      const expectedVersion = invalid as number;
      await expect(orderPaymentApi.submit(buyer, orderId, "full", { ...receipt, expectedVersion }, signal)).rejects.toThrow("версия");
      await expect(orderPaymentApi.approve(seller, orderId, { expectedVersion }, signal)).rejects.toThrow("версия");
      await expect(orderPaymentApi.returnPayment(admin, orderId, { expectedVersion, reason: "Причина" }, signal)).rejects.toThrow("версия");
    }
    for (const id of [0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1, undefined as unknown as number]) {
      await expect(orderPaymentApi.approve({ role: "admin", agentId: id }, orderId, version, signal)).rejects.toThrow("агента");
      await expect(orderPaymentApi.approve(seller, id, version, signal)).rejects.toThrow("заказа");
      await expect(orderPaymentApi.submit(buyer, orderId, "full", { ...version, imageId: id }, signal)).rejects.toThrow("чека");
    }
    for (const reason of ["", " \n ", "я".repeat(501)]) {
      await expect(orderPaymentApi.returnPayment(seller, orderId, { ...version, reason }, signal)).rejects.toThrow("причину");
    }
    // Проверяем runtime-границу при входных данных из JS.
    // @ts-expect-error Покупатель не проверяет оплату.
    await expect(orderPaymentApi.approve(buyer, orderId, version, signal)).rejects.toThrow("роль");
    // @ts-expect-error ADMIN не предъявляет чек за покупателя.
    await expect(orderPaymentApi.submit(admin, orderId, "full", receipt, signal)).rejects.toThrow("предъявление");
    expect(count).toBe(0);
  } finally { authClient.defaults.adapter = previous; }
});

test("approve отклоняет DTO другого действия и посторонние поля до транспорта", async () => {
  const previous = authClient.defaults.adapter;
  let count = 0;
  authClient.defaults.adapter = async () => { count++; throw Error("Запрос дошёл до транспорта"); };
  try {
    const returned: ReturnPaymentRequest = { expectedVersion: 0, reason: "Вернуть" };
    const extra = { expectedVersion: 0, comment: "Вернуть" };
    const narrowed: ApprovePaymentRequest = extra;
    for (const context of [seller, admin]) {
      // @ts-expect-error DTO возврата несовместим с подтверждением.
      await expect(orderPaymentApi.approve(context, orderId, returned, signal)).rejects.toThrow("только expectedVersion");
      // @ts-expect-error Переменная с дополнительным полем также отклоняется типами.
      await expect(orderPaymentApi.approve(context, orderId, extra, signal)).rejects.toThrow("только expectedVersion");
      await expect(orderPaymentApi.approve(context, orderId, narrowed, signal)).rejects.toThrow("только expectedVersion");
    }
    expect(count).toBe(0);
  } finally { authClient.defaults.adapter = previous; }
});

test("все шесть POST подтверждаются только точным ID в сыром HTTP 200", async () => {
  const previous = authClient.defaults.adapter;
  const calls = [
    ...(["full", "prepayment"] as const).map(stage =>
      () => orderPaymentApi.submit(buyer, orderId, stage, receipt, signal)),
    ...[seller, admin].flatMap(context => [
      () => orderPaymentApi.approve(context, orderId, version, signal),
      () => orderPaymentApi.returnPayment(context, orderId, { ...version, reason: "Возврат" }, signal),
    ]),
  ];
  let count = 0;
  let status = 200;
  let data: unknown;
  authClient.defaults.adapter = async config => {
    count++;
    return { status, data, headers: { "Content-Type": "application/json" }, statusText: "", config };
  };
  try {
    for (const call of calls) {
      status = 200;
      for (data of ["42", " \t42\r\n"]) {
        await expect(call()).resolves.toBe(orderId);
      }
      const invalid = ["42.0", "42.000000000000001", "42.1", "4.2e1", "0", "-42", "9007199254740992",
        "43", '"42"', "null", "[]", "{}", "", "042", "+42", "42x", "\u00a042", "42\u2028", null, 42];
      for (data of invalid) await expect(call()).rejects.toThrow("не подтвердил номер заказа");
      status = 201;
      data = "42";
      await expect(call()).rejects.toThrow("не подтвердил номер заказа");
      expect(count).toBe(2 + invalid.length + 1);
      count = 0;
    }
    status = 200;
    data = "9007199254740991";
    await expect(orderPaymentApi.approve(seller, Number.MAX_SAFE_INTEGER, version, signal)).resolves.toBe(Number.MAX_SAFE_INTEGER);
    expect(count).toBe(1);
  } finally { authClient.defaults.adapter = previous; }
});

test("сырой структурированный конфликт передаётся вызывающему коду", async () => {
  const previous = authClient.defaults.adapter;
  try {
    let count = 0;
    authClient.defaults.adapter = async config => {
      count++;
      throw new AxiosError("Conflict", "ERR_BAD_REQUEST", config, undefined, {
        status: 409, data: '{"code":"ORDER_TERMS_STALE","message":"Условия изменились"}', config, headers: {}, statusText: "Conflict",
      });
    };
    await expect(orderPaymentApi.submit(buyer, orderId, "full", receipt, signal)).rejects.toMatchObject({ statusCode: 409, code: "ORDER_TERMS_STALE" });
    expect(count).toBe(1);
  } finally { authClient.defaults.adapter = previous; }
});

const order = { orderId, sellerId: 8, termsVersion: 0, paymentProofImageId: 601, calculation: orderCalculation() };
const access = { current: true, attemptBlocked: false, hasOpenCase: false };

for (const context of [buyer, seller, admin]) {
  test(`разрешённые действия во всех статусах для ${context.role}`, () => {
    for (const actualStatus of adminOrderStatuses) {
      const available = getOrderPaymentActions({ ...order, actualStatus }, context, access);
      if (context.role === "customer" && actualStatus === "AWAITING_PREPAYMENT")
        expect(available).toEqual({ stage: "prepayment", actions: ["submit"] });
      else if (context.role === "customer" && actualStatus === "AWAITING_PAYMENT")
        expect(available).toEqual({ stage: "full", actions: ["submit"] });
      else if (context.role !== "customer" && actualStatus === "AWAITING_PREPAYMENT_APPROVAL")
        expect(available).toEqual({ stage: "prepayment", actions: ["approve", "return"] });
      else if (context.role !== "customer" && actualStatus === "AWAITING_PAYMENT_APPROVAL")
        expect(available).toEqual({ stage: "full", actions: ["approve", "return"] });
      else expect(available.actions).toEqual([]);
    }
  });
}

test("версия, актуальность, обращение, чек и агент ограничивают доступные действия", () => {
  const review = { ...order, actualStatus: "AWAITING_PAYMENT_APPROVAL" as const };
  for (const termsVersion of [null, undefined, -1, 2.5, Number.MAX_SAFE_INTEGER + 1]) {
    expect(getOrderPaymentActions({ ...review, termsVersion }, seller, access).actions).toEqual([]);
  }
  for (const paymentProofImageId of [null, undefined, 0, -1, 2.5, Number.MAX_SAFE_INTEGER + 1]) {
    expect(getOrderPaymentActions({ ...review, paymentProofImageId }, seller, access).actions).toEqual([]);
  }
  for (const context of [{ role: "admin", agentId: 7 }, { role: "admin", agentId: 0 }] as PaymentContext[])
    expect(getOrderPaymentActions(review, context, access).actions).toEqual([]);
  for (const blocked of [{ current: false }, { hasOpenCase: true }, { attemptBlocked: true }]) {
    for (const context of [buyer, seller, admin]) {
      const actualStatus = context.role === "customer" ? "AWAITING_PAYMENT" : "AWAITING_PAYMENT_APPROVAL";
      expect(getOrderPaymentActions({ ...order, actualStatus }, context, { ...access, ...blocked }).actions).toEqual([]);
    }
  }
});

test("действия учитывают неизвестную доставку, остаток, частичную оплату и сверку", () => {
  const actions = (status: Parameters<typeof getOrderPaymentActions>[0]["actualStatus"],
    calculation: ReturnType<typeof orderCalculation> | null, role: PaymentContext = buyer) =>
    getOrderPaymentActions({ ...order, actualStatus: status, calculation }, role, access).actions;
  const unknown = orderCalculation({ deliveryAmount: null, totalAmount: null, remainingAmount: null });
  expect(actions("AWAITING_PREPAYMENT", unknown)).toEqual(["submit"]);
  expect(actions("AWAITING_PREPAYMENT_APPROVAL", unknown, seller)).toEqual(["approve", "return"]);
  for (const calculation of [unknown, orderCalculation({ remainingAmount: null }), orderCalculation({ remainingAmount: "0.00", confirmedPaidAmount: "4500.00" })]) {
    expect(actions("AWAITING_PAYMENT", calculation)).toEqual([]);
    expect(actions("AWAITING_PAYMENT_APPROVAL", calculation, admin)).toEqual(["return"]);
  }
  expect(actions("AWAITING_PAYMENT", orderCalculation({ deliveryAmount: "0.00", totalAmount: "4000.00", remainingAmount: "3000.00" }))).toEqual(["submit"]);
  for (const calculation of [null, orderCalculation({ known: false }), orderCalculation({ remainingAmount: "wrong" })]) {
    expect(actions("AWAITING_PREPAYMENT", calculation)).toEqual([]);
    expect(actions("AWAITING_PAYMENT_APPROVAL", calculation, admin)).toEqual([]);
  }
});

test("оба GET истории возвращают смешанные события в порядке backend с точными суммами", async () => {
  const meta = { actor_id: 9, created_at: "2026-11-01T00:00:00Z" };
  const events = [
    { kind: "PAYMENT_SUBMITTED", id: 1, ...meta, payload: '{"expectedVersion":0,"imageId":601}' },
    { kind: "DELIVERY_CHANGED", payload: '{"before":{"deliveryAmount":null},"after":{"deliveryAmount":0.00}}' },
    { kind: "PAYMENT_RETURNED", payload: '{"imageId":601,"request":{"expectedVersion":1,"reason":"Другой чек"},"confirmedPaidAmount":0.00}' },
    { kind: "PAYMENT_SUBMITTED", payload: '{"expectedVersion":2,"imageId":602}' },
    { kind: "PAYMENT_APPROVED", payload: '{"imageId":602,"request":{"expectedVersion":3},"confirmedPaidAmount":12345678901234567.89}' },
    { kind: "DISPUTE_PAYMENT_EVIDENCE", payload: "{}" },
  ];
  const previous = authClient.defaults.adapter;
  const paths: string[] = [];
  authClient.defaults.adapter = async config => {
    paths.push(config.method + " " + config.url);
    const rows = events.map((event, index) => ({ ...event, id: index + 1 }));
    return { config, status: 200, data: JSON.stringify(rows), headers: {}, statusText: "OK" };
  };
  try {
    for (const context of [buyer, seller, admin]) {
      const history = await orderTermsApi.history(context, orderId, signal);
      expect(history).toMatchObject([
        { kind: "PAYMENT_SUBMITTED", id: 1, actor: 9, date: meta.created_at, imageId: 601, expectedVersion: 0, incomplete: false },
        { kind: "DELIVERY_CHANGED", before: { amount: null }, after: { amount: "0.00" } },
        { kind: "PAYMENT_RETURNED", imageId: 601, expectedVersion: 1, reason: "Другой чек", confirmedPaidAmount: "0.00", incomplete: false },
        { kind: "PAYMENT_SUBMITTED", imageId: 602, expectedVersion: 2 },
        { kind: "PAYMENT_APPROVED", imageId: 602, expectedVersion: 3, confirmedPaidAmount: "12345678901234567.89", incomplete: false },
      ]);
      expect(deliveryEvents(history)).toHaveLength(1);
    }
    expect(paths).toEqual(["get /order/42/terms-history", "get /order/42/terms-history", "get /admin/actions/agents/8/orders/42/terms-history"]);
  } finally { authClient.defaults.adapter = previous; }
});

test("лексемы ID и версий проверяются в оболочке и вложенном payload, соседи сохраняются", () => {
  const valid = '{"id":7,"actor_id":9,"kind":"PAYMENT_SUBMITTED","payload":' +
    JSON.stringify('{"imageId":42,"expectedVersion":0}') + '}';
  const fields = ["id", "actor_id", "imageId", "expectedVersion", "request.expectedVersion"] as const;
  for (const field of fields) {
    for (const token of ["42.1", "42.000000000000001", "42.0", "4.2e1", '"42"', "9007199254740992", "-1", "null", undefined]) {
      const property = (key: string, fallback: string, target: typeof field) => {
        const raw = field === target ? token : fallback;
        return raw === undefined ? "" : `"${key}":${raw},`;
      };
      const review = field === "request.expectedVersion";
      const payload = "{" + property("imageId", "42", "imageId") + (review
        ? '"request":{' + property("expectedVersion", "0", "request.expectedVersion") + '"reason":"Возврат"},'
        : property("expectedVersion", "0", "expectedVersion")) + '"confirmedPaidAmount":12345678901234567.89}';
      const kind = review ? "PAYMENT_RETURNED" : "PAYMENT_SUBMITTED";
      const row = "{" + property("id", "7", "id") + property("actor_id", "9", "actor_id") +
        `"kind":"${kind}","payload":${JSON.stringify(payload)}}`;
      const [first, damaged, last] = decodeOrderTermsEvents(`[${valid},${row},${valid}]`);
      expect(first).toMatchObject({ id: 7, actor: 9, imageId: 42, expectedVersion: 0, incomplete: false });
      expect(last).toEqual(first);
      const decodedKey = field === "actor_id" ? "actor" : review ? "expectedVersion" : field;
      expect(damaged).toMatchObject({ [decodedKey]: undefined, incomplete: field !== "actor_id" });
      if (review) expect(damaged).toMatchObject({ reason: "Возврат", confirmedPaidAmount: "12345678901234567.89" });
    }
  }
  expect(() => decodeOrderTermsEvents(JSON.parse(`[${valid}]`))).toThrow("Некорректный ответ истории");
});

test("повреждённые события и движок без исходной лексемы сохраняют только достоверные данные", () => {
  const parse = JSON.parse;
  try {
    JSON.parse = (text, reviver) => parse(text, reviver && function (key, value) { return reviver.call(this, key, value); });
    const history = decodeOrderTermsEvents(JSON.stringify([
      { kind: "PAYMENT_APPROVED", payload: '{"imageId":1,"request":{"expectedVersion":0},"confirmedPaidAmount":99999999999999999.99}' },
      { kind: "PAYMENT_APPROVED", payload: '{"imageId":1,"request":{"expectedVersion":0},"confirmedPaidAmount":"99999999999999999.99"}' },
      { kind: "PAYMENT_RETURNED", payload: '{"request":{"imageId":601},"reason":"ошибка"}' },
      { kind: "PAYMENT_SUBMITTED", id: 10, payload: "не JSON" },
    ]));
    expect(history).toMatchObject([
      { incomplete: true, confirmedPaidAmount: undefined },
      { incomplete: true, confirmedPaidAmount: "99999999999999999.99", imageId: undefined, expectedVersion: undefined },
      { incomplete: true, imageId: undefined, expectedVersion: undefined, reason: undefined },
      { incomplete: true, id: undefined, imageId: undefined, expectedVersion: undefined },
    ]);
  } finally { JSON.parse = parse; }
});
