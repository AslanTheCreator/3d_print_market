import { useQuery } from "@tanstack/react-query";
import { accountsApi } from "@/entities/accounts/api/accountsApi";
import { AccountsBaseModel } from "../model/types";
import { useMemo } from "react";
import { accountsKeys } from "./queryKeys";
import { useTransferMoney } from "@/shared/model/dictionary/useDictionaryHooks";

export interface DictionaryItem {
  type: string;
  value: string;
  description: string;
}

export const useUserAccounts = () => {
  return useQuery<AccountsBaseModel[]>({
    queryKey: accountsKeys.all,
    queryFn: accountsApi.getUserAccounts,
    staleTime: 5 * 60 * 1000, // 5 минут
  });
};

// export const usePaymentMethods = () => {
//   const { data: transferMoneyDict, isLoading: isDictLoading } =
//     useTransferMoney();
//   const { data: userAccounts, isLoading: isAccountsLoading } =
//     useUserAccounts();

//   console.log(userAccounts);
//   console.log(transferMoneyDict);

//   const paymentMethods = useMemo((): AccountMethodOption[] => {
//     if (!transferMoneyDict || !userAccounts) return [];

//     return transferMoneyDict.map((dictItem: DictionaryItem) => {
//       // Находим аккаунты пользователя для данного способа оплаты
//       const relatedAccounts = userAccounts.filter(
//         (account: AccountsBaseModel) => account.transferMoney === dictItem.value
//       );

//       return {
//         id: dictItem.value,
//         name: dictItem.description, // используем description как name
//         value: dictItem.value,
//         description: dictItem.description,
//         available: relatedAccounts.length > 0, // Доступен только если есть аккаунты
//         accounts: relatedAccounts,
//       };
//     });
//   }, [transferMoneyDict, userAccounts]);

//   return {
//     data: paymentMethods,
//     isLoading: isDictLoading || isAccountsLoading,
//     availableMethods: paymentMethods.filter((method) => method.available),
//   };
// };
