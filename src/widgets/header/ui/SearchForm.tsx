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
import { useSearch } from "../model/useSearch";

interface SearchFormProps {
  placeholder?: string;
}

export const SearchForm = ({
  placeholder = "Поиск",
}: SearchFormProps) => {
  const theme = useTheme();
  const searchFormRef = React.useRef<HTMLFormElement | null>(null);
  const suggestionsId = "product-search-suggestions";
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
  } = useSearch();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    handleSearchSubmit();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleSearchChange(e.target.value);
  };

  return (
    <Box sx={{ position: "relative", width: "100%" }}>
      <Paper
        data-testid="header-search-surface"
        ref={searchFormRef}
        component="form"
        onSubmit={handleSubmit}
        sx={{
          display: "flex",
          alignItems: "center",
          width: "100%",
          height: { xs: 35, md: 58 },
          overflow: "visible",
          borderRadius: { xs: 1, md: 2 },
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
              highlightedSuggestionIndex >= 0
                ? `${suggestionsId}-option-${highlightedSuggestionIndex}`
                : undefined,
            autoComplete: "off",
          }}
          sx={{
            ml: 2,
            flex: 1,
            height: { xs: 44, md: 58 },
            minHeight: 44,
            color: theme.palette.text.primary,
            "& .MuiInputBase-input": {
              boxSizing: "border-box",
              height: { xs: 44, md: 58 },
              padding: { xs: "12px 0", md: "10px 0" },
              fontSize: { xs: "0.875rem", md: "1rem" },
              "&::placeholder": {
                color: theme.palette.text.secondary,
                opacity: 1,
              },
            },
          }}
          endAdornment={(searchQuery || isSuggestionsLoading) && (
            <InputAdornment position="end">
              {isSuggestionsLoading && (
                <CircularProgress
                  size={18}
                  sx={{ mr: searchQuery ? 0.5 : 1 }}
                />
              )}
              {searchQuery && (
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
                      },
                    ),
                    "&:hover": {
                      color: theme.palette.text.primary,
                      backgroundColor: alpha(theme.palette.primary.main, 0.04),
                    },
                  }}
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
              )}
            </InputAdornment>
          )}
        />
      </Paper>

      <Popper
        open={isSuggestionsOpen}
        anchorEl={searchFormRef.current}
        placement="bottom-start"
        modifiers={[
          {
            name: "offset",
            options: {
              offset: [0, 4],
            },
          },
        ]}
        sx={{
          zIndex: theme.zIndex.appBar + 1,
          width: searchFormRef.current?.offsetWidth ?? "100%",
        }}
      >
        <Paper
          id={suggestionsId}
          role="listbox"
          onMouseDown={(event) => {
            event.preventDefault();
          }}
          sx={{
            maxHeight: 320,
            overflowY: "auto",
            borderRadius: 1.5,
            border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
            boxShadow: theme.shadows[6],
          }}
        >
          {isSuggestionsError ? (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ px: 2, py: 1.25 }}
            >
              Не удалось загрузить подсказки
            </Typography>
          ) : (
            <List disablePadding dense>
              {productNameSuggestions.map((suggestion, index) => (
                <ListItemButton
                  key={`${suggestion}-${index}`}
                  id={`${suggestionsId}-option-${index}`}
                  role="option"
                  selected={highlightedSuggestionIndex === index}
                  onMouseEnter={() => handleSuggestionMouseEnter(index)}
                  onClick={() => handleSuggestionSelect(suggestion)}
                  sx={{
                    py: { xs: 0.75, md: 1 },
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
                    primaryTypographyProps={{
                      noWrap: true,
                      variant: "body2",
                    }}
                  />
                </ListItemButton>
              ))}
            </List>
          )}
        </Paper>
      </Popper>
    </Box>
  );
};
