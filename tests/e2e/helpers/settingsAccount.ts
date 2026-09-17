import type { Page } from "@playwright/test";
import { fulfillJson, setupMobileAccount } from "./mobileAccount";

const dictionaries: Record<string, { value: string; description: string }[]> = {
  SHOPPING_METHODS: [
    { value: "PRODUCT_PICKUP", description: "Самовывоз товара" },
    { value: "TRANSPORT_COMPANY", description: "Транспортная компания" },
    { value: "RUSSIAN_POST", description: "Почта России" },
  ],
  CURRENCY: [{ value: "RUB", description: "Российский рубль" }],
  TRANSFER_MONEY: [
    { value: "BANK_CARD", description: "Перевод на банковскую карту" },
    { value: "BANK_SBP", description: "Перевод по СБП" },
    { value: "CASH", description: "Оплата наличными" },
  ],
  SOCIAL_NETWORK: [
    { value: "TELEGRAM", description: "Телеграмм аккаунт" },
    { value: "VK", description: "ВКонтакте аккаунт" },
    { value: "WHATSAPP", description: "WhatsApp номер" },
  ],
};

export const setupSettingsAccount = async (page: Page, baseURL?: string) => {
  await setupMobileAccount(page, baseURL);
  const state = {
    records: {
      "/accounts": [{ id: 11, participantId: 1, transferMoney: "BANK_CARD", username: "Получатель", entityValue: "4000 0000 0000 1234", comment: "" }],
      "/transfer": [{ id: 21, participantId: 1, sending: "TRANSPORT_COMPANY", price: 500, currency: "RUB", status: "ACTIVE" }],
      "/social-networks": [{ id: 31, participantId: 1, type: "TELEGRAM", login: "@seller" }],
      "/address": [{ id: 41, country: "Россия", city: "Москва", street: "Оченьдлинноеназваниеулицыдляпроверкипереноса", houseNumber: "15А", apartmentNumber: "14", index: 123456, status: "ACTIVE", fullAddress: "Тестовый адрес" }],
    } as Record<string, Record<string, unknown>[]>,
    failReads: new Set<string>(), failDictionaries: new Set<string>(),
    failWrites: new Set<string>(), failReadsAfterWrite: false,
    reads: {} as Record<string, number>,
    writes: [] as { path: string; method: string; body: Record<string, unknown> }[],
    readGate: Promise.resolve(), writeGate: Promise.resolve(), passwordError: false,
  };
  let nextId = 100;
  await page.route("http://127.0.0.1:9/**", async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname;
    const method = route.request().method();
    if (method === "OPTIONS") return fulfillJson(route, null);
    if (path === "/dictionary") {
      const type = url.searchParams.get("type") ?? "";
      return fulfillJson(route, state.failDictionaries.has(type) ? { message: "Unavailable" } : dictionaries[type] ?? [], state.failDictionaries.has(type) ? 500 : 200);
    }
    if (path === "/participant/password") {
      state.writes.push({ path, method, body: {} });
      await state.writeGate;
      return fulfillJson(route, state.passwordError ? { message: "Не удалось изменить пароль" } : null, state.passwordError ? 500 : 200);
    }
    const collection = Object.keys(state.records).find((key) => path === key || path.startsWith(`${key}/`));
    if (!collection) return route.fallback();
    if (method === "GET") {
      state.reads[collection] = (state.reads[collection] ?? 0) + 1;
      await state.readGate;
      return fulfillJson(route, state.failReads.has(collection) ? { message: "Unavailable" } : state.records[collection], state.failReads.has(collection) ? 500 : 200);
    }
    const body = method === "DELETE" ? {} : route.request().postDataJSON() as Record<string, unknown>;
    state.writes.push({ path, method, body });
    await state.writeGate;
    if (state.failWrites.has(path) || state.failWrites.has(String(body.transferMoney ?? body.type ?? body.sending))) {
      return fulfillJson(route, { message: "Save failed" }, 500);
    }
    const id = Number(path.split("/").at(-1));
    if (method === "POST") state.records[collection].push({ ...body, id: nextId++, participantId: 1, status: "ACTIVE" });
    if (method === "PUT") state.records[collection] = state.records[collection].map((item) => item.id === id ? { ...item, ...body } : item);
    if (method === "DELETE") state.records[collection] = state.records[collection].filter((item) => item.id !== id);
    if (state.failReadsAfterWrite) state.failReads.add(collection);
    return fulfillJson(route, method === "PUT" ? state.records[collection].find((item) => item.id === id) : null);
  });
  return state;
};
