import { expect, test } from "@playwright/test";
import {
  defaultProductFormValues,
  isEditableAvailability,
  mapFormDataToCreateModel,
  mapProductDetailToFormData,
} from "@/entities/product/model/form";
import type {
  ProductCreateModel,
  EditableAvailability,
} from "@/entities/product/model/types";
import type { ProductDetail } from "@/shared/types";

type WriteModelAllowsExternal =
  "EXTERNAL_ONLY" extends ProductCreateModel["availability"] ? true : false;

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
  availability: "EXTERNAL_ONLY",
  externalUrl: "https://example.com/product/42",
  imageIds: [101],
  reviews: [],
  sellerLogin: "seller",
  sellerRating: 5,
  totalReviews: 10,
  image: [],
};

test("write model excludes EXTERNAL_ONLY", () => {
  expect(writeModelAllowsExternal).toBe(false);
  expect(isEditableAvailability("EXTERNAL_ONLY")).toBe(false);
  expect(isEditableAvailability("PURCHASABLE")).toBe(true);
  expect(isEditableAvailability("PREORDER")).toBe(true);
});

test("external product is not mapped to the edit form", () => {
  const formData = mapProductDetailToFormData(externalProduct);

  expect(formData).toBeNull();
});

test("runtime mapper rejects forged EXTERNAL_ONLY form data", () => {
  const forgedAvailability =
    "EXTERNAL_ONLY" as unknown as EditableAvailability;

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
