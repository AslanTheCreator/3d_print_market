import { useQuery } from "@tanstack/react-query";
import { accountsApi } from "../api/accountsApi";
import { accountsKeys } from "./queryKeys";

// Хук для получения счетов текущего пользователя
export const useUserAccounts = () => {
  return useQuery({
    queryKey: accountsKeys.userList(),
    queryFn: accountsApi.getAll,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
};

/**
 * Хук для получения всех счетов продавца по participantId.
 *
 * Используется покупателем в PaymentDialog, чтобы увидеть
 * все доступные реквизиты продавца и выбрать способ оплаты.
 *
 * @param participantId — ID продавца (order.userInfo.id)
 */
export const useSellerAccounts = (participantId: number | undefined) => {
  return useQuery({
    queryKey: accountsKeys.participant(participantId!),
    queryFn: () => accountsApi.getUser(participantId!),
    enabled: !!participantId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 1,
  });
};
