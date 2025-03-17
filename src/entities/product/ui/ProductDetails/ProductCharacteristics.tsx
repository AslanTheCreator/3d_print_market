import React from "react";
import { List, ListItem, Typography } from "@mui/material";

interface Characteristic {
  label: string;
  value: string;
}

interface ProductCharacteristicsProps {
  characteristics: Characteristic[];
}

const ProductCharacteristics: React.FC<ProductCharacteristicsProps> = ({
  characteristics,
}) => (
  <List sx={{ padding: 0 }}>
    {characteristics.map((item, index) => (
      <ListItem
        key={index}
        sx={{
          display: "flex",
          justifyContent: "space-between",
          padding: "8px 16px",
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

export default ProductCharacteristics;
