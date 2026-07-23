import { expect, test } from "@playwright/test";
import { ErrorCodes } from "@/shared/lib/errorHandler";
import type { ProductDto, ProductFilter } from "@/shared/types";

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
