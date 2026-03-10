"use client";

import React from "react";
import { Avatar, Skeleton } from "@mui/material";
import { useUserById } from "../model/useUserQueries";
import { useQuery } from "@tanstack/react-query";
import { imageApi } from "@/shared/api";

interface SellerAvatarProps {
  participantId: number;
  sellerLogin?: string;
  size?: number;
}

export const SellerAvatar: React.FC<SellerAvatarProps> = ({
  participantId,
  sellerLogin,
  size = 48,
}) => {
  const { data: seller, isLoading: isSellerLoading } =
    useUserById(participantId);

  const imageId = seller?.imageId ?? null;

  const { data: images, isLoading: isImageLoading } = useQuery({
    queryKey: ["seller-avatar", imageId],
    queryFn: () => imageApi.getImages(imageId!),
    enabled: !!imageId,
    staleTime: 1000 * 60 * 10,
  });

  const isLoading = isSellerLoading || (!!imageId && isImageLoading);

  if (isLoading) {
    return <Skeleton variant="circular" width={size} height={size} />;
  }

  const image = images?.[0];
  const imageSrc = image
    ? `data:${image.contentType};base64,${image.imageData}`
    : undefined;

  const fallback = sellerLogin?.charAt(0)?.toUpperCase() || "S";

  return (
    <Avatar
      src={imageSrc}
      alt={sellerLogin || "Продавец"}
      sx={{
        width: size,
        height: size,
        bgcolor: imageSrc ? "transparent" : "primary.main",
        color: "white",
        fontWeight: 700,
        fontSize: size * 0.4,
      }}
    >
      {!imageSrc && fallback}
    </Avatar>
  );
};
