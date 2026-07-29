"use client";

import React from "react";
import { Avatar, Skeleton } from "@mui/material";
import { useImageMetadataQuery } from "@/entities/image/@x/user";
import { getImageUrl } from "@/shared/lib";
import { useUserById } from "../model/useUserQueries";

interface SellerAvatarProps {
  participantId: number;
  sellerLogin?: string;
  size?: number;
  compactSize?: number;
}

export const SellerAvatar: React.FC<SellerAvatarProps> = ({
  participantId,
  sellerLogin,
  size = 48,
  compactSize = size,
}) => {
  const { data: seller, isLoading: isSellerLoading } =
    useUserById(participantId);

  const imageId = seller?.imageId ?? null;

  const { data: images, isLoading: isImageLoading } =
    useImageMetadataQuery(imageId);

  const isLoading = isSellerLoading || (!!imageId && isImageLoading);
  const responsiveSize = { xs: compactSize, sm: size };

  if (isLoading) {
    return (
      <Skeleton
        variant="circular"
        sx={{ width: responsiveSize, height: responsiveSize }}
      />
    );
  }

  const image = images?.[0];
  const imageSrc = getImageUrl(image, "thumbnail");

  const fallback = sellerLogin?.charAt(0)?.toUpperCase() || "S";

  return (
    <Avatar
      src={imageSrc}
      alt={sellerLogin || "Продавец"}
      sx={{
        width: responsiveSize,
        height: responsiveSize,
        bgcolor: imageSrc ? "transparent" : "primary.main",
        color: "white",
        fontWeight: 700,
        fontSize: { xs: compactSize * 0.4, sm: size * 0.4 },
      }}
    >
      {!imageSrc && fallback}
    </Avatar>
  );
};
