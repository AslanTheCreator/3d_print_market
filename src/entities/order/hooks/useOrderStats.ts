import React from "react";
import { useCustomerOrders, useSellerOrders } from "./useOrderQueries";

// Хук для получения статистики заказов продавца
export const useSellerOrdersStats = () => {
  const { data: orders, ...queryResult } = useSellerOrders();

  const stats = React.useMemo(() => {
    if (!orders || !Array.isArray(orders)) return null;

    const totalOrders = orders.length;
    const completedOrders = orders.filter(
      (order) => order.actualStatus === "COMPLETED"
    ).length;
    const activeOrders = orders.filter((order) =>
      ["BOOKED", "AWAITING_PAYMENT", "ASSEMBLING", "ON_THE_WAY"].includes(
        order.actualStatus
      )
    ).length;
    const disputedOrders = orders.filter(
      (order) => order.actualStatus === "DISPUTED"
    ).length;
    const failedOrders = orders.filter(
      (order) => order.actualStatus === "FAILED"
    ).length;

    // Подсчет общей суммы заказов
    const totalRevenue = orders.reduce(
      (sum, order) => sum + order.totalPrice,
      0
    );
    const completedRevenue = orders
      .filter((order) => order.actualStatus === "COMPLETED")
      .reduce((sum, order) => sum + order.totalPrice, 0);

    // Группировка по статусам
    const statusBreakdown = orders.reduce((acc, order) => {
      acc[order.actualStatus] = (acc[order.actualStatus] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalOrders,
      completedOrders,
      activeOrders,
      disputedOrders,
      failedOrders,
      totalRevenue,
      completedRevenue,
      completionRate:
        totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0,
      statusBreakdown,
    };
  }, [orders]);

  return {
    ...queryResult,
    data: orders,
    stats,
  };
};

// Хук для получения статистики заказов покупателя
export const useCustomerOrdersStats = () => {
  const { data: orders, ...queryResult } = useCustomerOrders();

  const stats = React.useMemo(() => {
    if (!orders || !Array.isArray(orders)) return null;

    const totalOrders = orders.length;
    const completedOrders = orders.filter(
      (order) => order.actualStatus === "COMPLETED"
    ).length;
    const pendingOrders = orders.filter((order) =>
      ["BOOKED", "AWAITING_PAYMENT", "ASSEMBLING", "ON_THE_WAY"].includes(
        order.actualStatus
      )
    ).length;
    const disputedOrders = orders.filter(
      (order) => order.actualStatus === "DISPUTED"
    ).length;
    const failedOrders = orders.filter(
      (order) => order.actualStatus === "FAILED"
    ).length;

    // Подсчет общих трат
    const totalSpent = orders.reduce((sum, order) => sum + order.totalPrice, 0);
    const completedSpent = orders
      .filter((order) => order.actualStatus === "COMPLETED")
      .reduce((sum, order) => sum + order.totalPrice, 0);

    // Группировка по статусам
    const statusBreakdown = orders.reduce((acc, order) => {
      acc[order.actualStatus] = (acc[order.actualStatus] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalOrders,
      completedOrders,
      pendingOrders,
      disputedOrders,
      failedOrders,
      totalSpent,
      completedSpent,
      statusBreakdown,
    };
  }, [orders]);

  return {
    ...queryResult,
    data: orders,
    stats,
  };
};
