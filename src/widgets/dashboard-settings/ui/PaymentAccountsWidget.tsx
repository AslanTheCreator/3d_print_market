"use client";

import React from "react";
import { Alert, Box, CircularProgress } from "@mui/material";
import { useDictionary } from "@/entities/dictionary";
import { useUserAccounts } from "@/entities/account";
import { PaymentAccountsForm } from "./payment-accounts/PaymentAccountsForm";

export const PaymentAccountsWidget: React.FC = () => {
  const { data: paymentMethods, isLoading: methodsLoading } =
    useDictionary("TRANSFER_MONEY");
  const { data: userAccounts = [], isLoading: accountsLoading } =
    useUserAccounts();

  if (methodsLoading || accountsLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={200}>
        <CircularProgress />
      </Box>
    );
  }

  if (!paymentMethods?.length) {
    return (
      <Alert severity="error" sx={{ borderRadius: 2 }}>
        Не удалось загрузить способы оплаты. Попробуйте обновить страницу.
      </Alert>
    );
  }

  return <PaymentAccountsForm methods={paymentMethods} existing={userAccounts} />;
};
