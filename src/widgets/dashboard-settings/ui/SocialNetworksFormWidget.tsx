"use client";

import React from "react";
import { Alert } from "@mui/material";
import { useDictionary } from "@/entities/dictionary";
import { useSocialNetworks } from "@/entities/social-network";
import { SocialNetworksForm } from "./social-networks/SocialNetworksForm";
import { SettingsPanelSkeleton } from "./SettingsPanelSkeleton";

export const SocialNetworksFormWidget: React.FC = () => {
  const { data: socialNetworkTypes, isLoading: typesLoading } =
    useDictionary("SOCIAL_NETWORK");
  const { data: socialNetworks = [], isLoading: networksLoading } =
    useSocialNetworks();

  const isLoading = typesLoading || networksLoading;

  if (isLoading) {
    return <SettingsPanelSkeleton />;
  }

  if (!socialNetworkTypes?.length) {
    return (
      <Alert severity="error" sx={{ borderRadius: 2 }}>
        Не удалось загрузить социальные сети. Попробуйте обновить страницу.
      </Alert>
    );
  }

  return (
    <SocialNetworksForm
      types={socialNetworkTypes}
      existing={socialNetworks}
    />
  );
};
