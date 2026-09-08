"use client";

import React from "react";
import {
  Box,
  CircularProgress,
  IconButton,
  InputAdornment,
  InputBase,
  List,
  ListItemButton,
  ListItemText,
  Paper,
  Popper,
  Typography,
  alpha,
  useTheme,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import SearchIcon from "@mui/icons-material/Search";
import { useSearch } from "../model/useSearch";

interface SearchFormProps {
  placeholder?: string;
  variant?: "desktop" | "dialog";
  autoFocus?: boolean;
  onNavigate?: () => void;
}

export const SearchForm = ({
  placeholder = "Поиск",
  variant = "desktop",
  autoFocus = false,
  onNavigate,
}: SearchFormProps) => {
  const theme = useTheme();
  const searchFormRef = React.useRef<HTMLFormElement | null>(null);
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const reactId = React.useId();
  const suggestionsId = `product-search-suggestions-${reactId.replaceAll(":", "")}`;
  const isDialog = variant === "dialog";
  const {
    searchQuery,
    productNameSuggestions,
    highlightedSuggestionIndex,
    isSuggestionsError,
    isSuggestionsLoading,
    isSuggestionsOpen,
    handleSearchChange,
    handleSearchSubmit,
    handleClearSearch,
    handleSearchFocus,
    handleSearchBlur,
    handleSearchKeyDown,
    handleSuggestionMouseEnter,
    handleSuggestionSelect,
  } = useSearch({ onNavigate });

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    handleSearchSubmit();
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    handleSearchChange(event.target.value);
  };

  const handleClear = () => {
    handleClearSearch();
    inputRef.current?.focus();
  };

  const suggestions = (
    <Paper
      id={suggestionsId}
      role="listbox"
      aria-label="Подсказки поиска"
      onMouseDown={(event) => {
        event.preventDefault();
      }}
      sx={{
        maxHeight: isDialog ? "none" : 320,
        overflowY: "auto",
        borderRadius: isDialog ? 0 : 1.5,
        border: isDialog
          ? 0
          : `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
        boxShadow: isDialog ? "none" : theme.shadows[6],
      }}
    >
      {isSuggestionsLoading ? (
        <Box
          role="status"
          sx={{ display: "flex", alignItems: "center", gap: 1.5, px: 2, py: 2 }}
        >
          <CircularProgress size={20} />
          <Typography variant="body2" color="text.secondary">
            Ищем подходящие товары…
          </Typography>
        </Box>
      ) : isSuggestionsError ? (
        <Typography
          role="status"
          variant="body2"
          color="text.secondary"
          sx={{ px: 2, py: 2 }}
        >
          Не удалось загрузить подсказки. Поиск по Enter всё ещё доступен.
        </Typography>
      ) : productNameSuggestions.length === 0 ? (
        <Typography
          role="status"
          variant="body2"
          color="text.secondary"
          sx={{ px: 2, py: 2 }}
        >
          Подходящих подсказок нет. Нажмите Enter, чтобы найти товары.
        </Typography>
      ) : (
        <List disablePadding dense={!isDialog}>
          {productNameSuggestions.map((suggestion, index) => (
            <ListItemButton
              key={`${suggestion}-${index}`}
              id={`${suggestionsId}-option-${index}`}
              role="option"
              tabIndex={-1}
              aria-selected={highlightedSuggestionIndex === index}
              selected={highlightedSuggestionIndex === index}
              onMouseEnter={() => handleSuggestionMouseEnter(index)}
              onClick={() => handleSuggestionSelect(suggestion)}
              sx={{
                minHeight: isDialog ? 48 : 44,
                py: isDialog ? 1 : { xs: 0.75, md: 1 },
                px: 2,
                "&.Mui-selected": {
                  bgcolor: alpha(theme.palette.primary.main, 0.08),
                },
                "&.Mui-selected:hover": {
                  bgcolor: alpha(theme.palette.primary.main, 0.12),
                },
              }}
            >
              <ListItemText
                primary={suggestion}
                primaryTypographyProps={{ noWrap: true, variant: "body2" }}
              />
            </ListItemButton>
          ))}
        </List>
      )}
    </Paper>
  );

  return (
    <Box sx={{ position: "relative", width: "100%" }}>
      <Paper
        data-testid={
          isDialog ? "mobile-search-surface" : "header-search-surface"
        }
        ref={searchFormRef}
        component="form"
        role="search"
        onSubmit={handleSubmit}
        sx={{
          display: "flex",
          alignItems: "center",
          width: "100%",
          height: isDialog ? 48 : 58,
          overflow: "visible",
          borderRadius: isDialog ? 1.5 : 2,
          backgroundColor: "white",
          boxShadow: "none",
          border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
          transition: theme.transitions.create(["border-color", "box-shadow"], {
            duration: theme.transitions.duration.shorter,
          }),
          "&:hover": {
            borderColor: alpha(theme.palette.primary.main, 0.4),
          },
          "&:focus-within": {
            borderColor: theme.palette.primary.main,
            boxShadow: `0 0 0 2px ${alpha(theme.palette.primary.main, 0.2)}`,
          },
        }}
      >
        <InputBase
          inputRef={inputRef}
          autoFocus={autoFocus}
          type="search"
          placeholder={placeholder}
          value={searchQuery}
          onChange={handleInputChange}
          onFocus={handleSearchFocus}
          onClick={handleSearchFocus}
          onBlur={handleSearchBlur}
          onKeyDown={handleSearchKeyDown}
          fullWidth
          inputProps={{
            "aria-label": "поиск по сайту",
            "aria-autocomplete": "list",
            "aria-controls": isSuggestionsOpen ? suggestionsId : undefined,
            "aria-expanded": isSuggestionsOpen,
            "aria-activedescendant":
              isSuggestionsOpen &&
              highlightedSuggestionIndex >= 0 &&
              highlightedSuggestionIndex < productNameSuggestions.length
                ? `${suggestionsId}-option-${highlightedSuggestionIndex}`
                : undefined,
            autoComplete: "off",
            enterKeyHint: "search",
            role: "combobox",
          }}
          sx={{
            ml: 2,
            flex: 1,
            height: isDialog ? 48 : 58,
            minHeight: isDialog ? 48 : 58,
            color: theme.palette.text.primary,
            "& input[type='search']::-webkit-search-cancel-button": {
              display: "none",
            },
            "& .MuiInputBase-input": {
              boxSizing: "border-box",
              height: isDialog ? 48 : 58,
              padding: "10px 0",
              fontSize: "1rem",
              "&::placeholder": {
                color: theme.palette.text.secondary,
                opacity: 1,
              },
            },
          }}
          endAdornment={
            <InputAdornment position="end" sx={{ mr: 0.5 }}>
              {searchQuery && (
                <IconButton
                  type="button"
                  aria-label="Очистить поиск"
                  onClick={handleClear}
                  size="small"
                  sx={{ color: theme.palette.text.secondary }}
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
              )}
              {isDialog ? (
                <IconButton
                  type="submit"
                  aria-label="Найти"
                  disabled={!searchQuery.trim()}
                  color="primary"
                >
                  <SearchIcon />
                </IconButton>
              ) : (
                isSuggestionsLoading && (
                  <CircularProgress aria-label="Загрузка подсказок" size={18} />
                )
              )}
            </InputAdornment>
          }
        />
      </Paper>

      {isDialog ? (
        isSuggestionsOpen && (
          <Box sx={{ mt: 1, mx: -2 }}>{suggestions}</Box>
        )
      ) : (
        <Popper
          open={isSuggestionsOpen}
          anchorEl={searchFormRef.current}
          placement="bottom-start"
          modifiers={[{ name: "offset", options: { offset: [0, 4] } }]}
          sx={{
            zIndex: theme.zIndex.appBar + 1,
            width: searchFormRef.current?.offsetWidth ?? "100%",
          }}
        >
          {suggestions}
        </Popper>
      )}
    </Box>
  );
};
