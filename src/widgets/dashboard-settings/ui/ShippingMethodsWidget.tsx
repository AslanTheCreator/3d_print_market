"use client";

import { useCallback, useMemo } from "react";
import { useDictionary } from "@/entities/dictionary";
import { useTransfers, type Transfer } from "@/entities/transfer";
import { ShippingMethodsForm } from "./shipping-methods/ShippingMethodsForm";
import { SettingsDataBoundary } from "./SettingsDataBoundary";

const EMPTY: Transfer[] = [];

export const ShippingMethodsWidget = () => {
  const dictionary = useDictionary("SHOPPING_METHODS");
  const records = useTransfers();
  const currencies = useDictionary("CURRENCY");
  const methods = useMemo(() => dictionary.data?.filter((item) => item.value !== "FREE_POST") ?? [], [dictionary.data]);
  const { refetch: reloadDictionary } = dictionary;
  const { refetch: reloadRecords } = records;
  const { refetch: reloadCurrencies } = currencies;
  const refresh = useCallback(async () => {
    const [typesResult, recordsResult, currenciesResult] = await Promise.all([reloadDictionary(), reloadRecords(), reloadCurrencies()]);
    if (typesResult.isError || !typesResult.data?.length || recordsResult.isError || !recordsResult.data || currenciesResult.isError || !currenciesResult.data?.length) {
      throw new Error("Не удалось загрузить настройки");
    }
    return recordsResult.data;
  }, [reloadDictionary, reloadRecords, reloadCurrencies]);
  const ready = Boolean(dictionary.data?.length && records.data && currencies.data?.length && methods.length);
  const loading = dictionary.isLoading || records.isLoading || currencies.isLoading;
  const failed = dictionary.isError || records.isError || currencies.isError || (!loading && !ready);
  return (
    <SettingsDataBoundary loading={loading} ready={ready} failed={failed}
      refreshing={dictionary.isFetching || records.isFetching || currencies.isFetching}
      onRetry={() => { void refresh().catch(() => undefined); }}>
      <ShippingMethodsForm unavailable={failed} methods={methods} currencies={currencies.data ?? []} existing={records.data ?? EMPTY} refresh={refresh} />
    </SettingsDataBoundary>
  );
};
