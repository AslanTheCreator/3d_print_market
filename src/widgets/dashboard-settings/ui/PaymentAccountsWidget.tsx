"use client";

import { useCallback } from "react";
import { useDictionary } from "@/entities/dictionary";
import { useUserAccounts, type AccountsBaseModel } from "@/entities/account";
import { PaymentAccountsForm } from "./payment-accounts/PaymentAccountsForm";
import { SettingsDataBoundary } from "./SettingsDataBoundary";

const EMPTY: AccountsBaseModel[] = [];

export const PaymentAccountsWidget = () => {
  const dictionary = useDictionary("TRANSFER_MONEY");
  const records = useUserAccounts();
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
      <PaymentAccountsForm unavailable={failed} methods={dictionary.data ?? []} existing={records.data ?? EMPTY} refresh={refresh} />
    </SettingsDataBoundary>
  );
};
