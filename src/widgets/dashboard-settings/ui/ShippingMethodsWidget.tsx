"use client";

import React, { useMemo } from "react";
import { Alert, Box, CircularProgress } from "@mui/material";
import { useDictionary } from "@/entities/dictionary";
import { useTransfers } from "@/entities/transfer";
import { ShippingMethodsForm } from "./shipping-methods/ShippingMethodsForm";

export const ShippingMethodsWidget: React.FC = () => {
  const { data: shippingMethods, isLoading: methodsLoading } =
    useDictionary("SHOPPING_METHODS");
  const { data: currencies, isLoading: currenciesLoading } =
    useDictionary("CURRENCY");
  const { data: transfers = [], isLoading: transfersLoading } = useTransfers();

  const isLoading = methodsLoading || currenciesLoading || transfersLoading;

  const availableMethods = useMemo(
    () => shippingMethods?.filter((method) => method.value !== "FREE_POST") ?? [],
    [shippingMethods],
  );

  if (isLoading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight={200}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (!availableMethods.length) {
    return (
      <Alert severity="error" sx={{ borderRadius: 2 }}>
        Не удалось загрузить способы доставки. Попробуйте обновить страницу.
      </Alert>
    );
  }

  if (!currencies?.length) {
    return (
      <Alert severity="error" sx={{ borderRadius: 2 }}>
        Не удалось загрузить валюты. Попробуйте обновить страницу.
      </Alert>
    );
  }

  return (
    <ShippingMethodsForm
      methods={availableMethods}
      currencies={currencies}
      existing={transfers}
    />
  );
};
