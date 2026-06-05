"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import type { KeyboardEvent } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useProductNameSuggestions } from "@/entities/product";

const SEARCH_SUGGESTION_MIN_LENGTH = 2;
const SEARCH_SUGGESTION_DEBOUNCE_MS = 300;

interface UseSearchReturn {
  searchQuery: string;
  productNameSuggestions: string[];
  highlightedSuggestionIndex: number;
  isSuggestionsError: boolean;
  isSuggestionsLoading: boolean;
  isSuggestionsOpen: boolean;
  handleSearchChange: (value: string) => void;
  handleSearchSubmit: () => void;
  handleClearSearch: () => void;
  handleSearchFocus: () => void;
  handleSearchBlur: () => void;
  handleSearchKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  handleSuggestionMouseEnter: (index: number) => void;
  handleSuggestionSelect: (suggestion: string) => void;
}

export const useSearch = (): UseSearchReturn => {
  const router = useRouter();
  const pathname = usePathname();
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [highlightedSuggestionIndex, setHighlightedSuggestionIndex] =
    useState(-1);

  const normalizedSearchQuery = searchQuery.trim();
  const suggestionsQuery = useProductNameSuggestions(debouncedSearchQuery);
  const isCurrentSuggestionQuery =
    debouncedSearchQuery === normalizedSearchQuery;

  const productNameSuggestions = useMemo(() => {
    if (!isCurrentSuggestionQuery) {
      return [];
    }

    return suggestionsQuery.data ?? [];
  }, [isCurrentSuggestionQuery, suggestionsQuery.data]);

  const isSuggestionsLoading =
    isCurrentSuggestionQuery && suggestionsQuery.isFetching;
  const isSuggestionsError = isCurrentSuggestionQuery && suggestionsQuery.isError;
  const isSuggestionsOpen =
    isSearchFocused &&
    normalizedSearchQuery.length >= SEARCH_SUGGESTION_MIN_LENGTH &&
    isCurrentSuggestionQuery &&
    (isSuggestionsLoading ||
      isSuggestionsError ||
      productNameSuggestions.length > 0);

  useEffect(() => {
    setSearchQuery("");
    setDebouncedSearchQuery("");
    setIsSearchFocused(false);
    setHighlightedSuggestionIndex(-1);
  }, [pathname]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedSearchQuery(normalizedSearchQuery);
    }, SEARCH_SUGGESTION_DEBOUNCE_MS);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [normalizedSearchQuery]);

  useEffect(() => {
    setHighlightedSuggestionIndex(-1);
  }, [debouncedSearchQuery]);

  const submitSearch = useCallback(
    (value: string) => {
      const trimmedQuery = value.trim();

      if (!trimmedQuery) return;

      const encodedQuery = encodeURIComponent(trimmedQuery);
      router.push(`/catalog/search?query=${encodedQuery}`);
      setSearchQuery("");
      setDebouncedSearchQuery("");
      setIsSearchFocused(false);
      setHighlightedSuggestionIndex(-1);
    },
    [router],
  );

  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
    setIsSearchFocused(true);
    setHighlightedSuggestionIndex(-1);
  }, []);

  const handleSearchSubmit = useCallback(() => {
    submitSearch(searchQuery);
  }, [searchQuery, submitSearch]);

  const handleClearSearch = useCallback(() => {
    setSearchQuery("");
    setDebouncedSearchQuery("");
    setHighlightedSuggestionIndex(-1);
  }, []);

  const handleSearchFocus = useCallback(() => {
    setDebouncedSearchQuery(searchQuery.trim());
    setIsSearchFocused(true);
  }, [searchQuery]);

  const handleSearchBlur = useCallback(() => {
    setIsSearchFocused(false);
    setHighlightedSuggestionIndex(-1);
  }, []);

  const handleSuggestionSelect = useCallback(
    (suggestion: string) => {
      submitSearch(suggestion);
    },
    [submitSearch],
  );

  const handleSuggestionMouseEnter = useCallback((index: number) => {
    setHighlightedSuggestionIndex(index);
  }, []);

  const handleSearchKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Escape" && isSuggestionsOpen) {
        event.preventDefault();
        setIsSearchFocused(false);
        setHighlightedSuggestionIndex(-1);
        return;
      }

      if (!isSuggestionsOpen || productNameSuggestions.length === 0) {
        return;
      }

      if (event.key === "ArrowDown") {
        event.preventDefault();
        setHighlightedSuggestionIndex((currentIndex) =>
          currentIndex < productNameSuggestions.length - 1
            ? currentIndex + 1
            : 0,
        );
        return;
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        setHighlightedSuggestionIndex((currentIndex) =>
          currentIndex > 0
            ? currentIndex - 1
            : productNameSuggestions.length - 1,
        );
        return;
      }

      if (event.key === "Enter" && highlightedSuggestionIndex >= 0) {
        event.preventDefault();
        handleSuggestionSelect(
          productNameSuggestions[highlightedSuggestionIndex],
        );
      }
    },
    [
      handleSuggestionSelect,
      highlightedSuggestionIndex,
      isSuggestionsOpen,
      productNameSuggestions,
    ],
  );

  return {
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
  };
};
