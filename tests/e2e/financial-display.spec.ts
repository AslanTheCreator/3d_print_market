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
      await expect(dialog.getByText(preorder ? `К предоплате: ${prepayment}` : `К оплате: ${full}`, { exact: true })).toBeVisible();
      if (preorder) {
        await expect(dialog.getByText(`Остаток после предоплаты: ${remainder}`, { exact: true })).toBeVisible();
        await expect(dialog.getByText(`Стоимость товаров: ${full}`, { exact: true })).toBeVisible();
        await dialog.getByRole("button", { name: "Отмена", exact: true }).click();
        order.actualStatus = "AWAITING_PAYMENT";
        await page.reload();
        await page.getByRole("button", { name: "Подтвердить оплату", exact: true }).first().click();
        await expect(page.getByRole("dialog").getByText(`Остаток к оплате: ${remainder}`, { exact: true })).toBeVisible();
      }
    });
  }
}
