"use client";

import React, { useEffect } from "react";
import { useIntersectionObserver } from "usehooks-ts";

interface InfiniteScrollProps {
  onLoadMore: () => void;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  children: React.ReactNode;
}

export const InfiniteScroll: React.FC<InfiniteScrollProps> = ({
  onLoadMore,
  hasNextPage,
  isFetchingNextPage,
  children,
}) => {
  const { ref, entry } = useIntersectionObserver({
    threshold: 0.1,
  });

  useEffect(() => {
    if (entry?.isIntersecting && hasNextPage && !isFetchingNextPage) {
      onLoadMore();
    }
  }, [entry, hasNextPage, isFetchingNextPage, onLoadMore]);

  return (
    <div>
      {children}
      <div ref={ref} style={{ height: "1px" }} />
    </div>
  );
};
