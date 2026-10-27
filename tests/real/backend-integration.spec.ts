import { expect, test, type Page } from "@playwright/test";
import { connectDev } from "./backend.mjs";
import { blockExternalTelemetry } from "./network";

let dev: Awaited<ReturnType<typeof connectDev>>;
let ordinary: number, preorder: number, bot: number;
const denied = (status: number) => expect([401, 403, 404]).toContain(status);
const settings = (enabled = false, offset = 3600_000) => ({ enabled, telegramUrl: "https://t.me/figurzilla_dev_test", startAt: new Date(Date.now() + offset).toISOString(), endAt: new Date(Date.now() + offset + 3600_000).toISOString(), winnersCount: 1, rules: "Synthetic DEV rules", homeText: "Synthetic DEV announcement" });

test.beforeAll(async () => {
  dev = await connectDev();
  ordinary = await dev.product();
  preorder = await dev.product("PREORDER", { prepaymentAmount: 25 });
  bot = await dev.product("EXTERNAL_PRODUCT", { externalUrl: `https://example.invalid/${dev.marker}` }, "agent");
});
test.afterAll(async () => { if (dev) await dev.save(); });
test.beforeEach(async ({ page }) => { await blockExternalTelemetry(page); });

async function unpaid(product = ordinary) {
  const id = await dev.order(product);
  await dev.transition(id, "AWAITING_PREPAYMENT", "seller", {}, product === preorder ? "AWAITING_PREPAYMENT" : "AWAITING_PAYMENT");
  return id;
}
async function paid(onTheWay = false) {
  const id = await unpaid(); const imageId = await dev.upload(id);
  await dev.transition(id, "ASSEMBLING", "buyer", { imageId: String(imageId) });
  expect((await dev.readOrder(id)).paymentProofImageId).toBe(imageId);
  if (onTheWay) await dev.transition(id, "ON_THE_WAY", "seller", { deliveryUrl: "https://example.invalid/dev-tracking" });
  return id;
}

test("real roles, CORS and administrative authorization", async () => {
  expect(dev.profiles.admin.role).toBe("ADMIN");
  expect(dev.profiles.buyer.role).toBe("USER"); expect(dev.profiles.seller.role).toBe("USER");
  for (const role of [null, "buyer", "seller", "outsider"]) denied((await dev.request(role, "/admin/actions/order-cases?state=OPEN&limit=50&offset=0")).status);
  expect((await dev.request("admin", "/admin/actions/order-cases?state=OPEN&limit=50&offset=0")).status).toBe(200);
  for (const [origin, status] of [["http://localhost:3000", 200], ["http://127.0.0.1:3000", 403]] as const) {
    const result = await fetch("http://localhost:8081/auth/login", { method: "OPTIONS", headers: { Origin: origin, "Access-Control-Request-Method": "POST", "Access-Control-Request-Headers": "content-type,authorization" } });
    expect(result.status).toBe(status);
  }
});

test("real refresh endpoint returns an access token accepted by profile", async () => {
  expect((await dev.refresh("buyer")).id).toBe(dev.profiles.buyer.id);
});

test("backend CORS must allow the documented X-Refresh-Token header", async () => {
  const result = await fetch("http://localhost:8081/auth/refresh", { method: "OPTIONS", headers: { Origin: "http://localhost:3000", "Access-Control-Request-Method": "POST", "Access-Control-Request-Headers": "x-refresh-token" } });
  expect(result.status).toBe(200);
  expect(result.headers.get("access-control-allow-headers")?.toLowerCase()).toContain("x-refresh-token");
});

for (const actor of ["buyer", "seller"]) test(`BOOKED direct cancellation by ${actor}, old routes rejected`, async () => {
  const id = await dev.order(ordinary);
  for (const path of [`/order/${id}/FAILED`, `/order/orders/${id}/dispute/COMPLETED`]) {
    expect((await dev.request(actor, path, { comment: dev.marker }, "POST")).status).toBeGreaterThanOrEqual(400);
    expect((await dev.readOrder(id)).actualStatus).toBe("BOOKED");
  }
  dev.success(await dev.request(actor, `/order/${id}/CANCELLED`, { comment: dev.marker }));
  expect((await dev.readOrder(id)).actualStatus).toBe("CANCELLED");
  expect(await dev.cases(id)).toEqual([]);
});

for (const outcome of ["CANCELLED", "REJECTED"]) for (const prepaid of [false, true]) test(`cancellation request ${prepaid ? "preorder" : "ordinary"} resolves ${outcome}`, async () => {
  const id = await unpaid(prepaid ? preorder : ordinary);
  const before = (await dev.readOrder(id)).actualStatus;
  const detail = await dev.open(id, "CANCELLATION_REQUEST", prepaid ? "seller" : "buyer");
  expect((await dev.readOrder(id)).actualStatus).toBe(before);
  expect(detail.currency).toBe("RUB");
  const cid = detail.orderCase.id;
  dev.success(await dev.request("admin", `/admin/actions/order-cases/${cid}/telegram-url?url=https%3A%2F%2Ft.me%2Ffigurzilla_dev_test`, undefined, "PUT"));
  expect(dev.success(await dev.request("admin", `/admin/actions/order-cases/${cid}`)).orderCase.telegramUrl).toBe("https://t.me/figurzilla_dev_test");
  await dev.resolve(cid, outcome, outcome === "CANCELLED" ? "CANCELLED" : before, id);
  const repeat = await dev.request("admin", `/admin/actions/order-cases/${cid}/resolve?outcome=${outcome}&comment=${dev.marker}`, undefined, "POST");
  expect([repeat.status, repeat.data.code]).toEqual([409, "ORDER_CASE_ALREADY_RESOLVED"]);
  expect((await dev.cases(id))[0].orderCase.state).toBe("RESOLVED");
});

test("invalid transitions, blank comment and foreign orders remain unchanged", async () => {
  const id = await dev.order(ordinary);
  for (const path of [`/order/${id}/cancellation-request?comment=${dev.marker}`, `/order/orders/${id}/DISPUTED?comment=${dev.marker}`, `/order/${id}/payment-appeal?comment=${dev.marker}`]) {
    const result = await dev.request("buyer", path, undefined, "POST");
    expect([result.status, result.data.code]).toEqual([400, "ORDER_CASE_INVALID_TRANSITION"]);
    expect(await dev.cases(id)).toEqual([]);
  }
  denied((await dev.request("outsider", `/order/${id}/cases`)).status);
  denied((await dev.request("outsider", `/order/${id}/CANCELLED`, { comment: dev.marker })).status);
  expect((await dev.readOrder(id)).actualStatus).toBe("BOOKED");
  const valid = await unpaid();
  const blank = await dev.request("buyer", `/order/${valid}/cancellation-request?comment=%20`, undefined, "POST");
  expect([blank.status, blank.data.code]).toEqual([400, "BAD_REQUEST"]); expect(await dev.cases(valid)).toEqual([]);
  expect((await dev.request("buyer", `/order/${valid}/CANCELLED`, { comment: dev.marker })).status).toBe(400);
  const noProof = await dev.request("buyer", `/order/orders/${valid}/DISPUTED?comment=${dev.marker}`, undefined, "POST");
  expect([noProof.status, noProof.data.code]).toEqual([400, "ORDER_CASE_INVALID_TRANSITION"]);
  expect((await dev.readOrder(valid)).actualStatus).toBe("AWAITING_PAYMENT"); expect(await dev.cases(valid)).toEqual([]);
});

test("concurrent opening yields exactly one OPEN and one coded conflict", async () => {
  const id = await unpaid();
  const results = await Promise.all(["buyer", "seller"].map(role => dev.request(role, `/order/${id}/cancellation-request?comment=${dev.marker}`, undefined, "POST")));
  expect(results.map(r => r.status).sort()).toEqual([200, 409]);
  expect(results.find(r => r.status === 409)?.data.code).toBe("ORDER_CASE_ALREADY_OPEN");
  const list = await dev.cases(id); expect(list).toHaveLength(1); expect(list[0].orderCase.state).toBe("OPEN");
  dev.manifest.cases.push(list[0].orderCase.id);
  await dev.resolve(list[0].orderCase.id, "REJECTED", "AWAITING_PAYMENT", id);
});

test("concurrent administrative decisions yield one persisted result", async () => {
  const id = await unpaid(); const c = await dev.open(id, "CANCELLATION_REQUEST"); const cid = c.orderCase.id;
  const results = await Promise.all(["CANCELLED", "REJECTED"].map(outcome => dev.request("admin", `/admin/actions/order-cases/${cid}/resolve?outcome=${outcome}&comment=${dev.marker}`, undefined, "POST")));
  expect(results.map(r => r.status).sort()).toEqual([200, 409]);
  expect(results.find(r => r.status === 409)?.data.code).toBe("ORDER_CASE_ALREADY_RESOLVED");
  const final = dev.success(await dev.request("admin", `/admin/actions/order-cases/${cid}`));
  expect(final.orderCase.state).toBe("RESOLVED");
  expect((await dev.readOrder(id)).actualStatus).toBe(final.orderCase.outcome === "CANCELLED" ? "CANCELLED" : "AWAITING_PAYMENT");
});

for (const outcome of ["BUYER", "SELLER"]) test(`paid dispute resolves ${outcome} with server policy`, async () => {
  const id = await paid(outcome === "SELLER"); const detail = await dev.open(id, "DISPUTE", outcome === "SELLER" ? "seller" : "buyer");
  expect((await dev.readOrder(id)).actualStatus).toBe("DISPUTED");
  const invalid = await dev.request("admin", `/admin/actions/order-cases/${detail.orderCase.id}/resolve?outcome=LEGACY&comment=${dev.marker}`, undefined, "POST");
  expect([invalid.status, invalid.data.code]).toEqual([400, "ORDER_CASE_INVALID_OUTCOME"]);
  if (outcome === "BUYER") {
    const deniedSeller = await dev.request("admin", `/admin/actions/order-cases/${detail.orderCase.id}/resolve?outcome=SELLER&comment=${dev.marker}`, undefined, "POST");
    expect([deniedSeller.status, deniedSeller.data.code]).toEqual([400, "ORDER_CASE_INVALID_OUTCOME"]);
  }
  await dev.resolve(detail.orderCase.id, outcome, outcome === "BUYER" ? "FAILED" : "COMPLETED", id);
});

for (const actor of ["buyer", "seller"]) test(`prepayment approval proof permits DISPUTE but forbids cancellation by ${actor}`, async () => {
  const id = await dev.order(preorder);
  await dev.transition(id, "AWAITING_PREPAYMENT", "seller");
  const image = await dev.upload(id);
  await dev.transition(id, "AWAITING_PREPAYMENT_APPROVAL", "buyer", { imageId: String(image) });
  expect((await dev.readOrder(id)).paymentProofImageId).toBe(image);
  const cancel = await dev.request(actor, `/order/${id}/cancellation-request?comment=${dev.marker}`, undefined, "POST");
  expect([cancel.status, cancel.data.code]).toEqual([400, "ORDER_CASE_INVALID_TRANSITION"]);
  expect((await dev.readOrder(id)).actualStatus).toBe("AWAITING_PREPAYMENT_APPROVAL");
  expect(await dev.cases(id)).toEqual([]);
  const c = await dev.open(id, "DISPUTE", actor);
  expect(c.orderCase.previousOrderStatus).toBe("AWAITING_PREPAYMENT_APPROVAL");
  expect((await dev.readOrder(id)).actualStatus).toBe("DISPUTED");
  await dev.resolve(c.orderCase.id, "BUYER", "FAILED", id);
});

for (const outcome of ["BUYER", "SELLER"]) test(`payment appeal ${outcome} returns CANCELLED and cannot repeat`, async () => {
  const id = await dev.order(ordinary);
  dev.success(await dev.request("buyer", `/order/${id}/CANCELLED`, { comment: dev.marker }));
  expect((await dev.readOrder(id)).actualStatus).toBe("CANCELLED");
  const sellerAppeal = await dev.request("seller", `/order/${id}/payment-appeal?comment=${dev.marker}`, undefined, "POST");
  expect([sellerAppeal.status, sellerAppeal.data.code]).toEqual([400, "BAD_REQUEST"]);
  expect((await dev.readOrder(id)).actualStatus).toBe("CANCELLED"); expect(await dev.cases(id)).toEqual([]);
  const image = outcome === "BUYER" ? await dev.upload(id) : null;
  const c = await dev.open(id, "PAYMENT_APPEAL", "buyer", image ? [image] : []);
  expect((await dev.readOrder(id)).actualStatus).toBe("DISPUTED");
  if (image) expect(c.caseImages).toContain(image); else expect(c.caseImages).toEqual([]);
  await dev.resolve(c.orderCase.id, outcome, "CANCELLED", id);
  const repeat = await dev.request("buyer", `/order/${id}/payment-appeal?comment=${dev.marker}`, undefined, "POST");
  expect([repeat.status, repeat.data.code]).toEqual([409, "PAYMENT_APPEAL_ALREADY_EXISTS"]);
  expect(await dev.cases(id)).toHaveLength(1);
});

test("payment evidence supplements AWAITING_PAYMENT dispute without leaving DISPUTED", async () => {
  const id = await dev.order(preorder);
  await dev.transition(id, "AWAITING_PREPAYMENT", "seller");
  const first = await dev.upload(id); await dev.transition(id, "AWAITING_PREPAYMENT_APPROVAL", "buyer", { imageId: String(first) });
  await dev.transition(id, "AWAITING_PAYMENT", "seller");
  const c = await dev.open(id, "DISPUTE"); expect(c.orderCase.previousOrderStatus).toBe("AWAITING_PAYMENT");
  const finalProof = await dev.upload(id);
  await dev.transition(id, "ASSEMBLING", "buyer", { imageId: String(finalProof) }, "DISPUTED");
  const read = await dev.cases(id); expect(read[0].caseImages).toContain(finalProof); expect(read[0].orderCase.state).toBe("OPEN");
  await dev.resolve(c.orderCase.id, "BUYER", "FAILED", id);
});

test("ORDER image object access, hidden metadata, binding and deletion prohibition", async () => {
  const id = await unpaid(); const image = await dev.upload(id);
  // Upload остаётся TEMPORARY до подтверждённого присоединения к заказу.
  await dev.transition(id, "ASSEMBLING", "buyer", { imageId: String(image) });
  for (const role of ["buyer", "seller", "admin"]) expect(dev.success(await dev.request(role, `/images?ids=${image}`))).toHaveLength(1);
  const anonymous = await dev.request(null, `/images?ids=${image}`);
  expect(anonymous.status).toBe(200); expect(anonymous.data).toEqual([]);
  denied((await dev.request("outsider", `/images?ids=${image}`)).status);
  expect(dev.success(await dev.request(null, `/images/metadata?ids=${image}`))).toEqual([]);
  const removed = await dev.request("buyer", `/images?tag=ORDER&ids=${image}`, undefined, "DELETE");
  expect(removed.status).toBeGreaterThanOrEqual(400);
  expect(dev.success(await dev.request("buyer", `/images?ids=${image}`))).toHaveLength(1);
  const other = await unpaid();
  const bad = await dev.request("buyer", `/order/${other}/ASSEMBLING?imageId=${image}&comment=${dev.marker}`, undefined, "POST");
  expect(bad.status).toBeGreaterThanOrEqual(400); expect((await dev.readOrder(other)).actualStatus).toBe("AWAITING_PAYMENT");
});

test("ADMIN bot cancellation persists and wrong bot cannot act", async () => {
  let data = dev.success(await dev.request("buyer", `/order?productId=${bot}`));
  if (!data.sellerTransfers.length) {
    const transfer = dev.success(await dev.request("admin", "/admin/actions/agents/2/transfers", { sending: "PRODUCT_PICKUP", price: 0, currency: "RUB" }));
    dev.manifest.transfers.push(transfer); data = dev.success(await dev.request("buyer", `/order?productId=${bot}`));
  }
  const id = await dev.order(bot);
  const wrong = await dev.request("admin", `/admin/actions/agents/3/orders/${id}/CANCEL?comment=${dev.marker}`, undefined, "POST");
  expect(wrong.status).toBeGreaterThanOrEqual(400); expect((await dev.readOrder(id)).actualStatus).toBe("BOOKED");
  dev.success(await dev.request("admin", `/admin/actions/agents/2/orders/${id}/CANCEL?comment=${dev.marker}`, undefined, "POST"));
  expect((await dev.readOrder(id)).actualStatus).toBe("CANCELLED");
  expect(dev.success(await dev.request("admin", "/admin/actions/agents/2/orders?page=0&size=50")).find((o: { orderId: number }) => o.orderId === id).actualStatus).toBe("CANCELLED");
  const awaiting = await dev.order(bot);
  dev.success(await dev.request("admin", `/admin/actions/agents/2/orders/${awaiting}/CONFIRM?comment=${dev.marker}`, undefined, "POST"));
  expect((await dev.readOrder(awaiting)).actualStatus).toBe("AWAITING_PAYMENT");
  expect((await dev.request("admin", `/admin/actions/agents/2/orders/${awaiting}/CANCEL?comment=${dev.marker}`, undefined, "POST")).status).toBe(400);
  expect((await dev.readOrder(awaiting)).actualStatus).toBe("AWAITING_PAYMENT");
});

test("case currency remains the order snapshot after product currency changes", async () => {
  const product = await dev.product(); const id = await unpaid(product);
  const original = dev.success(await dev.request(null, `/product/${product}`));
  dev.success(await dev.request("seller", `/product/${product}`, { name: original.name, description: original.description, availability: "PURCHASABLE", count: original.count, price: original.price, currency: "USD", originality: "TEST", categoryIds: [132], imageIds: original.imageIds }, "PUT"));
  expect(dev.success(await dev.request(null, `/product/${product}`)).currency).toBe("USD");
  const c = await dev.open(id, "CANCELLATION_REQUEST"); expect(c.currency).toBe("RUB");
  expect(dev.success(await dev.request("admin", `/admin/actions/order-cases/${c.orderCase.id}`)).currency).toBe("RUB");
  await dev.resolve(c.orderCase.id, "REJECTED", "AWAITING_PAYMENT", id);
});

test("unrelated ordinary USER cannot read another buyer's active ORDER proof", async () => {
  // ID 18 покупает у бота; ID 14 здесь не является ни покупателем, ни продавцом.
  const required = dev.success(await dev.request("seller", `/order?productId=${bot}`));
  const ids = dev.success(await dev.request("seller", "/order/BOOKED", [{ productId: bot, count: 1, addressId: required.addresses[0].id, transferId: required.sellerTransfers[0].id, comment: dev.marker }]));
  const id = ids[0]; dev.manifest.orders.push(id);
  dev.success(await dev.request("admin", `/admin/actions/agents/2/orders/${id}/CONFIRM?comment=${dev.marker}`, undefined, "POST"));
  const image = await dev.upload(id, "seller");
  dev.success(await dev.request("seller", `/order/${id}/ASSEMBLING?imageId=${image}&comment=${dev.marker}`, undefined, "POST"));
  expect(dev.success(await dev.request("seller", "/order/customer")).find((o: {orderId: number}) => o.orderId === id).actualStatus).toBe("ASSEMBLING");
  expect(dev.success(await dev.request("seller", `/images?ids=${image}`))).toHaveLength(1);
  const foreign = await dev.request("buyer", `/images?ids=${image}`);
  expect(foreign.status).toBe(200); expect(foreign.data).toEqual([]);
  const foreignCases = await dev.request("buyer", `/order/${id}/cases`);
  expect([foreignCases.status, foreignCases.data.code]).toEqual([400, "BAD_REQUEST"]);
});

test("GIVEAWAY creation, public windows, disable/re-enable and overlap validation", async () => {
  const config = settings(true, 3000); config.endAt = new Date(Date.now() + 9000).toISOString();
  const id = await dev.giveaway(config);
  expect(dev.success(await dev.request(null, `/giveaways/products/${id}`)).status).toBe("AWAITING_GIVEAWAY");
  expect((await dev.request(null, `/product/${id}`)).status).toBe(404);
  const overlap = await dev.request("admin", "/products", { availability: "GIVEAWAY", name: dev.marker, giveaway: config });
  expect([overlap.status, overlap.data.code]).toEqual([400, "GIVEAWAY_WINDOW_OVERLAP"]);
  const unauthorized = await dev.request("seller", "/products", { availability: "GIVEAWAY", name: dev.marker, giveaway: settings(false) });
  expect(unauthorized.status).toBe(403);
  await expect.poll(async () => (await dev.request(null, `/giveaways/products/${id}`)).data.status, { timeout: 12_000 }).toBe("ACTIVE");
  dev.success(await dev.request("admin", `/admin/actions/giveaways/${id}`, { ...config, enabled: false }, "PUT"));
  expect(dev.success(await dev.request("admin", `/admin/actions/giveaways/${id}`)).product.giveawayEnabled).toBe(false);
  expect((await dev.request(null, `/giveaways/products/${id}`)).status).toBe(404);
  dev.success(await dev.request("admin", `/admin/actions/giveaways/${id}`, config, "PUT"));
  expect(dev.success(await dev.request(null, "/giveaways/active")).productId).toBe(id);
  await expect.poll(async () => (await dev.request(null, `/giveaways/products/${id}`)).status, { timeout: 15_000 }).toBe(404);
  const past = await dev.request("admin", `/admin/actions/giveaways/${id}`, config, "PUT");
  expect(past.status).toBe(400);
  dev.success(await dev.request("admin", `/admin/actions/giveaways/${id}`, { ...config, enabled: false }, "PUT"));
  expect(dev.success(await dev.request("admin", `/admin/actions/giveaways/${id}`)).product.giveawayEnabled).toBe(false);
});

test("bot conversion and second edit preserve complete relationships", async () => {
  const id = await dev.product("EXTERNAL_PRODUCT", { externalUrl: `https://example.invalid/${dev.marker}/convert` }, "agent");
  const image = await dev.upload(undefined, "admin", "PRODUCT");
  const config = settings(false);
  const input = { name: `[ТЕСТ ${dev.marker}] converted`, description: "Synthetic prize", availability: "GIVEAWAY", price: 0, currency: "RUB", categoryIds: [132], imageIds: [image], giveaway: config };
  dev.success(await dev.request("admin", `/admin/actions/agents/2/products/${id}`, input, "PUT"));
  let read = dev.success(await dev.request("admin", `/admin/actions/giveaways/${id}`));
  expect(read.product.availability).toBe("GIVEAWAY"); expect(read.imageIds).toContain(image); expect(read.categories.map((c: { id: number }) => c.id)).toContain(132);
  dev.success(await dev.request("admin", `/admin/actions/agents/2/products/${id}`, { ...input, giveaway: { ...config, homeText: "Changed DEV text" } }, "PUT"));
  read = dev.success(await dev.request("admin", `/admin/actions/giveaways/${id}`));
  expect(read.product.giveawayHomeText).toBe("Changed DEV text"); expect(read.imageIds).toContain(image);
});

test("GIVEAWAY server validation leaves persisted settings unchanged", async () => {
  const config = settings(false); const id = await dev.giveaway(config);
  const before = dev.success(await dev.request("admin", `/admin/actions/giveaways/${id}`)).product;
  expect([before.price, before.currency, before.count, before.prepaymentAmount]).toEqual([0, "RUB", null, null]);
  for (const invalid of [{ winnersCount: 0 }, { telegramUrl: "http://example.invalid/test" }, { startAt: config.endAt }, { rules: " " }, { homeText: " " }]) {
    const result = await dev.request("admin", `/admin/actions/giveaways/${id}`, { ...config, ...invalid }, "PUT");
    expect(result.status).toBe(400);
    const after = dev.success(await dev.request("admin", `/admin/actions/giveaways/${id}`)).product;
    for (const key of ["giveawayEnabled", "giveawayWinnersCount", "giveawayStartAt", "giveawayEndAt", "giveawayTelegramUrl", "giveawayRules", "giveawayHomeText"]) expect(after[key]).toBe(before[key]);
  }
});

test("concurrent overlapping GIVEAWAY enable permits exactly one window", async () => {
  const config = settings(false, 4 * 3600_000);
  const ids = [await dev.giveaway(config), await dev.giveaway(config)];
  try {
    const results = await Promise.all(ids.map(id => dev.request("admin", `/admin/actions/giveaways/${id}`, { ...config, enabled: true }, "PUT")));
    expect(results.map(r => r.status).sort()).toEqual([200, 400]);
    expect(results.find(r => r.status === 400)?.data.code).toBe("GIVEAWAY_WINDOW_OVERLAP");
    const stored = await Promise.all(ids.map(async id => dev.success(await dev.request("admin", `/admin/actions/giveaways/${id}`)).product.giveawayEnabled));
    expect(stored.filter(Boolean)).toHaveLength(1);
  } finally {
    for (const id of ids) {
      dev.success(await dev.request("admin", `/admin/actions/giveaways/${id}`, config, "PUT"));
      expect(dev.success(await dev.request("admin", `/admin/actions/giveaways/${id}`)).product.giveawayEnabled).toBe(false);
    }
  }
});

async function login(page: Page, role: "buyer" | "seller" | "admin", redirect: string) {
  const keys = role === "admin" ? ["ADMIN_LOGIN", "ADMIN_PASSWORD"] : role === "buyer" ? ["CODEX_TEST_SELLER_LOGIN", "CODEX_TEST_SELLER_PASSWORD"] : ["CODEX_TEST_BUYER_LOGIN", "CODEX_TEST_BUYER_PASSWORD"];
  await page.goto(`/auth/login?redirect=${encodeURIComponent(redirect)}`);
  await page.getByLabel(/^Email/).fill(process.env[keys[0]]!); await page.getByLabel(/^Пароль/).fill(process.env[keys[1]]!);
  await page.getByRole("button", { name: "Войти", exact: true }).click(); await expect(page).toHaveURL(`http://localhost:3000${redirect}`);
}

test("production standalone uses real API, optimizer and local MinIO without CSP violations", async ({ page }) => {
  const requests: string[] = []; const violations: string[] = [];
  page.on("request", request => { if (new URL(request.url()).port === "8081") requests.push(new URL(request.url()).pathname); });
  await page.addInitScript(() => document.addEventListener("securitypolicyviolation", event => { (window as typeof window & { imageViolations?: string[] }).imageViolations ??= []; if (event.violatedDirective.startsWith("img-src")) (window as typeof window & { imageViolations: string[] }).imageViolations.push(event.blockedURI); }));
  await page.goto("/catalog/2/detail");
  await expect(page.getByTestId("product-details")).toBeVisible();
  await expect.poll(() => page.locator('img[src*="9000"], img[src*="_next/image"]').evaluateAll(imgs => imgs.some(i => (i as HTMLImageElement).complete && (i as HTMLImageElement).naturalWidth > 0))).toBe(true);
  expect((await page.request.get("/api/config")).status()).toBe(200);
  expect(await (await page.request.get("/api/config")).json()).toEqual({ apiUrl: "http://localhost:8081" });
  violations.push(...await page.evaluate(() => (window as typeof window & { imageViolations?: string[] }).imageViolations ?? []));
  expect(violations).toEqual([]); expect(requests.length).toBeGreaterThan(0);
});

test("real login, user denial of ADMIN and mobile order details", async ({ page }) => {
  await page.setViewportSize({ width: 393, height: 727 });
  const id = await dev.order(ordinary);
  await login(page, "buyer", "/dashboard/purchase");
  await expect(page.getByTestId("mobile-orders")).toBeVisible();
  await expect(page.getByRole("button", { name: `Подробнее о заказе №${id}`, exact: true })).toBeVisible({ timeout: 10_000 });
  await page.getByRole("button", { name: `Подробнее о заказе №${id}`, exact: true }).click();
  await expect(page.getByTestId("order-cases")).toBeVisible();
  await expect(page.getByTestId("order-cases").getByText(/Обращений пока нет/)).toBeVisible();
  await page.goto("/admin/order-cases");
  await expect(page.getByText(/Доступ разрешён только администратору/)).toBeVisible();
});

test("real browser request and ADMIN decision synchronize on return", async ({ page, browser }) => {
  const id = await unpaid();
  await page.setViewportSize({ width: 393, height: 727 });
  await login(page, "buyer", "/dashboard/purchase");
  await page.getByTestId("mobile-orders").getByRole("button", { name: `Подробнее о заказе №${id}`, exact: true }).click();
  const section = page.getByTestId("order-cases");
  await section.getByRole("button", { name: "Запросить отмену", exact: true }).click();
  const comment = section.getByLabel("Комментарий обращения");
  await comment.fill(dev.marker);
  await section.getByRole("button", { name: "Отправить обращение", exact: true }).click();
  await expect(section.getByText("Обращение создано. Заказ и история обновлены.", { exact: true })).toBeVisible();
  const c = (await dev.cases(id)).find((c: { orderCase: { state: string } }) => c.orderCase.state === "OPEN");
  expect(c).toBeTruthy(); dev.manifest.cases.push(c.orderCase.id);
  expect(c.orderCase.openingComment).toBe(dev.marker);
  const adminContext = await browser.newContext();
  try {
    const admin = await adminContext.newPage();
    await blockExternalTelemetry(admin);
    await login(admin, "admin", `/admin/order-cases?case=${c.orderCase.id}`);
    const form = admin.getByRole("form", { name: "Решение обращения" });
    await form.getByLabel("Исход").click(); await admin.getByRole("option", { name: "Отменить заказ", exact: true }).click();
    await form.getByLabel("Комментарий решения").fill(dev.marker);
    await form.getByRole("button", { name: "Принять решение", exact: true }).click();
    await expect.poll(async () => (await dev.cases(id))[0].orderCase.state).toBe("RESOLVED");
    expect((await dev.readOrder(id)).actualStatus).toBe("CANCELLED");
    await page.bringToFront();
    await page.evaluate(() => window.dispatchEvent(new Event("visibilitychange")));
    await expect(section.getByTestId("order-case-card").getByText(/Обращение завершено/)).toBeVisible();
    await expect(page.getByRole("dialog").filter({ has: page.getByText(`Детали заказа №${id}`, { exact: false }) }).getByText("Отменён", { exact: true }).first()).toBeVisible();
  } finally { await adminContext.close(); }
});

test("real account switch clears private lists in the same document", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  const id = await dev.order(ordinary);
  await login(page, "buyer", "/dashboard/purchase");
  await expect(page.getByTestId("desktop-orders").getByRole("button", { name: `Подробнее о заказе №${id}`, exact: true }).first()).toBeVisible();
  await page.evaluate(() => { (window as typeof window & { stage12Document?: string }).stage12Document = "same"; });
  await page.getByRole("link", { name: "Безопасность", exact: true }).click();
  await page.getByRole("button", { name: "Выход", exact: true }).click();
  await expect(page).toHaveURL(/\/auth\/login/);
  await page.getByLabel(/^Email/).fill(process.env.CODEX_TEST_BUYER_LOGIN!);
  await page.getByLabel(/^Пароль/).fill(process.env.CODEX_TEST_BUYER_PASSWORD!);
  await page.getByRole("button", { name: "Войти", exact: true }).click();
  await page.getByRole("link", { name: "Покупки", exact: true }).click();
  await expect(page.getByTestId("desktop-orders")).toBeVisible();
  await expect(page.getByRole("button", { name: `Подробнее о заказе №${id}`, exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => (window as typeof window & { stage12Document?: string }).stage12Document)).toBe("same");
});
