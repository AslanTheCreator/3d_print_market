import React from "react";
import { List, ListItem, Typography } from "@mui/material";

interface Characteristic {
  label: string;
  value: string;
}

interface ProductCharacteristicsProps {
  characteristics: Characteristic[];
}

export const ProductCharacteristics: React.FC<ProductCharacteristicsProps> = ({
  characteristics,
}) => (
  <List sx={{ p: 0 }}>
    {characteristics.map((item, index) => (
      <ListItem
        key={index}
        sx={{
          display: "flex",
          justifyContent: "space-between",
          py: 1.5,
          px: { xs: 1, sm: 2 },
        }}
      >
        <Typography variant="body1" sx={{ fontWeight: "500" }}>
          {item.label}
        </Typography>
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          {item.value}
        </Typography>
      </ListItem>
    ))}
  </List>
);
