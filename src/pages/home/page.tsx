"use client";

import React from "react";

import { ProductList } from "@/entities/product";
import { InfiniteScroll } from "@/shared/ui";
import { useCardsInfinite } from "@/features/product";

export const ProductCatalog = () => {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    error,
  } = useCardsInfinite(10);

  if (isLoading) return <p>Загрузка...</p>;
  if (error) return <p style={{ color: "red" }}>Ошибка: {error.message}</p>;

  return (
    <InfiniteScroll
      onLoadMore={fetchNextPage}
      hasNextPage={!!hasNextPage}
      isFetchingNextPage={isFetchingNextPage}
    >
      <ProductList products={data?.pages.flat() ?? []} />
    </InfiniteScroll>
  );
};
