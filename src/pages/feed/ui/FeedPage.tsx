"use client";

import React, { useState, useEffect } from "react";
import Card from "./Card";
import { Box, Grid } from "@mui/material";
import { CardItem, CardResponse } from "../../../shared/api/types";
import { authenticate, fetchCards } from "../../../shared/api/card";

const FeedPage: React.FC = () => {
  const [cardList, setCardList] = useState<CardItem[]>([]); // Список карточек
  const [isLoading, setIsLoading] = useState<boolean>(true); // Индикатор загрузки
  const [error, setError] = useState<string | null>(null); // Ошибка

  useEffect(() => {
    const loadCards = async () => {
      try {
        //const token = await authenticate("admin", "stas");
        const data = await fetchCards(""); // Запрашиваем данные с POST-запросом
        setCardList(data);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setIsLoading(false);
      }
    };
    loadCards();
  }, []);
  return (
    <Box>
      {isLoading && <p>Загрузка...</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}
      <Grid container spacing={{ xs: "12px", sm: 3 }}>
        {cardList.map((card) => (
          <Grid item xs={6} sm={3} lg={2} key={card.id}>
            <Card
              price={card.price}
              id={card.id}
              name={card.name}
              image={card.image}
              category={card.category}
            />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default FeedPage;
