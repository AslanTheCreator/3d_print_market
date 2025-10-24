import React from "react";
import {
  InputBase,
  Paper,
  alpha,
  IconButton,
  InputAdornment,
  useTheme,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { useSearch } from "../model/useSearch";

interface SearchFormProps {
  isMobile?: boolean;
  placeholder?: string;
}

export const SearchForm = ({
  isMobile = false,
  placeholder = "Поиск",
}: SearchFormProps) => {
  const theme = useTheme();
  const {
    searchQuery,
    handleSearchChange,
    handleSearchSubmit,
    handleClearSearch,
  } = useSearch();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    handleSearchSubmit();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleSearchChange(e.target.value);
  };

  return (
    <Paper
      component="form"
      onSubmit={handleSubmit}
      sx={{
        display: "flex",
        alignItems: "center",
        width: "100%",
        height: isMobile ? 35 : 58,
        borderRadius: isMobile ? 1 : 2,
        backgroundColor: "white",
        boxShadow: "none",
        border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
        transition: theme.transitions.create(["border-color", "box-shadow"], {
          duration: theme.transitions.duration.shorter,
        }),
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
        placeholder={placeholder}
        value={searchQuery}
        onChange={handleInputChange}
        fullWidth
        inputProps={{
          "aria-label": "поиск по сайту",
        }}
        sx={{
          ml: 2,
          flex: 1,
          color: theme.palette.text.primary,
          "& .MuiInputBase-input": {
            padding: isMobile ? "8px 0" : "10px 0",
            fontSize: isMobile ? "0.875rem" : "1rem", // Используем rem вместо px
            "&::placeholder": {
              color: theme.palette.text.secondary,
              opacity: 1,
            },
          },
        }}
        endAdornment={
          searchQuery && (
            <InputAdornment position="end">
              <IconButton
                aria-label="очистить поиск"
                onClick={handleClearSearch}
                edge="end"
                size="small"
                sx={{
                  mr: 1,
                  color: theme.palette.text.secondary,
                  transition: theme.transitions.create(
                    ["color", "background-color"],
                    {
                      duration: theme.transitions.duration.shorter,
                    }
                  ),
                  "&:hover": {
                    color: theme.palette.text.primary,
                    backgroundColor: alpha(theme.palette.primary.main, 0.04),
                  },
                }}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            </InputAdornment>
          )
        }
      />
    </Paper>
  );
};
