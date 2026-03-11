"use client";

import React, { useEffect } from "react";
import { useIntersectionObserver } from "usehooks-ts";
import {
  Box,
  CircularProgress,
  Fade,
  Skeleton,
  Typography,
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
    if (isMobile) return 4; // 2x2 на мобильных
    return 6; // 6 товаров на десктопе
  };

  return (
    <div>
      {children}

      {/* Визуальный индикатор загрузки */}
      {isFetchingNextPage && (
        <Fade in={true} timeout={300}>
          <Box sx={{ mt: 3 }}>
            {showSkeletons ? (
              // Используем ваши существующие компоненты
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
              // Альтернативный простой спиннер
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  py: { xs: 3, sm: 4 },
                  gap: 2,
                }}
              >
                <CircularProgress
                  size={32}
                  thickness={4}
                  sx={{
                    color: (theme) => theme.palette.primary.main,
                  }}
                />
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{
                    fontSize: { xs: "0.875rem", sm: "1rem" },
                    fontWeight: 500,
                  }}
                >
                  Загружаем товары...
                </Typography>
              </Box>
            )}
          </Box>
        </Fade>
      )}

      {/* Сообщение о том, что товары закончились */}
      {!hasNextPage && !isFetchingNextPage && (
        <Fade in={true} timeout={500}>
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              py: { xs: 3, sm: 4 },
              gap: 1,
              mt: 2,
            }}
          >
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                fontSize: { xs: "0.875rem", sm: "1rem" },
                fontWeight: 500,
                textAlign: "center",
              }}
            >
              Вы просмотрели все товары
            </Typography>
          </Box>
        </Fade>
      )}

      {/* Невидимый триггер для intersection observer */}
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
