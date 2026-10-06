import { expect, test } from "@playwright/test";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useProductById } from "@/entities/product/model/useProductQueries";
import { productApi, ProductNotFoundError } from "@/entities/product";
import { publicClient } from "@/shared/api";
import { imageApi } from "@/entities/image";
import { ApiError } from "@/shared/lib/errorHandler";
import { parsePositiveSafeInteger, parseNonNegativeSafeInteger, parseCategoryId } from "@/shared/lib";
import { defaultProductFormValues } from "@/entities/product/model/form";
import { createProductFormSubmitHandler } from "@/widgets/create-product-form/model/productFormSubmit";
import { mapAdminProductToInput } from "@/entities/product/model/admin";
import { adminProductApi } from "@/entities/product/api/adminProductApi";
import { parseShippingPrice, hasTransferBlockingValidationErrors } from "@/widgets/dashboard-settings/ui/shipping-methods/model";
import { parseInputValue } from "@/widgets/product-catalog/ui/price-range-filter/model";
import { adminProductFixture } from "./helpers/admin";
import { getCategoryPathFromSlugs } from "@/entities/category";

function capture<T>(client: QueryClient, hook: () => T): T {
  let result!: T;
  function Probe() { result = hook(); return null; }
  renderToString(createElement(QueryClientProvider, { client }, createElement(Probe)));
  return result;
}

test("URL integers reject malformed, fractional, non-finite and unsafe IDs/pages", () => {
  for (const value of ["bad", "1.5", "Infinity", "9007199254740992", "-1", "1x", "", null]) {
    expect(parsePositiveSafeInteger(value)).toBeNull();
    expect(parseNonNegativeSafeInteger(value)).toBeNull();
  }
  expect(parsePositiveSafeInteger("0")).toBeNull();
  expect(parseNonNegativeSafeInteger("0")).toBe(0);
  expect(parsePositiveSafeInteger("42")).toBe(42);
  for (const slug of ["bad", "0-name", "1.5-name", "1x-name", "9007199254740992-name"]) expect(parseCategoryId(slug)).toBeNull();
  expect(parseCategoryId("32-name")).toBe(32);
  expect(getCategoryPathFromSlugs(["bad", "32-name"])).toBeNull();
  expect(getCategoryPathFromSlugs(["1-parent", "9007199254740992-name"])).toBeNull();
});

test("invalid query and forced refetch never call product API", async () => {
  const original = productApi.getProductById;
  let reads = 0;
  productApi.getProductById = async () => { reads++; throw new Error("Unexpected request"); };
  const client = new QueryClient();
  try {
    for (const id of [undefined, "bad", "0", "1.5", "Infinity", "9007199254740992"]) {
      const hook = capture(client, () => useProductById(id));
      expect(hook.fetchStatus).toBe("idle");
      expect((await hook.refetch()).isError).toBe(true);
    }
    expect(reads).toBe(0);
  } finally { productApi.getProductById = original; client.clear(); }
});

test("submit requires matching loaded target; no invalid edit falls back to create", () => {
  let writes = 0;
  const form = { ...defaultProductFormValues, name: "Товар", price: "100.25", count: "", categoryIds: [2] };
  for (const [id, target] of [[undefined, undefined], ["bad", undefined], ["0", 0], ["1.5", 1.5], ["Infinity", Infinity], ["9007199254740992", 9007199254740992], ["42", undefined], ["42", 43], ["42", 42]] as const) {
    createProductFormSubmitHandler({ isCurrentScope: () => true, createProduct: () => { writes++; }, updateProduct: () => { writes++; }, effectiveImageIds: [11], hasSellerAccount: true, hasSellerTransfer: true, hasSellerSocialNetwork: true, imageIdsToDelete: [], onProductSaved: async () => {}, isEditMode: true, isProductReadOnly: false, productId: id, editTargetId: target, resetForm: () => {}, showNotification: () => {}, navigateToProductList: () => {} })(form);
  }
  expect(writes).toBe(1);
});

test("only core GET 404 is product absence; metadata 404 remains a recoverable error", async () => {
  const original = { get: publicClient.get, metadata: imageApi.getImageMetadata };
  try {
    publicClient.get = async () => { throw new ApiError("Missing", undefined, 404); };
    await expect(productApi.getProductById(42)).rejects.toBeInstanceOf(ProductNotFoundError);
    publicClient.get = (async () => ({ data: { id: 42, imageIds: [11] } })) as typeof publicClient.get;
    imageApi.getImageMetadata = async () => { throw new ApiError("Metadata missing", undefined, 404); };
    try { await productApi.getProductById(42); throw new Error("Expected rejection"); }
    catch (error) { expect(error).toBeInstanceOf(ApiError); expect(error).not.toBeInstanceOf(ProductNotFoundError); }
    imageApi.getImageMetadata = async () => [];
    expect(await productApi.getProductById(42)).toEqual({ id: 42, imageIds: [11], image: [] });
  } finally { publicClient.get = original.get; imageApi.getImageMetadata = original.metadata; }
});

test("admin read null maps explicitly to numeric zero; invalid numeric writes are rejected", async () => {
  const input = mapAdminProductToInput({ product: { ...adminProductFixture(), prepaymentAmount: null } as unknown as Parameters<typeof mapAdminProductToInput>[0]["product"], categoryIds: [1], imageIds: [77] });
  expect(input.prepaymentAmount).toBe(0);
  for (const bad of [Infinity, NaN]) await expect(adminProductApi.update(2, 101, { ...input, price: bad })).rejects.toThrow("Некорректные числовые значения");
  for (const bad of [1.5, -1, 9007199254740992]) await expect(adminProductApi.update(2, 101, { ...input, count: bad })).rejects.toThrow("Некорректные числовые значения");
});

test("shipping and range parsing keep fractional money and reject non-finite input", () => {
  expect(parseShippingPrice("650.25")).toBe(650.25);
  expect(parseInputValue("1 250,75")).toBe(1250.75);
  for (const value of ["9".repeat(400), "NaN", "Infinity", "wrong", "-1"]) {
    expect(parseShippingPrice(value)).toBeNull();
    expect(parseInputValue(value)).toBeUndefined();
    expect(hasTransferBlockingValidationErrors({ TRANSPORT_COMPANY: { enabled: true, price: value, currency: "RUB" } })).toBe(true);
  }
  for (const price of [NaN, Infinity]) expect(parseShippingPrice(price)).toBeNull();
});
