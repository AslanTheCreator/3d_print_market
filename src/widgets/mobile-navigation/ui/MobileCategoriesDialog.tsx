"use client";

import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  Divider,
  IconButton,
  InputAdornment,
  InputBase,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Paper,
  Typography,
  alpha,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CategoryIcon from "@mui/icons-material/Category";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import CloseIcon from "@mui/icons-material/Close";
import SearchIcon from "@mui/icons-material/Search";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, FormEvent, KeyboardEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  buildCategoryPath,
  getCategoryIcon,
  getCategorySlug,
  useCategories,
} from "@/entities/category";
import type { CategoryModel } from "@/entities/category";
import { useProductNameSuggestions } from "@/entities/product";

const SUGGESTIONS_ID = "mobile-categories-search-suggestions";
const SUGGESTION_MIN_LENGTH = 2;
const SUGGESTION_DEBOUNCE_MS = 300;

interface CategoryLevel {
  category: CategoryModel;
  slug: string;
}

interface DialogHistoryMarker {
  sessionId: string;
  depth: number;
}

export interface MobileCategoriesDialogProps {
  open: boolean;
  onClose: () => void;
  id?: string;
}

interface MobileCategoriesDialogContentProps extends MobileCategoriesDialogProps {
  onNavigate: (href: string) => void;
}

const MobileCategoriesDialogContent = ({
  open,
  onClose,
  onNavigate,
  id = "mobile-categories-dialog",
}: MobileCategoriesDialogContentProps) => {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up("md"));
  const searchParams = useSearchParams();
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [trail, setTrail] = useState<CategoryLevel[]>([]);
  const historyDepthRef = useRef(0);
  const historySessionRef = useRef<string | null>(null);
  const historyTrailsRef = useRef(new Map<number, CategoryLevel[]>());
  const hasDialogHistoryEntryRef = useRef(false);
  const isOpenRef = useRef(open);

  const {
    data: categories = [],
    isLoading: isCategoriesLoading,
    isError: isCategoriesError,
    error: categoriesError,
    refetch: refetchCategories,
  } = useCategories({ enabled: open });

  const normalizedQuery = query.trim();
  const suggestionsQuery = useProductNameSuggestions(debouncedQuery, {
    enabled: open,
  });
  const isCurrentSuggestionQuery = debouncedQuery === normalizedQuery;
  const suggestions = useMemo(
    () =>
      isCurrentSuggestionQuery ? (suggestionsQuery.data ?? []) : [],
    [isCurrentSuggestionQuery, suggestionsQuery.data],
  );
  const shouldShowSuggestions =
    isSearchFocused &&
    normalizedQuery.length >= SUGGESTION_MIN_LENGTH &&
    isCurrentSuggestionQuery;

  const currentLevel = trail.at(-1);
  const visibleCategories = currentLevel?.category.childs ?? categories;
  const parentSlugs = trail.map((level) => level.slug);

  useEffect(() => {
    isOpenRef.current = open;

    if (open && !hasDialogHistoryEntryRef.current) {
      const marker: DialogHistoryMarker = {
        sessionId: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        depth: 1,
      };
      historySessionRef.current = marker.sessionId;
      historyTrailsRef.current = new Map([[1, []]]);
      setTrail([]);
      window.history.pushState(
        { ...window.history.state, mobileCategoriesDialog: marker },
        "",
        window.location.href,
      );
      hasDialogHistoryEntryRef.current = true;
      historyDepthRef.current = 1;
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;

    setQuery(searchParams.get("query") ?? "");
    setDebouncedQuery(searchParams.get("query")?.trim() ?? "");
    setHighlightedIndex(-1);
  }, [open, searchParams]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedQuery(normalizedQuery);
    }, SUGGESTION_DEBOUNCE_MS);

    return () => window.clearTimeout(timeoutId);
  }, [normalizedQuery]);

  useEffect(() => {
    setHighlightedIndex(-1);
  }, [debouncedQuery]);

  useEffect(() => {
    if (!open) return;

    const handlePopState = (event: PopStateEvent) => {
      if (!isOpenRef.current) return;

      const marker = event.state?.mobileCategoriesDialog as
        | DialogHistoryMarker
        | undefined;
      const restoredTrail =
        marker?.sessionId === historySessionRef.current
          ? historyTrailsRef.current.get(marker.depth)
          : undefined;

      if (marker && restoredTrail) {
        historyDepthRef.current = marker.depth;
        setTrail(restoredTrail);
        return;
      }

      historyDepthRef.current = 0;
      historySessionRef.current = null;
      historyTrailsRef.current.clear();
      hasDialogHistoryEntryRef.current = false;
      isOpenRef.current = false;
      onClose();
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [onClose, open]);

  const closeAndRestoreHistory = useCallback(() => {
    const historyDepth = historyDepthRef.current;
    historyDepthRef.current = 0;
    historySessionRef.current = null;
    historyTrailsRef.current.clear();
    hasDialogHistoryEntryRef.current = false;
    isOpenRef.current = false;
    onClose();

    if (historyDepth > 0) {
      window.history.go(-historyDepth);
    }
  }, [onClose]);

  useEffect(() => {
    if (open && isDesktop) closeAndRestoreHistory();
  }, [closeAndRestoreHistory, isDesktop, open]);

  const navigateAfterHistoryRestore = useCallback(
    (href: string) => {
      const historyDepth = historyDepthRef.current;
      historyDepthRef.current = 0;
      historySessionRef.current = null;
      historyTrailsRef.current.clear();
      hasDialogHistoryEntryRef.current = false;
      isOpenRef.current = false;
      onClose();

      if (historyDepth === 0) {
        onNavigate(href);
        return;
      }

      const handlePopState = () => {
        window.removeEventListener("popstate", handlePopState);
        onNavigate(href);
      };

      window.addEventListener("popstate", handlePopState);
      window.history.go(-historyDepth);
    },
    [onClose, onNavigate],
  );

  const handleBack = () => {
    if (trail.length === 0) {
      closeAndRestoreHistory();
      return;
    }

    window.history.back();
  };

  const handleSearch = (value: string) => {
    const trimmedQuery = value.trim();
    if (!trimmedQuery) return;

    navigateAfterHistoryRestore(
      `/catalog/search?query=${encodeURIComponent(trimmedQuery)}`,
    );
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (highlightedIndex >= 0 && suggestions[highlightedIndex]) {
      handleSearch(suggestions[highlightedIndex]);
      return;
    }

    handleSearch(query);
  };

  const handleQueryChange = (event: ChangeEvent<HTMLInputElement>) => {
    setQuery(event.target.value);
    setIsSearchFocused(true);
    setHighlightedIndex(-1);
  };

  const handleSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!shouldShowSuggestions || suggestions.length === 0) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlightedIndex((current) =>
        current < suggestions.length - 1 ? current + 1 : 0,
      );
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlightedIndex((current) =>
        current > 0 ? current - 1 : suggestions.length - 1,
      );
    }
  };

  const handleCategoryClick = (category: CategoryModel) => {
    if (category.childs.length > 0) {
      const sessionId = historySessionRef.current;
      if (!sessionId) return;

      const nextTrail = [
        ...trail,
        { category, slug: getCategorySlug(category) },
      ];
      const depth = nextTrail.length + 1;
      const marker: DialogHistoryMarker = {
        sessionId,
        depth,
      };
      window.history.pushState(
        { ...window.history.state, mobileCategoriesDialog: marker },
        "",
        window.location.href,
      );
      historyDepthRef.current = depth;
      historyTrailsRef.current.set(depth, nextTrail);
      setTrail(nextTrail);
      return;
    }

    navigateAfterHistoryRestore(buildCategoryPath(parentSlugs, category));
  };

  return (
    <Dialog
      id={id}
      fullScreen
      open={open}
      onClose={closeAndRestoreHistory}
      aria-labelledby={`${id}-title`}
      PaperProps={{
        style: {
          margin: 0,
          width: "100%",
          maxWidth: "none",
          borderRadius: 0,
        },
        sx: {
          m: 0,
          width: "100%",
          maxWidth: "none",
          height: "100dvh",
          maxHeight: "100dvh",
          borderRadius: 0,
          overscrollBehavior: "contain",
          bgcolor: "background.default",
        },
      }}
    >
      <Box
        sx={{
          position: "sticky",
          top: 0,
          zIndex: 2,
          display: "flex",
          alignItems: "center",
          gap: 1,
          px: { xs: 1, sm: 2 },
          pt: "max(8px, env(safe-area-inset-top))",
          pb: 1,
          bgcolor: (theme) => alpha(theme.palette.background.paper, 0.96),
          borderBottom: 1,
          borderColor: "divider",
          backdropFilter: "blur(12px)",
        }}
      >
        <IconButton
          onClick={handleBack}
          aria-label={trail.length > 0 ? "Назад к предыдущему уровню" : "Закрыть категории"}
          sx={{ width: 44, height: 44, flexShrink: 0 }}
        >
          {trail.length > 0 ? <ArrowBackIcon /> : <CloseIcon />}
        </IconButton>

        <Paper
          component="form"
          onSubmit={handleSubmit}
          elevation={0}
          sx={{
            position: "relative",
            display: "flex",
            alignItems: "center",
            flex: 1,
            minWidth: 0,
            height: 48,
            border: 1,
            borderColor: "divider",
            borderRadius: 2,
            bgcolor: "background.paper",
            "&:focus-within": {
              borderColor: "primary.main",
              boxShadow: (theme) =>
                `0 0 0 2px ${alpha(theme.palette.primary.main, 0.16)}`,
            },
          }}
        >
          <InputBase
            type="search"
            value={query}
            placeholder="Поиск товаров"
            onChange={handleQueryChange}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
            onKeyDown={handleSearchKeyDown}
            fullWidth
            inputProps={{
              "aria-label": "Поиск товаров",
              "aria-autocomplete": "list",
              "aria-controls": shouldShowSuggestions ? SUGGESTIONS_ID : undefined,
              "aria-expanded": shouldShowSuggestions,
              "aria-activedescendant":
                shouldShowSuggestions &&
                !suggestionsQuery.isFetching &&
                !suggestionsQuery.isError &&
                highlightedIndex >= 0 &&
                highlightedIndex < suggestions.length
                  ? `${SUGGESTIONS_ID}-option-${highlightedIndex}`
                  : undefined,
              autoComplete: "off",
              enterKeyHint: "search",
              role: "combobox",
            }}
            sx={{
              minWidth: 0,
              pl: 1.5,
              fontSize: "1rem",
              "& .MuiInputBase-input": { py: 1.25 },
            }}
            endAdornment={
              <InputAdornment position="end">
                {suggestionsQuery.isFetching && normalizedQuery.length >= 2 && (
                  <CircularProgress size={18} />
                )}
                {query && (
                  <IconButton
                    type="button"
                    aria-label="Очистить поиск"
                    onClick={() => {
                      setQuery("");
                      setDebouncedQuery("");
                      setHighlightedIndex(-1);
                    }}
                    sx={{ width: 44, height: 44 }}
                  >
                    <CloseIcon fontSize="small" />
                  </IconButton>
                )}
                <IconButton
                  type="submit"
                  aria-label="Найти товары"
                  disabled={!normalizedQuery}
                  sx={{ width: 44, height: 44 }}
                >
                  <SearchIcon />
                </IconButton>
              </InputAdornment>
            }
          />

          {shouldShowSuggestions && (
            <Paper
              id={SUGGESTIONS_ID}
              role="listbox"
              onMouseDown={(event) => event.preventDefault()}
              elevation={8}
              sx={{
                position: "absolute",
                top: "calc(100% + 6px)",
                left: 0,
                right: 0,
                zIndex: 3,
                maxHeight: 280,
                overflowY: "auto",
                border: 1,
                borderColor: "divider",
                borderRadius: 2,
              }}
            >
              {suggestionsQuery.isError ? (
                <Typography color="text.secondary" variant="body2" sx={{ p: 2 }}>
                  Не удалось загрузить подсказки
                </Typography>
              ) : suggestionsQuery.isFetching ? (
                <Box sx={{ display: "flex", justifyContent: "center", p: 2 }}>
                  <CircularProgress size={24} />
                </Box>
              ) : suggestions.length === 0 ? (
                <Typography color="text.secondary" variant="body2" sx={{ p: 2 }}>
                  Подсказок не найдено
                </Typography>
              ) : (
                <List disablePadding>
                  {suggestions.map((suggestion, index) => (
                    <ListItemButton
                      key={`${suggestion}-${index}`}
                      id={`${SUGGESTIONS_ID}-option-${index}`}
                      role="option"
                      tabIndex={-1}
                      aria-selected={highlightedIndex === index}
                      selected={highlightedIndex === index}
                      onMouseEnter={() => setHighlightedIndex(index)}
                      onClick={() => handleSearch(suggestion)}
                      sx={{ minHeight: 48 }}
                    >
                      <ListItemText primary={suggestion} />
                    </ListItemButton>
                  ))}
                </List>
              )}
            </Paper>
          )}
        </Paper>
      </Box>

      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          overscrollBehavior: "contain",
          px: { xs: 1.5, sm: 3 },
          pt: 2,
          pb: "max(24px, env(safe-area-inset-bottom))",
        }}
      >
        <Typography
          id={`${id}-title`}
          component="h2"
          variant="h6"
          sx={{ px: 1, pb: 1.5, fontWeight: 700 }}
        >
          {currentLevel?.category.name ?? "Категории"}
        </Typography>
        <Divider />

        {isCategoriesLoading && (
          <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
            <CircularProgress aria-label="Загрузка категорий" />
          </Box>
        )}

        {isCategoriesError && !isCategoriesLoading && (
          <Box sx={{ py: 2 }}>
            <Alert
              severity="error"
              action={
                <Button color="inherit" onClick={() => void refetchCategories()}>
                  Повторить
                </Button>
              }
            >
              {categoriesError instanceof Error
                ? categoriesError.message
                : "Не удалось загрузить категории"}
            </Alert>
          </Box>
        )}

        {!isCategoriesLoading && !isCategoriesError && visibleCategories.length === 0 && (
          <Box sx={{ py: 8, textAlign: "center" }}>
            <CategoryIcon sx={{ mb: 1, fontSize: 40, color: "text.disabled" }} />
            <Typography color="text.secondary">Категории не найдены</Typography>
          </Box>
        )}

        {!isCategoriesLoading && !isCategoriesError && visibleCategories.length > 0 && (
          <List disablePadding sx={{ pt: 1 }}>
            {visibleCategories.map((category) => {
              const Icon = getCategoryIcon(category.name);

              return (
                <ListItemButton
                  key={category.id}
                  onClick={() => handleCategoryClick(category)}
                  sx={{ minHeight: 56, borderRadius: 2, px: 1.5 }}
                >
                  <ListItemIcon sx={{ minWidth: 42, color: "primary.main" }}>
                    <Icon />
                  </ListItemIcon>
                  <ListItemText
                    primary={category.name}
                    primaryTypographyProps={{ fontWeight: 600 }}
                  />
                  <ChevronRightIcon color="action" />
                </ListItemButton>
              );
            })}
          </List>
        )}
      </Box>
    </Dialog>
  );
};

export const MobileCategoriesDialog = (props: MobileCategoriesDialogProps) => {
  const router = useRouter();

  return (
    <Suspense fallback={null}>
      <MobileCategoriesDialogContent
        {...props}
        onNavigate={(href) => router.push(href)}
      />
    </Suspense>
  );
};
