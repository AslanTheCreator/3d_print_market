"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";

interface UseSearchReturn {
  searchQuery: string;
  handleSearchChange: (value: string) => void;
  handleSearchSubmit: () => void;
  handleClearSearch: () => void;
}

export const useSearch = (): UseSearchReturn => {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
  }, []);

  const handleSearchSubmit = useCallback(() => {
    const trimmedQuery = searchQuery.trim();

    if (!trimmedQuery) return;

    const encodedQuery = encodeURIComponent(trimmedQuery);
    router.push(`/catalog/search?query=${encodedQuery}`);
    setSearchQuery("");
  }, [searchQuery, router]);

  const handleClearSearch = useCallback(() => {
    setSearchQuery("");
  }, []);

  return {
    searchQuery,
    handleSearchChange,
    handleSearchSubmit,
    handleClearSearch,
  };
};
