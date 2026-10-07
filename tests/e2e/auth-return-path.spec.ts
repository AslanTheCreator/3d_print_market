import { expect, type Page, test } from "@playwright/test";
import { getAuthSwitchPath, getPostAuthRedirectPath } from "@/entities/session";
import { mockGuestAuth } from "./helpers/guestAuth";
import { fulfillJson, orderFixture } from "./helpers/mobileAccount";

const completeAuth = async (page: Page, flow: "login" | "register") => {
  const form = page.locator("form");
  await form.getByLabel(/^Email/).fill("guest-flow@example.com");
  await form.getByLabel(/^Пароль/).fill("test-password");
  if (flow === "register") {
    await form.getByLabel(/^Возраст/).fill("25");
    await form.getByRole("button", { name: "Зарегистрироваться", exact: true }).click();
    const dialog = page.getByRole("dialog");
    for (let digit = 1; digit <= 5; digit++) {
      await dialog.getByRole("textbox", { name: `Цифра ${digit} из 5` }).fill(String(digit));
    }
    await dialog.getByRole("button", { name: "Подтвердить", exact: true }).click();
  } else {
    await form.getByRole("button", { name: "Войти", exact: true }).click();
  }
};

test("post-auth destinations reject external URLs and auth loops", () => {
  for (const path of [
    null, "", "https://example.com", "//example.com", "/\\example.com",
    "/%5cexample.com", "/%2fexample.com", "/safe/..//example.com",
    "/auth/login", "/%61uth/register", "/safe/../auth/login", "/auth",
    "/\n/example.com", "/%0d%0a/example.com", "/%invalid",
  ]) {
    expect(getPostAuthRedirectPath(path)).toBe("/");
    for (const authPath of ["/auth/login", "/auth/register"] as const) {
      expect(getAuthSwitchPath(authPath, path ?? "")).toBe(authPath);
    }
  }

  expect(getPostAuthRedirectPath("/checkout")).toBe("/checkout");
  expect(getPostAuthRedirectPath("/catalog/search?name=figure#results"))
    .toBe("/catalog/search?name=figure#results");
  const destination = "/catalog/search?query=figure&page=2#results";
  expect(new URL(getAuthSwitchPath("/auth/login", destination), "https://figurzilla.invalid")
    .searchParams.get("redirect")).toBe(destination);
});

for (const width of [393, 1280]) {
  for (const destination of ["/checkout", "/favorites"]) {
    for (const flow of ["login", "register"] as const) {
      test(`${width}px ${destination} returns after switching auth forms and ${flow}`, async ({ page }) => {
        await mockGuestAuth(page);
        await page.setViewportSize({ width, height: 800 });
        await page.goto(destination);
        const guest = page.getByTestId(`unauthorized-state-${destination.slice(1)}`);
        await guest.getByRole("button", { name: flow === "login" ? "Создать аккаунт" : "Войти", exact: true }).click();
        await page.getByRole("link", { name: flow === "login" ? "Авторизуйтесь" : "зарегистрируйтесь", exact: true }).click();
        await expect(page).toHaveURL(new RegExp(`/auth/${flow}\\?`));
        await expect(page.getByRole("heading", { name: flow === "login" ? "Вход в аккаунт" : "Регистрация", exact: true })).toBeVisible();
        expect(new URL(page.url()).searchParams.get("redirect")).toBe(destination);

        const form = page.locator("form");
        await form.getByLabel(/^Email/).fill("guest-flow@example.com");
        await form.getByLabel(/^Пароль/).fill("test-password");
        if (flow === "register") {
          await form.getByLabel(/^Возраст/).fill("25");
          await form.getByRole("button", { name: "Зарегистрироваться", exact: true }).click();
          const dialog = page.getByRole("dialog");
          for (let digit = 1; digit <= 5; digit++) {
            await dialog.getByRole("textbox", { name: `Цифра ${digit} из 5` }).fill(String(digit));
          }
          await dialog.getByRole("button", { name: "Подтвердить", exact: true }).click();
        } else {
          await form.getByRole("button", { name: "Войти", exact: true }).click();
        }
        await expect(page).toHaveURL(new RegExp(`${destination}$`));
        await expect(guest).toBeHidden();
        if (destination === "/checkout") {
          await expect(page.getByTestId("app-chrome")).toHaveAttribute("data-mobile-chrome-mode", "focused");
          await expect(page.getByRole("navigation", { name: "Основная навигация" })).toBeHidden();
        }
      });
    }
  }
}

for (const redirect of ["https://example.com", "//example.com", "/auth/login", "/\\example.com"]) {
  test(`unsafe redirect ${redirect} is discarded through form switches and login`, async ({ page }) => {
    await mockGuestAuth(page);
    await page.goto(`/auth/login?${new URLSearchParams({ redirect })}`);
    await page.getByRole("link", { name: "зарегистрируйтесь", exact: true }).click();
    await expect(page).toHaveURL(/\/auth\/register$/);
    await page.getByRole("link", { name: "Авторизуйтесь", exact: true }).click();
    await expect(page).toHaveURL(/\/auth\/login$/);
    await completeAuth(page, "login");
    await expect(page).toHaveURL(new URL("/", page.url()).href);
  });
}

for (const width of [393, 1280]) {
  for (const destination of ["/catalog/search?query=stage19", "/catalog/901/detail?query=stage19"]) {
    for (const action of ["cart", "favorite"] as const) {
      for (const flow of ["login", "register"] as const) {
        test(`${width}px guest ${action} from ${destination} returns after ${flow}`, async ({ page }) => {
          await mockGuestAuth(page);
          const product = { ...orderFixture(1, "BOOKED", 1).product, id: 901 };
          await page.route("**/products/find", route => fulfillJson(route, [product]));
          await page.route("http://127.0.0.1:9/product/901", route => fulfillJson(route, {
            ...product, participantId: product.sellerId, description: "Тест возврата после входа",
            originality: "Оригинал", imageIds: [], reviews: [],
          }));
          let writes = 0;
          page.on("request", request => {
            if (["POST", "PUT", "DELETE"].includes(request.method()) &&
              ["/basket", "/favorites"].includes(new URL(request.url()).pathname)) writes++;
          });
          await page.setViewportSize({ width, height: 800 });
          await page.goto(destination);
          const sourceUrl = page.url();
          const trigger = action === "favorite"
            ? page.getByRole("button", { name: "Добавить в избранное", exact: true }).first()
            : page.getByRole("button", {
                name: destination.startsWith("/catalog/search") ? "Купить" : "Добавить в корзину", exact: true,
              }).first();
          await trigger.click();
          const dialog = page.getByRole("dialog");
          await expect(dialog).toContainText("Требуется авторизация");
          await dialog.getByRole("button", { name: "Отмена", exact: true }).click();
          await expect(dialog).toBeHidden();
          await expect(page).toHaveURL(sourceUrl);
          await trigger.click();
          await dialog.getByRole("button", { name: "Войти", exact: true }).click();
          await expect(page).toHaveURL(/\/auth\/login\?/);
          expect(new URL(page.url()).searchParams.get("redirect")).toBe(destination);

          await page.getByRole("link", { name: "зарегистрируйтесь", exact: true }).click();
          await expect(page).toHaveURL(/\/auth\/register\?/);
          expect(new URL(page.url()).searchParams.get("redirect")).toBe(destination);
          if (flow === "login") {
            await page.getByRole("link", { name: "Авторизуйтесь", exact: true }).click();
            await expect(page).toHaveURL(/\/auth\/login\?/);
            expect(new URL(page.url()).searchParams.get("redirect")).toBe(destination);
          }
          await completeAuth(page, flow);
          await expect(page).toHaveURL(sourceUrl);
          await expect(trigger).toBeVisible();
          await expect(page.getByRole("dialog")).toBeHidden();
          expect(writes).toBe(0);
        });
      }
    }
  }
}
