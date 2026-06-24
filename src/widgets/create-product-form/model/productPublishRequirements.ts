import type { ProductFormData } from "@/entities/product";

export interface ProductPublishRequirements {
  hasImages: boolean;
  hasCategories: boolean;
  hasName: boolean;
  hasPrice: boolean;
  hasCount: boolean;
  hasSellerTransfer: boolean;
  hasSellerAccount: boolean;
  hasSellerSocialNetwork: boolean;
  isSellerSettingsError: boolean;
  isSellerSettingsLoading: boolean;
}

interface BuildProductPublishRequirementsParams {
  effectiveImageIds: number[];
  categoryIds: ProductFormData["categoryIds"];
  name: string;
  price: string;
  count: string;
  hasSellerTransfer: boolean;
  hasSellerAccount: boolean;
  hasSellerSocialNetwork: boolean;
  isSellerSettingsError: boolean;
  isSellerSettingsLoading: boolean;
}

export const buildProductPublishRequirements = ({
  effectiveImageIds,
  categoryIds,
  name,
  price,
  count,
  hasSellerTransfer,
  hasSellerAccount,
  hasSellerSocialNetwork,
  isSellerSettingsError,
  isSellerSettingsLoading,
}: BuildProductPublishRequirementsParams): ProductPublishRequirements => ({
  hasImages: effectiveImageIds.length > 0,
  hasCategories: categoryIds.length > 0,
  hasName: name.trim().length > 0,
  hasPrice: price.trim().length > 0,
  hasCount: count.trim().length > 0,
  hasSellerTransfer,
  hasSellerAccount,
  hasSellerSocialNetwork,
  isSellerSettingsError,
  isSellerSettingsLoading,
});

export const isReadyForProductPrimaryAction = (
  publishRequirements: ProductPublishRequirements,
): boolean =>
  publishRequirements.hasImages &&
  publishRequirements.hasCategories &&
  publishRequirements.hasName &&
  publishRequirements.hasPrice &&
  publishRequirements.hasCount &&
  publishRequirements.hasSellerTransfer &&
  publishRequirements.hasSellerAccount &&
  publishRequirements.hasSellerSocialNetwork &&
  !publishRequirements.isSellerSettingsLoading &&
  !publishRequirements.isSellerSettingsError;
