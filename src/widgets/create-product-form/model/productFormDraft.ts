import type { InitialImageUploadState } from "@/features/image-upload";
import { imageApi } from "@/shared/api";
import { getImageUrl } from "@/shared/lib";
import type { ImageMetadata, ImageResponse } from "@/shared/types";
import {
  defaultProductFormValues,
  type ProductFormData,
} from "@/entities/product";

const PRODUCT_FORM_DRAFT_KEY = "create-product-form-draft";
const PRODUCT_FORM_CURRENCIES = ["RUB", "USD", "EUR", "GBP", "JPY", "CNY"];
let memoryProductFormDraft: ProductFormDraft | null = null;

interface ProductFormDraft {
  imageIds: number[];
  images: InitialImageUploadState[];
  values: ProductFormData;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isCurrency = (value: unknown): value is ProductFormData["currency"] =>
  typeof value === "string" && PRODUCT_FORM_CURRENCIES.includes(value);

const readString = (
  source: Record<string, unknown>,
  key: keyof ProductFormData,
): string => {
  const value = source[key];
  return typeof value === "string"
    ? value
    : (defaultProductFormValues[key] as string);
};

const readCategoryIds = (value: unknown): number[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is number => Number.isFinite(item));
};

const readImageIds = (value: unknown): number[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (item): item is number => Number.isInteger(item) && item > 0,
  );
};

const isProductFormDraftEmpty = (draft: ProductFormDraft): boolean =>
  draft.imageIds.length === 0 &&
  draft.values.categoryIds.length === 0 &&
  draft.values.name === defaultProductFormValues.name &&
  draft.values.price === defaultProductFormValues.price &&
  draft.values.currency === defaultProductFormValues.currency &&
  draft.values.description === defaultProductFormValues.description &&
  draft.values.isPreorder === defaultProductFormValues.isPreorder &&
  draft.values.prepaymentAmount === defaultProductFormValues.prepaymentAmount &&
  draft.values.count === defaultProductFormValues.count;

const parseProductFormDraft = (value: unknown): ProductFormDraft | null => {
  if (!isRecord(value) || !isRecord(value.values)) {
    return null;
  }

  const { values } = value;

  return {
    imageIds: readImageIds(value.imageIds),
    images: [],
    values: {
      categoryIds: readCategoryIds(values.categoryIds),
      name: readString(values, "name"),
      price: readString(values, "price"),
      currency: isCurrency(values.currency)
        ? values.currency
        : defaultProductFormValues.currency,
      description: readString(values, "description"),
      isPreorder:
        typeof values.isPreorder === "boolean"
          ? values.isPreorder
          : defaultProductFormValues.isPreorder,
      prepaymentAmount: readString(values, "prepaymentAmount"),
      count: readString(values, "count"),
    },
  };
};

const mergeMemoryImages = (draft: ProductFormDraft): ProductFormDraft => {
  const imageIds = new Set(draft.imageIds);
  const images =
    memoryProductFormDraft?.images.filter((image) => imageIds.has(image.id)) ??
    [];

  return {
    ...draft,
    images,
  };
};

const serializeProductFormDraft = (
  draft: ProductFormDraft,
): Omit<ProductFormDraft, "images"> => ({
  imageIds: draft.imageIds,
  values: draft.values,
});

const getDraftStorage = (): Storage | null => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage ?? null;
  } catch {
    return null;
  }
};

export const readProductFormDraft = (): ProductFormDraft | null => {
  const storage = getDraftStorage();

  if (!storage) {
    return memoryProductFormDraft;
  }

  try {
    const rawDraft = storage.getItem(PRODUCT_FORM_DRAFT_KEY);
    const draft = rawDraft ? parseProductFormDraft(JSON.parse(rawDraft)) : null;
    const draftWithMemoryImages = draft ? mergeMemoryImages(draft) : null;
    memoryProductFormDraft = draftWithMemoryImages;
    return draftWithMemoryImages;
  } catch {
    return memoryProductFormDraft;
  }
};

export const writeProductFormDraft = (draft: ProductFormDraft): void => {
  const storage = getDraftStorage();

  if (isProductFormDraftEmpty(draft)) {
    memoryProductFormDraft = null;

    try {
      storage?.removeItem(PRODUCT_FORM_DRAFT_KEY);
    } catch {
      memoryProductFormDraft = null;
    }
    return;
  }

  try {
    memoryProductFormDraft = draft;
    storage?.setItem(
      PRODUCT_FORM_DRAFT_KEY,
      JSON.stringify(serializeProductFormDraft(draft)),
    );
  } catch {
    memoryProductFormDraft = draft;
  }
};

const getImageResponsePreview = (
  image: ImageResponse | undefined,
): string | null => {
  if (!image?.contentType || !image.imageData) {
    return null;
  }

  return `data:${image.contentType};base64,${image.imageData}`;
};

const loadProductFormDraftImagesFromContent = async (
  imageIds: number[],
): Promise<InitialImageUploadState[]> => {
  const images = await Promise.all(
    imageIds.map(async (imageId) => {
      const [image] = await imageApi.getImages(imageId);
      const preview = getImageResponsePreview(image);

      if (!preview) {
        return null;
      }

      return {
        id: imageId,
        preview,
      };
    }),
  );

  return images.filter((image): image is InitialImageUploadState => !!image);
};

export const clearProductFormDraft = (): void => {
  const storage = getDraftStorage();
  memoryProductFormDraft = null;

  try {
    storage?.removeItem(PRODUCT_FORM_DRAFT_KEY);
  } catch {
    memoryProductFormDraft = null;
  }
};

export const loadProductFormDraftImages = async (
  imageIds: number[],
): Promise<InitialImageUploadState[]> => {
  let images: ImageMetadata[];

  try {
    images = await imageApi.getImageMetadata(imageIds);
  } catch {
    return loadProductFormDraftImagesFromContent(imageIds);
  }

  const metadataImages = images
    .map((image) => {
      const preview = getImageUrl(image, "medium");

      if (!preview) {
        return null;
      }

      return {
        id: image.id,
        preview,
      };
    })
    .filter((image): image is InitialImageUploadState => image !== null);

  if (metadataImages.length === imageIds.length) {
    return metadataImages;
  }

  return loadProductFormDraftImagesFromContent(imageIds);
};
