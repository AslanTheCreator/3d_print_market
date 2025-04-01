import React from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Typography,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

interface ProductDescriptionProps {
  description: string;
}

export const ProductDescription: React.FC<ProductDescriptionProps> = ({
  description,
}) => (
  <Accordion
    defaultExpanded={false}
    sx={{
      "&::before": { content: "none" },
      boxShadow: "none",
    }}
  >
    <AccordionSummary
      expandIcon={<ExpandMoreIcon />}
      sx={{ padding: "0 16px" }}
    >
      <Typography variant="body1" sx={{ fontWeight: "500" }}>
        Описание
      </Typography>
    </AccordionSummary>
    <AccordionDetails>
      <Typography variant="body2" sx={{ color: "text.secondary" }}>
        {description || "Описание товара отсутствует"}
      </Typography>
    </AccordionDetails>
  </Accordion>
);
