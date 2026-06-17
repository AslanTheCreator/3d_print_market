import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { userKeys } from "@/entities/user";

export const useInvalidateSellerSettings = (): (() => Promise<void>) => {
  const queryClient = useQueryClient();

  return useCallback(
    () => queryClient.invalidateQueries({ queryKey: userKeys.current() }),
    [queryClient],
  );
};
