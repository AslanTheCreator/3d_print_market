import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import net from "node:net";

export const output = ".cache/backend-stage12";
export async function connectDev() {
  assert.equal(process.env.FIGURZILLA_DEV_INTEGRATION, "true", "Explicit DEV integration opt-in required");
  process.loadEnvFile(".env.local");
  const runtime = JSON.parse(execFileSync("docker", ["inspect", "3d_print_market-backend-1", "--format", "{{json .Config.Env}}"], { encoding: "utf8" }));
  const env = Object.fromEntries(runtime.map(value => value.split(/=(.*)/s).slice(0, 2)));
  assert.equal(env.SPRING_MAIL_HOST, "host.docker.internal", "External SMTP must be disconnected");
  assert.equal(env.SPRING_MAIL_PORT, "2525");
  assert.ok(/^r2dbc:postgresql:\/\/db:5432\/model_store(?:\?|$)/.test(env.SPRING_R2DBC_URL ?? ""), "Expected local DEV database");
  assert.ok(env.S3_ENDPOINT === "http://minio:9000", "Expected local DEV storage");
  await new Promise((resolve, reject) => {
    const socket = net.createConnection({ host: "127.0.0.1", port: 2525 });
    socket.setTimeout(3000);
    socket.once("error", () => reject(new Error("DEV SMTP sink unavailable")));
    socket.once("timeout", () => { socket.destroy(); reject(new Error("DEV SMTP sink timeout")); });
    socket.once("data", data => {
      const valid = data.toString().startsWith("220 Figurzilla DEV sink"); socket.end("QUIT\r\n");
      if (valid) resolve(); else reject(new Error("Unexpected DEV SMTP sink"));
    });
  });
  const marker = `S12-${Date.now()}`;
  /** @type {{marker: string, products: number[], orders: number[], images: number[], cases: number[], transfers: number[], checks: object[]}} */
  const manifest = { marker, products: [], orders: [], images: [], cases: [], transfers: [], checks: [] };
  /** @type {Record<string, {access_token: string, refresh_token: string}>} */
  const sessions = {};
  async function request(role, path, body, method, multipart) {
    const headers = {};
    if (sessions[role]) headers.Authorization = `Bearer ${sessions[role].access_token}`;
    if (body !== undefined && !multipart) headers["Content-Type"] = "application/json";
    const response = await fetch(`http://localhost:8081${path}`, {
      method: method ?? (body === undefined ? "GET" : "POST"), headers,
      ...(body === undefined ? {} : { body: multipart ? body : JSON.stringify(body) }),
      redirect: "error", signal: AbortSignal.timeout(20_000),
    });
    const text = await response.text();
    let data; try { data = JSON.parse(text); } catch { data = text; }
    // Не сохраняем query, headers, request/response body или доказательства.
    manifest.checks.push({ method: method ?? (body === undefined ? "GET" : "POST"), path: path.split("?")[0], role: role ?? "anonymous", status: response.status, code: data?.code });
    return { status: response.status, data };
  }
  function success(result) {
    assert.ok(result.status >= 200 && result.status < 300, `HTTP ${result.status}, code=${result.data?.code ?? "none"}`);
    return result.data;
  }
  for (const [role, login, password] of [
    ["admin", "ADMIN_LOGIN", "ADMIN_PASSWORD"],
    ["seller", "CODEX_TEST_BUYER_LOGIN", "CODEX_TEST_BUYER_PASSWORD"],
    ["buyer", "CODEX_TEST_SELLER_LOGIN", "CODEX_TEST_SELLER_PASSWORD"],
  ]) sessions[role] = success(await request(null, "/auth/login", { mail: process.env[login], password: process.env[password] }));
  for (const [role, agent] of [["agent", 2], ["outsider", 3]]) {
    const pair = success(await request("admin", `/admin/actions/agents/${agent}/token`, undefined, "POST"));
    sessions[role] = { access_token: pair.accessToken, refresh_token: pair.refreshToken };
  }
  /** @type {Record<string, {id: number, role: string}>} */
  const profiles = {};
  for (const role of ["admin", "seller", "buyer"]) profiles[role] = success(await request(role, "/auth/profile"));
  assert.equal(profiles.admin.role, "ADMIN");
  assert.equal(profiles.seller.id, 18); assert.equal(profiles.buyer.id, 14);
  await mkdir(`${output}/manifests`, { recursive: true });
  const save = () => writeFile(`${output}/manifests/${marker}.json`, JSON.stringify(manifest, null, 2));
  async function product(availability = "PURCHASABLE", extra = {}, role = "seller") {
    const body = { name: `[ТЕСТ ${marker}] ${availability} ${manifest.products.length}`, description: "Synthetic DEV integration fixture", price: 100, count: 200, currency: "RUB", originality: "TEST", availability, categoryIds: [132], imageIds: [], ...extra };
    const id = success(await request(role, role === "agent" ? "/agent/products" : "/products", body));
    assert.ok(Number.isSafeInteger(id)); manifest.products.push(id); await save();
    const read = success(await request(role === "agent" ? "admin" : null, role === "agent" ? `/admin/actions/products/${id}` : `/product/${id}`));
    assert.equal(read.id, id);
    return id;
  }
  async function order(productId, buyer = "buyer") {
    const data = success(await request(buyer, `/order?productId=${productId}`));
    assert.ok(data.addresses.length && data.sellerTransfers.length, "Order prerequisites missing");
    const ids = success(await request(buyer, "/order/BOOKED", [{ productId, count: 1, addressId: data.addresses[0].id, transferId: data.sellerTransfers[0].id, comment: marker }]));
    assert.equal(ids.length, 1); const id = ids[0]; manifest.orders.push(id); await save();
    assert.equal((await readOrder(id, buyer)).actualStatus, "BOOKED"); return id;
  }
  async function readOrder(id, role = "buyer") {
    const orders = success(await request(role, role === "seller" ? "/order/seller" : "/order/customer"));
    const found = orders.find(order => order.orderId === id); assert.ok(found, `Missing order ${id}`); return found;
  }
  async function transition(id, status, role, params = {}, expected = status) {
    const query = new URLSearchParams({ comment: marker, ...params });
    success(await request(role, `/order/${id}/${status}?${query}`, undefined, "POST"));
    assert.equal((await readOrder(id)).actualStatus, expected);
  }
  async function upload(orderId, role = "buyer", tag = "ORDER") {
    const form = new FormData();
    form.append("files", new Blob([Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a2foAAAAASUVORK5CYII=", "base64")], { type: "image/png" }), `${marker}.png`);
    const result = await request(role, `/images?tag=${tag}${orderId ? `&entityId=${orderId}` : ""}`, form, "POST", true);
    const ids = success(result); assert.ok(ids.length); manifest.images.push(...ids); await save(); return ids[0];
  }
  async function cases(id, role = "buyer") { return success(await request(role, `/order/${id}/cases`)); }
  async function open(id, kind, role = "buyer", imageIds = []) {
    const query = new URLSearchParams({ comment: marker }); imageIds.forEach(id => query.append("imageIds", id));
    const paths = { DISPUTE: `/order/orders/${id}/DISPUTED`, CANCELLATION_REQUEST: `/order/${id}/cancellation-request`, PAYMENT_APPEAL: `/order/${id}/payment-appeal` };
    success(await request(role, `${paths[kind]}?${query}`, undefined, "POST"));
    const found = (await cases(id, role)).find(item => item.orderCase.kind === kind && item.orderCase.state === "OPEN");
    assert.ok(found); manifest.cases.push(found.orderCase.id); await save(); return found;
  }
  async function resolve(caseId, outcome, expected, orderId) {
    success(await request("admin", `/admin/actions/order-cases/${caseId}/resolve?${new URLSearchParams({ outcome, comment: marker })}`, undefined, "POST"));
    const detail = success(await request("admin", `/admin/actions/order-cases/${caseId}`));
    assert.equal(detail.orderCase.state, "RESOLVED"); assert.equal(detail.orderCase.outcome, outcome); assert.equal(detail.orderStatus, expected);
    assert.equal((await readOrder(orderId)).actualStatus, expected); return detail;
  }
  async function giveaway(settings, extra = {}) {
    const before = success(await request("admin", "/admin/actions/giveaways/history?page=0&size=100"));
    const body = { name: `[ТЕСТ ${marker}] GIVEAWAY ${manifest.products.length}`, description: "Synthetic DEV prize", availability: "GIVEAWAY", giveaway: settings, ...extra };
    success(await request("admin", "/products", body));
    const after = success(await request("admin", "/admin/actions/giveaways/history?page=0&size=100"));
    const fresh = after.filter(p => !before.some(old => old.id === p.id)); assert.equal(fresh.length, 1);
    const id = fresh[0].id; manifest.products.push(id); await save();
    assert.equal(success(await request("admin", `/admin/actions/giveaways/${id}`)).product.id, id); return id;
  }
  async function refresh(role) {
    const response = await fetch("http://localhost:8081/auth/refresh", { method: "POST", headers: { "X-Refresh-Token": sessions[role].refresh_token }, signal: AbortSignal.timeout(20_000) });
    manifest.checks.push({ method: "POST", path: "/auth/refresh", role, status: response.status });
    assert.equal(response.status, 200);
    const raw = await response.text();
    // Spring возвращает String как text/plain, Axios также принимает JSON string.
    let data = raw;
    if (raw.startsWith('"')) { try { data = JSON.parse(raw); } catch { throw new Error("Malformed refresh response"); } }
    assert.equal(typeof data, "string");
    sessions[role].access_token = data;
    return success(await request(role, "/auth/profile"));
  }
  return { request, success, marker, manifest, profiles, product, order, readOrder, transition, upload, cases, open, resolve, giveaway, refresh, save };
}
