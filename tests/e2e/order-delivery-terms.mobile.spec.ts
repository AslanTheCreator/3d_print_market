import { test } from "@playwright/test";
import { successScenario } from "./helpers/deliveryTerms";
import { expectNoOverflow } from "./helpers/mobileAccount";

test("изменение доставки и история на мобильном", async ({page, baseURL}) => {
  await successScenario(page, baseURL);
  await expectNoOverflow(page);
});
