"use client";

import { useCallback } from "react";
import { useDictionary } from "@/entities/dictionary";
import { useSocialNetworks, type SocialNetwork } from "@/entities/social-network";
import { SocialNetworksForm } from "./social-networks/SocialNetworksForm";
import { SettingsDataBoundary } from "./SettingsDataBoundary";

const EMPTY: SocialNetwork[] = [];

export const SocialNetworksFormWidget = () => {
  const dictionary = useDictionary("SOCIAL_NETWORK");
  const records = useSocialNetworks();
  const { refetch: reloadDictionary } = dictionary;
  const { refetch: reloadRecords } = records;
  const refresh = useCallback(async () => {
    const [typesResult, recordsResult] = await Promise.all([reloadDictionary(), reloadRecords()]);
    if (typesResult.isError || !typesResult.data?.length || recordsResult.isError || !recordsResult.data) {
      throw new Error("Не удалось загрузить настройки");
    }
    return recordsResult.data;
  }, [reloadDictionary, reloadRecords]);
  const ready = Boolean(dictionary.data?.length && records.data);
  const loading = dictionary.isLoading || records.isLoading;
  const failed = dictionary.isError || records.isError || (!loading && !ready);
  return (
    <SettingsDataBoundary loading={loading} ready={ready} failed={failed}
      refreshing={dictionary.isFetching || records.isFetching}
      onRetry={() => { void refresh().catch(() => undefined); }}>
      <SocialNetworksForm unavailable={failed} types={dictionary.data ?? []} existing={records.data ?? EMPTY} refresh={refresh} />
    </SettingsDataBoundary>
  );
};
