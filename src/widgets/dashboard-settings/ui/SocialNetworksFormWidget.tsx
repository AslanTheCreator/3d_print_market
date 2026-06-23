"use client";

import React from "react";
import { Alert, Box, CircularProgress } from "@mui/material";
import { useDictionary } from "@/entities/dictionary";
import { useSocialNetworks } from "../model/useSocialNetworks";
import { SocialNetworksForm } from "./social-networks/SocialNetworksForm";

export const SocialNetworksFormWidget: React.FC = () => {
  const { data: socialNetworkTypes, isLoading: typesLoading } =
    useDictionary("SOCIAL_NETWORK");
  const { data: socialNetworks = [], isLoading: networksLoading } =
    useSocialNetworks();

  const isLoading = typesLoading || networksLoading;

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={200}>
        <CircularProgress />
      </Box>
    );
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
