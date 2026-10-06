import { usePrivateScope } from "@/shared/lib/query";
import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { userKeys } from "@/entities/user";

export const useInvalidateSellerSettings = (): (() => Promise<void>) => {
  const scope = usePrivateScope();
  const queryClient = useQueryClient();

  return useCallback(
    () => queryClient.invalidateQueries({ queryKey: scope.key(userKeys.current()) }),
    [scope, queryClient],
  );
};
