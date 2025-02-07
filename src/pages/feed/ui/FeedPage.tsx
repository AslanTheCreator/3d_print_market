"use client";

import React, { useState, useEffect } from "react";
import Card from "./Card";
import { Box, Grid } from "@mui/material";
import { CardResponse } from "../../../shared/api/types";
import { fetchCards } from "../../../shared/api/card";
import { cardList } from "@/shared/constant/data/mockData";

const FeedPage: React.FC = () => {
  // const [cardList, setCardList] = useState<CardResponse[]>([]); // Список карточек
  // const [isLoading, setIsLoading] = useState<boolean>(true); // Индикатор загрузки
  // const [error, setError] = useState<string | null>(null); // Ошибка

  // useEffect(() => {
  //   const loadCards = async () => {
  //     try {
  //       const data = await fetchCards(); // Запрашиваем данные с POST-запросом
  //       setCardList(data);
  //     } catch (err) {
  //       setError((err as Error).message);
  //     } finally {
  //       setIsLoading(false);
  //     }
  //   };
  //   loadCards();
  // }, []);
  return (
    <Box>
      {/* {isLoading && <p>Загрузка...</p>}
      {error && <p style={{ color: "red" }}>{error}</p>} */}
      <Grid container spacing={{ xs: 2, sm: 3 }}>
        {cardList.map((card) => (
          <Grid item xs={6} sm={3} key={card.id}>
            <Card
              price={card.price}
              id={card.id}
              name={card.name}
              image={card.image}
            />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default FeedPage;
