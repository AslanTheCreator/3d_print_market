import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/shared/lib/auth";
import { useSellerOrders, useCustomerOrders } from "@/entities/order";
import {
  getExpirationStatus,
  productApi,
  productKeys,
} from "@/entities/product";
import {
  SELLER_ACTION_STATUSES,
  CUSTOMER_ACTION_STATUSES,
  SELLER_STATUS_ACTION_MAP,
  CUSTOMER_STATUS_ACTION_MAP,
  PRODUCT_RENEWAL_ACTION,
  PendingActionGroup,
} from "./constants";

// Отдельный запрос для товаров пользователя (только для подсчёта продлений)
const useUserProductsForRenewal = () => {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: productKeys.renewalCheck(),
    queryFn: () => productApi.getUserProducts({ size: 100 }),
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: true,
  });
};

export const useUserPendingActions = () => {
  const { isAuthenticated } = useAuth();

  const { data: sellerOrders, isLoading: isLoadingSeller } = useSellerOrders({
    enabled: isAuthenticated,
  });
  const { data: customerOrders, isLoading: isLoadingCustomer } =
    useCustomerOrders({ enabled: isAuthenticated });
  const { data: userProducts, isLoading: isLoadingProducts } =
    useUserProductsForRenewal();

  const isLoading = isLoadingSeller || isLoadingCustomer || isLoadingProducts;

  // Группировка действий продавца по типу
  const sellerActionGroups = useMemo((): PendingActionGroup[] => {
    if (!sellerOrders || !Array.isArray(sellerOrders)) return [];

    const groups: PendingActionGroup[] = [];

    for (const status of SELLER_ACTION_STATUSES) {
      const count = sellerOrders.filter(
        (order) => order.actualStatus === status,
      ).length;

      if (count > 0) {
        const config = SELLER_STATUS_ACTION_MAP[status];
        groups.push({
          ...config,
          count,
          href: "/dashboard/sales",
        });
      }
    }

    return groups;
  }, [sellerOrders]);

  // Группировка действий покупателя по типу
  const customerActionGroups = useMemo((): PendingActionGroup[] => {
    if (!customerOrders || !Array.isArray(customerOrders)) return [];

    const groups: PendingActionGroup[] = [];

    for (const status of CUSTOMER_ACTION_STATUSES) {
      const count = customerOrders.filter(
        (order) => order.actualStatus === status,
      ).length;

      if (count > 0) {
        const config = CUSTOMER_STATUS_ACTION_MAP[status];
        groups.push({
          ...config,
          count,
          href: "/dashboard/purchase",
        });
      }
    }

    return groups;
  }, [customerOrders]);

  // Считаем только товары, для которых в карточке доступно продление.
  const renewalGroup = useMemo((): PendingActionGroup | null => {
    if (!userProducts || !Array.isArray(userProducts)) return null;

    const totalCount = userProducts.filter((product) =>
      getExpirationStatus(product.expirationDate).shouldShowExtendButton,
    ).length;

    if (totalCount === 0) return null;

    return {
      ...PRODUCT_RENEWAL_ACTION,
      count: totalCount,
    };
  }, [userProducts]);

  // Все группы действий
  const allActionGroups = useMemo((): PendingActionGroup[] => {
    const groups = [...sellerActionGroups, ...customerActionGroups];
    if (renewalGroup) groups.push(renewalGroup);
    return groups;
  }, [sellerActionGroups, customerActionGroups, renewalGroup]);

  // Общие подсчёты
  const sellerActionsCount = useMemo(
    () => sellerActionGroups.reduce((sum, g) => sum + g.count, 0),
    [sellerActionGroups],
  );

  const customerActionsCount = useMemo(
    () => customerActionGroups.reduce((sum, g) => sum + g.count, 0),
    [customerActionGroups],
  );

  const renewalCount = renewalGroup?.count ?? 0;

  const totalCount = sellerActionsCount + customerActionsCount + renewalCount;

  return {
    // Данные
    allActionGroups,
    sellerActionGroups,
    customerActionGroups,
    renewalGroup,

    // Счётчики
    totalCount,
    sellerActionsCount,
    customerActionsCount,
    renewalCount,

    // Состояние
    isLoading,
    isAuthenticated,
  };
};
