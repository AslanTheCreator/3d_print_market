import { useMemo } from "react";
import { useDictionary } from "@/entities/dictionary";

export const useOrderStatusDictionary = () => {
  const {
    data: orderStatuses,
    isLoading,
    error,
  } = useDictionary("ORDER_STATUS");

  const statusMap = useMemo(() => {
    if (!orderStatuses) return new Map<string, string>();
    return new Map(orderStatuses.map((item) => [item.value, item.description]));
  }, [orderStatuses]);

  const getStatusDescription = (status: string) => {
    return statusMap.get(status) || status;
  };

  return {
    orderStatuses,
    statusMap,
    getStatusDescription,
    isLoading,
    error,
  };
};
