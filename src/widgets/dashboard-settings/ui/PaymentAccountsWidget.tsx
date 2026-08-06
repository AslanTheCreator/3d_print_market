"use client";

import React from "react";
import { Alert } from "@mui/material";
import { useDictionary } from "@/entities/dictionary";
import { useUserAccounts } from "@/entities/account";
import { PaymentAccountsForm } from "./payment-accounts/PaymentAccountsForm";
import { SettingsPanelSkeleton } from "./SettingsPanelSkeleton";

export const PaymentAccountsWidget: React.FC = () => {
  const { data: paymentMethods, isLoading: methodsLoading } =
    useDictionary("TRANSFER_MONEY");
  const { data: userAccounts = [], isLoading: accountsLoading } =
    useUserAccounts();

  if (methodsLoading || accountsLoading) {
    return <SettingsPanelSkeleton />;
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
