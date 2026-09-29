import { expect, test } from "@playwright/test";
import { ErrorCodes } from "@/shared/lib/errorHandler";
import type { ProductDto, ProductFilter } from "@/entities/product";
import type { ListOrdersModel } from "@/entities/order";

type ProductFilterHasImageId = "imageId" extends keyof ProductFilter
  ? true
  : false;

const productFilterHasImageId: ProductFilterHasImageId = false;
const productDtoRequiresExternalUrl: {} extends Pick<
  ProductDto,
  "externalUrl"
>
  ? false
  : true = true;

test("v1.29 product contract excludes imageId from search filters", () => {
  expect(productFilterHasImageId).toBe(false);
});

test("v1.29 product contract requires externalUrl in list responses", () => {
  expect(productDtoRequiresExternalUrl).toBe(true);
});

test("v1.29 exposes the non-purchasable product error code", () => {
  expect(ErrorCodes.PRODUCT_NOT_PURCHASABLE).toBe(
    "PRODUCT_NOT_PURCHASABLE",
  );
});

test("catalog contract supports unlimited stock, hidden links and server-side adult filtering", () => {
  const nullableFields: Pick<ProductDto, "count" | "externalUrl" | "availability"> = {
    count: null,
    externalUrl: null,
    availability: "EXTERNAL_PRODUCT",
  };
  const hasAdultFilter: "includeAdult" extends keyof ProductFilter ? true : false = false;
  const nullableOrderQuantity: null extends ListOrdersModel["product"]["count"] ? true : false = false;
  expect(nullableFields).toEqual({ count: null, externalUrl: null, availability: "EXTERNAL_PRODUCT" });
  expect(hasAdultFilter).toBe(false);
  expect(nullableOrderQuantity).toBe(false);
});
