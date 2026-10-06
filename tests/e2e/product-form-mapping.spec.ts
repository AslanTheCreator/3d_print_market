import { expect, test } from "@playwright/test";
import {
  defaultProductFormValues,
  isEditableAvailability,
  mapFormDataToCreateModel,
  mapProductDetailToFormData,
  validateProductCount,
  productPriceRules,
  productPrepaymentRules,
} from "@/entities/product/model/form";
import type {
  ProductCreateModel,
  EditableAvailability,
} from "@/entities/product";
import type { ProductDetail } from "@/entities/product";

type WriteModelAllowsExternal =
  "EXTERNAL_PRODUCT" extends ProductCreateModel["availability"] ? true : false;

const writeModelAllowsExternal: WriteModelAllowsExternal = false;

const externalProduct: ProductDetail = {
  id: 42,
  name: "Товар с внешней покупкой",
  description: "Описание товара",
  price: 1500,
  prepaymentAmount: 0,
  count: 2,
  currency: "RUB",
  originality: "PRESERVE_OPAQUE_VALUE",
  participantId: 7,
  status: "ACTIVE",
  categories: [{ id: 3, name: "Фигурки", childs: [] }],
  availability: "EXTERNAL_PRODUCT",
  externalUrl: "https://example.com/product/42",
  imageIds: [101],
  reviews: [],
  sellerLogin: "seller",
  sellerRating: 5,
  totalReviews: 10,
  image: [],
};

test("write model excludes EXTERNAL_PRODUCT", () => {
  expect(writeModelAllowsExternal).toBe(false);
  expect(isEditableAvailability("EXTERNAL_PRODUCT")).toBe(false);
  expect(isEditableAvailability("PURCHASABLE")).toBe(true);
  expect(isEditableAvailability("PREORDER")).toBe(true);
});

test("external product is not mapped to the edit form", () => {
  const formData = mapProductDetailToFormData(externalProduct);

  expect(formData).toBeNull();
});

test("runtime mapper rejects forged EXTERNAL_PRODUCT form data", () => {
  const forgedAvailability =
    "EXTERNAL_PRODUCT" as unknown as EditableAvailability;

  expect(
    mapFormDataToCreateModel(
      {
        ...defaultProductFormValues,
        availability: forgedAvailability,
      },
      [101],
    ),
  ).toBeNull();
});

test("internal product edit preserves confirmed contract fields", () => {
  const formData = mapProductDetailToFormData({
    ...externalProduct,
    availability: "PREORDER",
    externalUrl: "",
    prepaymentAmount: 500,
  });

  expect(formData).not.toBeNull();

  if (!formData) {
    throw new Error("Internal product must be editable");
  }

  expect(mapFormDataToCreateModel(formData, [101])).toMatchObject({
    availability: "PREORDER",
    originality: "PRESERVE_OPAQUE_VALUE",
    externalUrl: "",
    prepaymentAmount: 500,
    imageIds: [101],
  });
});

test("new product mapping keeps the existing contract defaults", () => {
  const createModel = mapFormDataToCreateModel(
    {
      ...defaultProductFormValues,
      categoryIds: [3],
      name: "Новый товар",
      price: "1500",
      description: "Описание",
      count: "1",
    },
    [101],
  );

  expect(createModel).toMatchObject({
    availability: "PURCHASABLE",
    originality: "ORIGINAL",
    externalUrl: "",
    prepaymentAmount: 0,
  });
});

for (const count of [0, null, 5]) {
  test(`edit round-trip preserves count ${count}`, () => {
    const form = mapProductDetailToFormData({ ...externalProduct, availability: "PURCHASABLE", count })!;
    expect(form.count).toBe(count === null ? "" : String(count));
    expect(validateProductCount(form.count, "edit")).toBe(true);
    expect(mapFormDataToCreateModel({ ...form, name: "Изменённое имя" }, [101], "edit")?.count).toBe(count);
    if (count === 0 || count === null) expect(mapFormDataToCreateModel(form, [101], "create")).toBeNull();
  });
}

test("money and counters reject non-finite, malformed and unsafe values before payload", () => {
  const form = { ...defaultProductFormValues, categoryIds: [3], name: "Товар", count: "2", price: "1250.75", availability: "PREORDER" as const, prepaymentAmount: "250.25" };
  expect(mapFormDataToCreateModel(form, [101])).toMatchObject({ price: 1250.75, prepaymentAmount: 250.25, count: 2 });
  const priceValidate = productPriceRules.validate as (value: string) => unknown;
  const prepayValidate = productPrepaymentRules.validate as (value: string) => unknown;
  for (const value of ["9".repeat(400), "NaN", "Infinity", "12wrong", "-1"]) {
    expect(priceValidate(value)).not.toBe(true);
    expect(prepayValidate(value)).not.toBe(true);
    expect(mapFormDataToCreateModel({ ...form, price: value }, [101])).toBeNull();
    expect(mapFormDataToCreateModel({ ...form, prepaymentAmount: value }, [101])).toBeNull();
    expect(validateProductCount(value, "edit")).not.toBe(true);
  }
  for (const count of ["1.5", "9007199254740992"]) {
    expect(mapFormDataToCreateModel({ ...form, count }, [101], "edit")).toBeNull();
  }
  expect(validateProductCount("1000000")).toBe(true);
});
