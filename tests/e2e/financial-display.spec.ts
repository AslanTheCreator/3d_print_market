import { expect, test } from "@playwright/test";
import { fulfillJson, orderFixture, setupMobileAccount } from "./helpers/mobileAccount";
import { formatPrice } from "@/shared/lib/utils/formatPrice";
import { formatMoney } from "@/widgets/product-details/ui/productDetailsFormatters";

const currencies = ["RUB", "USD", "EUR"] as const;
const symbols = { RUB: "₽", USD: "$", EUR: "€" };

for (const [index, currency] of currencies.entries()) {
  test(`shared and detail formatters preserve decimals: ${currency}`, () => {
    for (const [amount, expected] of [[1250.75, "1 250,75"], [250.25, "250,25"], [1000.5, "1 000,5"], [0, "0"], [1250, "1 250"]] as const) {
      const formatted = `${expected} ${symbols[currency]}`;
      expect(formatPrice(amount, currency).replace(/\s/g, " ")).toBe(formatted);
      expect(formatMoney(amount, currency).replace(/\s/g, " ")).toBe(formatted);
    }
  });

  for (const preorder of [false, true]) {
    test(`currency and decimals across cards, details, checkout and payment: ${currency} ${preorder ? "preorder" : "regular"}`, async ({ page, baseURL }) => {
      test.skip(!!process.env.TEST_BASE_URL && !process.env.PLAYWRIGHT_FIXTURE_API_URL, "Requires the local SSR fixture");
      const state = await setupMobileAccount(page, baseURL);
      const id = 910 + index * 2 + Number(preorder);
      const order = orderFixture(id, preorder ? "AWAITING_PREPAYMENT" : "AWAITING_PAYMENT", 1);
      const product = {
        ...order.product, id, name: `Финансовый товар ${id}`, count: 5,
        price: 1250.75, prepaymentAmount: preorder ? 250.25 : 0,
        currency, availability: preorder ? "PREORDER" : "PURCHASABLE",
      };
      order.calculation = { ...order.calculation!, currency, goodsAmount: "1250.75", deliveryAmount: "0.00", totalAmount: "1250.75", confirmedPaidAmount: "0.00", remainingAmount: "1250.75" };
      order.product = { ...product, count: 1 };
      order.prepaymentAmount = product.prepaymentAmount;
      order.totalPrice = preorder ? 1000.5 : 1250.75;
      state.customerOrders = [order];
      await page.route("**/products/find", route => fulfillJson(route, [product]));
      await page.route("**/products/my", route => fulfillJson(route, [product]));
      await page.route("**/basket/find", route => fulfillJson(route, [{
        product, count: 1, availableCount: 5, enoughStock: true,
      }]));
      await page.route("**/order?productId=*", route => fulfillJson(route, {
        addresses: [], sellerTransfers: [{ id: 51, sending: "PRODUCT_PICKUP", price: 0, currency, participantId: 10, status: "ACTIVE" }],
      }));
      await page.route("**/accounts/participant/*", route => fulfillJson(route, []));
      const full = `1 250,75 ${symbols[currency]}`;
      const prepayment = `250,25 ${symbols[currency]}`;
      const remainder = `1 000,5 ${symbols[currency]}`;

      for (const path of ["/catalog/search?query=financial", "/dashboard/products"]) {
        await page.goto(path);
        const card = page.getByRole("link").filter({ hasText: product.name }).first();
        await expect(card.getByText(full, { exact: true })).toBeVisible();
        if (preorder) await expect(card.getByText(`Предзаказ: ${prepayment}`, { exact: true })).toBeVisible();
        if (currency !== "RUB") await expect(card).not.toContainText("₽");
      }

      await page.goto(`/catalog/${id}/detail`);
      await expect(page.getByRole("heading", { name: product.name, exact: true })).toBeVisible();
      await expect(page.getByText(preorder ? prepayment : full, { exact: true }).first()).toBeVisible();
      if (preorder) {
        await expect(page.getByText(full, { exact: true }).filter({ visible: true }).first()).toBeVisible();
        await expect(page.getByText(`Остаток после предоплаты: ${remainder}`, { exact: true })).toBeVisible();
      }

      await page.goto("/checkout");
      const item = page.getByTestId(`checkout-cart-item-${id}`);
      await expect(item.getByText(full, { exact: true })).toBeVisible();
      await expect(page.getByTestId("checkout-summary-products-total")).toHaveText(full);
      if (preorder) {
        await expect(page.getByTestId(`checkout-preorder-prepayment-${id}`)).toContainText(prepayment);
        await expect(page.getByTestId(`checkout-preorder-remainder-${id}`)).toContainText(remainder);
      }

      await page.goto("/dashboard/purchase");
      await page.getByRole("button", { name: preorder ? "Подтвердить предоплату" : "Подтвердить оплату", exact: true }).first().click();
      const dialog = page.getByRole("dialog", { name: preorder ? "Подтверждение предоплаты" : "Подтверждение оплаты" });
      await expect(dialog.getByText(`Осталось оплатить: ${full}`, { exact: true })).toBeVisible();
      if (preorder) {
        await expect(dialog.getByText(/Приложите чек согласованной предоплаты/)).toBeVisible();
        await expect(dialog.getByText(`Товары: ${full}`, { exact: true })).toBeVisible();
        await dialog.getByRole("button", { name: "Отмена", exact: true }).click();
        order.calculation.confirmedPaidAmount = "250.25";
        order.calculation.remainingAmount = "1000.50";
        order.actualStatus = "AWAITING_PAYMENT";
        await page.reload();
        await page.getByRole("button", { name: "Подтвердить оплату", exact: true }).first().click();
        await expect(page.getByRole("dialog").getByText(`Осталось оплатить: 1 000,50 ${symbols[currency]}`, { exact: true })).toBeVisible();
      }
    });
  }
}

for (const width of [393, 1280]) test("exact JPY decimals and legacy order at " + width, async ({ page, baseURL }) => {
  await page.setViewportSize({ width, height: 860 });
  const state = await setupMobileAccount(page, baseURL);
  const order = orderFixture(101, "AWAITING_PAYMENT", 1);
  Object.assign(order.calculation!, { currency: "JPY", deliveryAmount: "0.00", confirmedPaidAmount: "0.00",
    goodsAmount: "9007199254740993.01", totalAmount: "9007199254740993.01", remainingAmount: "9007199254740993.01" });
  state.customerOrders = [order, orderFixture(102, "AWAITING_PAYMENT", 2, {})];
  await page.goto("/dashboard/purchase");
  await page.getByRole("button", { name: "Подробнее о заказе №101" }).first().click();
  const details = page.getByRole("dialog");
  await expect(details.getByText("Итого с доставкой: 9 007 199 254 740 993,01 ¥")).toBeVisible();
  await expect(details.getByText("Доставка: Бесплатно")).toBeVisible();
  await details.getByRole("button", { name: "Закрыть детали заказа" }).click();
  await page.getByRole("button", { name: "Подробнее о заказе №102" }).first().click();
  await expect(details.getByText("Актуальный расчёт не получен")).toBeVisible();
  await expect(details.getByText(/по старым данным: 2500 RUB/)).toBeVisible();
});
