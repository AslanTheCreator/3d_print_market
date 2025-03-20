import React from "react";
import { InputBase, Paper, alpha } from "@mui/material";
import { useTheme } from "@mui/material/styles";

const SearchString = () => {
  const theme = useTheme();

  return (
    <Paper
      component="div"
      sx={{
        display: "flex",
        alignItems: "center",
        width: "100%",
        height: 40,
        borderRadius: "8px",
        backgroundColor: "white",
        boxShadow: "none",
        border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
        "&:hover": {
          border: `1px solid ${alpha(theme.palette.primary.main, 0.4)}`,
        },
        "&:focus-within": {
          border: `1px solid ${theme.palette.primary.main}`,
          boxShadow: `0 0 0 2px ${alpha(theme.palette.primary.main, 0.2)}`,
        },
      }}
    >
      <InputBase
        placeholder="Поиск..."
        fullWidth
        sx={{
          ml: 1.5,
          flex: 1,
          color: theme.palette.text.primary,
          "& .MuiInputBase-input": {
            padding: "8px 0",
            fontSize: "0.875rem",
            "&::placeholder": {
              color: theme.palette.text.secondary,
              opacity: 1,
            },
          },
        }}
      />
    </Paper>
  );
};

export default SearchString;
