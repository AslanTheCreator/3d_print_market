"use client";

import React, { useEffect } from "react";
import { useIntersectionObserver } from "usehooks-ts";
import { Box, CircularProgress, Fade } from "@mui/material";

interface InfiniteScrollProps {
  onLoadMore: () => void;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  children: React.ReactNode;
  loadingContent?: React.ReactNode;
}

export const InfiniteScroll: React.FC<InfiniteScrollProps> = ({
  onLoadMore,
  hasNextPage,
  isFetchingNextPage,
  children,
  loadingContent,
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
    <div aria-busy={isFetchingNextPage}>
      {children}

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
        style={{
          height: "50px",
          visibility: "hidden",
        }}
      />
    </div>
  );
};
