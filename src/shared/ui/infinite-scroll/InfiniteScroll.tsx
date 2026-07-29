"use client";

import React, { useEffect } from "react";
import { useIntersectionObserver } from "usehooks-ts";
import {
  Box,
  CircularProgress,
  Fade,
  Skeleton,
} from "@mui/material";

interface InfiniteScrollProps {
  onLoadMore: () => void;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  children: React.ReactNode;
  showSkeletons?: boolean;
}

export const InfiniteScroll: React.FC<InfiniteScrollProps> = ({
  onLoadMore,
  hasNextPage,
  isFetchingNextPage,
  children,
  showSkeletons = true,
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

      {isFetchingNextPage && (
        <Fade in timeout={300}>
          <Box sx={{ mt: 3 }}>
            {showSkeletons ? (
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: {
                    xs: "repeat(2, minmax(0, 1fr))",
                    sm: "repeat(auto-fill, minmax(156px, 1fr))",
                    md: "repeat(auto-fill, minmax(190px, 1fr))",
                  },
                  gap: { xs: 1, sm: 1.5, md: 2.5 },
                }}
              >
                {Array.from({ length: 6 }).map((_, index) => (
                  <Skeleton
                    key={`loading-skeleton-${index}`}
                    variant="rounded"
                    animation="wave"
                    sx={{
                      width: "100%",
                      borderRadius: 2,
                      aspectRatio: { xs: "0.72", sm: "0.7" },
                      display:
                        index >= 4 ? { xs: "none", sm: "block" } : "block",
                    }}
                  />
                ))}
              </Box>
            ) : (
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
