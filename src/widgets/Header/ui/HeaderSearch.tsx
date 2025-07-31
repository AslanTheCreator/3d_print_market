import React, { useState } from "react";
import {
  InputBase,
  Paper,
  alpha,
  IconButton,
  InputAdornment,
  useTheme,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { useRouter } from "next/navigation";

export const HeaderSearch = ({ isMobile }: { isMobile?: boolean }) => {
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
        placeholder="Поиск"
        value={searchQuery}
        onChange={handleSearchChange}
        fullWidth
        sx={{
          ml: 2,
          flex: 1,
          color: theme.palette.text.primary,
          "& .MuiInputBase-input": {
            padding: isMobile ? "8px 0" : "10px 0",
            fontSize: isMobile ? "16px" : "18px",
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
          ) : null
        }
      />
    </Paper>
  );
};
