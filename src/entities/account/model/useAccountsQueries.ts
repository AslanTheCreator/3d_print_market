import { usePrivateScope } from "@/shared/lib/query";
import { useQuery } from "@tanstack/react-query";
import { accountsApi } from "../api/accountsApi";
import { accountsKeys } from "./queryKeys";

// Хук для получения счетов текущего пользователя
export const useUserAccounts = () => {
  const scope = usePrivateScope();
  return useQuery({
    queryKey: scope.key(accountsKeys.userList()),
    queryFn: ({ signal }) => accountsApi.getAll(signal),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    enabled: scope.id !== null,
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
  const scope = usePrivateScope();
  return useQuery({
    queryKey: scope.key(accountsKeys.participant(participantId!)),
    queryFn: ({ signal }) => accountsApi.getUser(participantId!, signal),
    enabled: scope.id !== null && (!!participantId),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 1,
  });
};
