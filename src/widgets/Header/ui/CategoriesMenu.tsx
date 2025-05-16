"use client";

import React from "react";
import {
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  IconButton,
  Divider,
  Typography,
} from "@mui/material";
import Link from "next/link";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { alpha } from "@mui/material/styles";

// Импортируйте нужные иконки для категорий
import SportsEsportsIcon from "@mui/icons-material/SportsEsports"; // Настольные игры
import CasinoIcon from "@mui/icons-material/Casino"; // Ролевые игры
import ToysIcon from "@mui/icons-material/Toys"; // Экшен-фигурки
import ViewInArIcon from "@mui/icons-material/ViewInAr"; // Варгеймы
import DirectionsCarIcon from "@mui/icons-material/DirectionsCar"; // Стендовые модели
import BuildIcon from "@mui/icons-material/Build"; // Все для моделирования
import StyleIcon from "@mui/icons-material/Style"; // Коллекционные карточные игры

// Список категорий с иконками
const categories = [
  {
    id: 1,
    name: "Варгеймы",
    icon: <ViewInArIcon />,
    path: "/categories/wargames",
  },
  {
    id: 2,
    name: "Стендовые модели",
    icon: <DirectionsCarIcon />,
    path: "/categories/models",
  },
  {
    id: 3,
    name: "Все для моделирования",
    icon: <BuildIcon />,
    path: "/categories/modeling",
  },
  {
    id: 4,
    name: "Настольные игры",
    icon: <SportsEsportsIcon />,
    path: "/categories/board-games",
  },
  {
    id: 5,
    name: "Ролевые игры",
    icon: <CasinoIcon />,
    path: "/categories/rpg",
  },
  {
    id: 6,
    name: "Экшен-фигурки",
    icon: <ToysIcon />,
    path: "/categories/action-figures",
  },
  {
    id: 7,
    name: "Коллекционные карточные игры",
    icon: <StyleIcon />,
    path: "/categories/card-games",
  },
];

interface CategoriesMenuProps {
  onClose: () => void;
}

export const CategoriesMenu: React.FC<CategoriesMenuProps> = ({ onClose }) => {
  return (
    <Box
      sx={{
        width: "100%",
        maxHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        overflowX: "hidden",
        overflowY: "auto",
        "&::-webkit-scrollbar": {
          width: "8px",
          display: "none",
        },
        "&:hover::-webkit-scrollbar": {
          display: "block",
        },
        "&::-webkit-scrollbar-track": {
          background: "transparent",
        },
        "&::-webkit-scrollbar-thumb": {
          backgroundColor: (theme) => alpha(theme.palette.secondary.main, 0.3),
          borderRadius: "4px",
        },
        "&::-webkit-scrollbar-thumb:hover": {
          backgroundColor: (theme) => alpha(theme.palette.secondary.main, 0.5),
        },
      }}
    >
      {/* Header with Figurzill title */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          height: "57px",
          px: 2,
          py: 2,
          borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
        }}
      >
        <Typography
          variant="h6"
          component="div"
          sx={{
            flexGrow: 1,
            fontWeight: 600,
            color: "secondary.main",
          }}
        >
          Figurzilla
        </Typography>
      </Box>

      <List sx={{ width: "100%", p: 0, mt: 0 }}>
        {categories.map((category) => (
          <ListItem key={category.id} disablePadding divider>
            <ListItemButton
              component={Link}
              href={category.path}
              onClick={onClose}
              sx={{
                py: 1.5,
                "&:hover": {
                  backgroundColor: (theme) =>
                    alpha(theme.palette.primary.main, 0.04),
                },
              }}
            >
              <ListItemIcon
                sx={{
                  minWidth: 40,
                  color: "primary.main",
                }}
              >
                {category.icon}
              </ListItemIcon>
              <ListItemText
                primary={category.name}
                primaryTypographyProps={{
                  fontWeight: 500,
                  color: "text.primary",
                }}
              />
              <ChevronRightIcon
                sx={{
                  color: "action.active",
                  opacity: 0.7,
                }}
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Box>
  );
};
