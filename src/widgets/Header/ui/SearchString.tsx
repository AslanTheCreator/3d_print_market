import React, { useState } from "react";
import {
  InputBase,
  Paper,
  alpha,
  IconButton,
  InputAdornment,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import CloseIcon from "@mui/icons-material/Close";
import { useRouter } from "next/navigation";

const SearchString = () => {
  const theme = useTheme();
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState("");

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (searchQuery.trim()) {
      const encodedQuery = encodeURIComponent(searchQuery.trim());
      router.push(`/catalog/search?query=${encodedQuery}`);
      setSearchQuery("");
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleClearSearch = () => {
    setSearchQuery("");
  };

  return (
    <Paper
      component="form"
      onSubmit={handleSubmit}
      sx={{
        display: "flex",
        alignItems: "center",
        width: "100%",
        height: 35,
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
        value={searchQuery}
        onChange={handleSearchChange}
        fullWidth
        sx={{
          ml: 1,
          flex: 1,
          color: theme.palette.text.primary,
          "& .MuiInputBase-input": {
            padding: "10px 0",
            fontSize: "0.875rem",
            "&::placeholder": {
              color: theme.palette.text.secondary,
              opacity: 1,
            },
          },
        }}
        endAdornment={
          searchQuery ? (
            <InputAdornment position="end">
              <IconButton
                aria-label="очистить поиск"
                onClick={handleClearSearch}
                edge="end"
                size="small"
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            </InputAdornment>
          ) : null
        }
      />
    </Paper>
  );
};

export default SearchString;
