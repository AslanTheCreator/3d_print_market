"use client";
import React from "react";
import { UseQueryResult } from "@tanstack/react-query";
import { ListOrdersModel } from "@/entities/order/model/types";
import { OrdersList } from "@/widgets/OrdersList/OrdersList";

type UserRole = "seller" | "customer";

interface OrderDetailsProps {
  title: string;
  query: UseQueryResult<ListOrdersModel[]>;
  userRole: UserRole;
}

export const OrderDetails = (props: OrderDetailsProps) => {
  return <OrdersList {...props} />;
};
