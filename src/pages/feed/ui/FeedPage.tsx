"use client";

import React, { useEffect } from "react";
import { useIntersectionObserver } from "usehooks-ts";
import Card from "./Card";
import { Box, Grid } from "@mui/material";
import { useCardsInfinite } from "../../../shared/api/card";

const FeedPage: React.FC = () => {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    error,
  } = useCardsInfinite(10);

  const { ref, entry } = useIntersectionObserver({
    threshold: 0.1,
  });

  useEffect(() => {
    if (entry?.isIntersecting && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [entry, hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (isLoading) {
    return <p>Загрузка...</p>;
  }

  if (error) {
    return (
      <p style={{ color: "red" }}>
        Ошибка загрузки карточек: {(error as Error).message}
      </p>
    );
  }

  return (
    <Box>
      <Grid container spacing={{ xs: "12px", sm: 3 }}>
        {data?.pages.map((page, pageIndex) =>
          page.map((card, cardIndex) => {
            // Определяем, является ли карточка последней в списке
            const isLastItem =
              pageIndex === data.pages.length - 1 &&
              cardIndex === page.length - 1;
            return (
              <Grid
                item
                xs={6}
                sm={3}
                lg={2}
                key={card.id}
                ref={isLastItem ? ref : undefined}
              >
                <Card {...card} />
              </Grid>
            );
          })
        )}
      </Grid>
      {isFetchingNextPage && <p>Загрузка следующей страницы...</p>}
    </Box>
  );
};

export default FeedPage;
