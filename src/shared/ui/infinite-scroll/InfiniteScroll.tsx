"use client";

import React, { useEffect } from "react";
import { useIntersectionObserver } from "usehooks-ts";
import { Alert, Box, Button, CircularProgress, Fade } from "@mui/material";

interface InfiniteScrollProps {
  onLoadMore: () => void;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  isLoadMoreError: boolean;
  isLoadMoreBlocked: boolean;
  children: React.ReactNode;
  loadingContent?: React.ReactNode;
}

export const InfiniteScroll: React.FC<InfiniteScrollProps> = ({
  onLoadMore,
  hasNextPage,
  isFetchingNextPage,
  isLoadMoreError,
  isLoadMoreBlocked,
  children,
  loadingContent,
}) => {
  const { ref, entry } = useIntersectionObserver({
    threshold: 0.1,
  });

  useEffect(() => {
    if (entry?.isIntersecting && hasNextPage && !isFetchingNextPage && !isLoadMoreBlocked && !isLoadMoreError) {
      onLoadMore();
    }
  }, [entry, hasNextPage, isFetchingNextPage, isLoadMoreBlocked, isLoadMoreError, onLoadMore]);

  return (
    <div aria-busy={isFetchingNextPage}>
      {children}

      {isLoadMoreError && (
        <Alert severity="error" sx={{ mt: 2 }} action={
          <Button color="inherit" disabled={isLoadMoreBlocked || isFetchingNextPage} onClick={onLoadMore}>
            {isFetchingNextPage ? "Загрузка..." : "Повторить загрузку"}
          </Button>
        }>
          Не удалось загрузить следующие товары.
        </Alert>
      )}

      {isFetchingNextPage && (
        <Fade in timeout={300}>
          <Box sx={{ mt: 3 }}>
            {loadingContent ?? (
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  py: { xs: 3, sm: 4 },
                }}
              >
                <CircularProgress
                  size={32}
                  thickness={4}
                  sx={{
                    color: (paletteTheme) => paletteTheme.palette.primary.main,
                  }}
                />
              </Box>
            )}
          </Box>
        </Fade>
      )}

      <div
        ref={ref}
        data-testid="infinite-scroll-sentinel"
        style={{
          height: "50px",
          visibility: "hidden",
        }}
      />
    </div>
  );
};
