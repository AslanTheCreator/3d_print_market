"use client";

import React, { useEffect } from "react";
import { useIntersectionObserver } from "usehooks-ts";
import {
  Box,
  CircularProgress,
  Fade,
  Skeleton,
  useMediaQuery,
  useTheme,
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
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const { ref, entry } = useIntersectionObserver({
    threshold: 0.1,
  });

  useEffect(() => {
    if (entry?.isIntersecting && hasNextPage && !isFetchingNextPage) {
      onLoadMore();
    }
  }, [entry, hasNextPage, isFetchingNextPage, onLoadMore]);

  const getSkeletonCount = () => {
    if (isMobile) return 4;
    return 6;
  };

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
                  gridTemplateColumns: isMobile
                    ? "repeat(2, minmax(0, 1fr))"
                    : "repeat(3, minmax(0, 1fr))",
                  gap: { xs: 1, sm: 2 },
                }}
              >
                {Array.from({ length: getSkeletonCount() }).map((_, index) => (
                  <Skeleton
                    key={`loading-skeleton-${index}`}
                    variant="rounded"
                    animation="wave"
                    sx={{
                      width: "100%",
                      borderRadius: 2,
                      aspectRatio: isMobile ? "0.72" : "0.7",
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
