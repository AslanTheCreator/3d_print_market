import type { Page, Route } from "@playwright/test";

const reply = (route: Route, body: unknown, status = 200) => route.fulfill({
  status: route.request().method() === "OPTIONS" ? 204 : status,
  headers: {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  },
  contentType: "application/json",
  body: route.request().method() === "OPTIONS" ? "" : JSON.stringify(body),
});

export const mockGuestAuth = async (page: Page) => {
  await page.route("https://mc.yandex.ru/**", route => route.fulfill({ body: "" }));
  await page.route("**/api/config", route => reply(route, { apiUrl: "http://127.0.0.1:9" }));
  await page.route("http://127.0.0.1:9/**", route => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/auth/login" || path === "/auth/verify-code") {
      return reply(route, { access_token: "guest-flow-access", refresh_token: "guest-flow-refresh" });
    }
    if (path === "/participant" && route.request().method() === "POST") return reply(route, 123);
    if (path === "/auth/profile") return reply(route, {
      id: 1, login: "guest-flow-user", fullName: "Покупатель", role: "USER",
      email: "guest-flow@example.com", imageId: null, image: [], exp: 0, type: "access",
    });
    return reply(route, []);
  });
};
