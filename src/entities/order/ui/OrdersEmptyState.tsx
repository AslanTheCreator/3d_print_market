"use client";
import React from "react";
import { useRouter } from "next/navigation";
import { ShoppingBag, Store } from "@mui/icons-material";
import { EmptyState } from "@/shared/ui";

type UserRole = "seller" | "customer";

interface OrdersEmptyStateProps {
  userRole: UserRole;
}

export const OrdersEmptyState = ({ userRole }: OrdersEmptyStateProps) => {
  const router = useRouter();

  const sellerConfig = {
    icon: <Store sx={{ fontSize: 48 }} />,
    title: "У вас пока нет заказов",
    description:
      "Когда кто-то купит ваш товар, заказ появится здесь. Добавьте больше товаров, чтобы увеличить продажи!",
    actionButton: {
      text: "Добавить товар",
      onClick: () => router.push("/seller/products/create"),
      variant: "contained" as const,
    },
  };

  const customerConfig = {
    icon: <ShoppingBag sx={{ fontSize: 48 }} />,
    title: "У вас пока нет покупок",
    description:
      "Ваши заказы будут отображаться здесь. Начните покупки прямо сейчас!",
    actionButton: {
      text: "Перейти к покупкам",
      onClick: () => router.push("/catalog"),
      variant: "contained" as const,
    },
  };

  const config = userRole === "seller" ? sellerConfig : customerConfig;

  return <EmptyState {...config} />;
};
