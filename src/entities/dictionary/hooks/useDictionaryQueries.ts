import {
  useQueries,
  useQuery,
  useQueryClient,
  UseQueryResult,
} from "@tanstack/react-query";
import { dictionaryApi } from "../api/dictionaryApi";
import { DictionaryItem, DictionaryType } from "../model/types";

// Ключи для кэширования запросов
export const dictionaryKeys = {
  all: ["dictionary"] as const,
  byType: (type: DictionaryType) => ["dictionary", type] as const,
};

// Основной хук для получения словаря по типу
export const useDictionary = (
  type: DictionaryType
): UseQueryResult<DictionaryItem[], Error> => {
  return useQuery({
    queryKey: dictionaryKeys.byType(type),
    queryFn: () => dictionaryApi.getDictionary(type),
    staleTime: 1000 * 60 * 5, // 5 минут - словари редко меняются
    gcTime: 1000 * 60 * 30, // 30 минут в кэше (раньше cacheTime)
    retry: 2, // Повторить 2 раза при ошибке
    refetchOnWindowFocus: false, // Не перезапрашивать при фокусе окна
  });
};

// Хук для предзагрузки словаря (например, при ховере на кнопку)
export const usePrefetchDictionary = () => {
  const queryClient = useQueryClient();

  return (type: DictionaryType) => {
    queryClient.prefetchQuery({
      queryKey: dictionaryKeys.byType(type),
      queryFn: () => dictionaryApi.getDictionary(type),
      staleTime: 1000 * 60 * 5,
    });
  };
};

// Хук для получения сразу нескольких словарей
export const useMultipleDictionaries = (types: DictionaryType[]) => {
  const queries = types.map((type) => ({
    queryKey: dictionaryKeys.byType(type),
    queryFn: () => dictionaryApi.getDictionary(type),
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
  }));

  return useQueries({ queries });
};
