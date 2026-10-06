import { useCallback } from "react";
import { useMutation, type UseMutationOptions, type MutateOptions, type DefaultError } from "@tanstack/react-query";
import { usePrivateScope } from "./privateScope";

export function usePrivateMutation<TData = unknown, TError = DefaultError, TVariables = void, TContext = unknown>(
  options: UseMutationOptions<TData, TError, TVariables, TContext>,
) {
  const scope = usePrivateScope();
  const mutation = useMutation<TData, TError, TVariables, TContext>({
    ...options,
    mutationFn: async (...args) => {
      if (!scope.isCurrent()) throw new Error("Session ended");
      const result = await options.mutationFn!(...args);
      if (!scope.isCurrent()) throw new Error("Session ended");
      return result;
    },
    onMutate: options.onMutate ? (...args) => {
      if (!scope.isCurrent()) throw new Error("Session ended");
      return options.onMutate!(...args);
    } : undefined,
    onSuccess: (...args) => scope.isCurrent() ? options.onSuccess?.(...args) : undefined,
    onError: (...args) => scope.isCurrent() ? options.onError?.(...args) : undefined,
    onSettled: (...args) => scope.isCurrent() ? options.onSettled?.(...args) : undefined,
  });

  const guardCallbacks = useCallback((callbacks?: MutateOptions<TData, TError, TVariables, TContext>): MutateOptions<TData, TError, TVariables, TContext> => ({
    onSuccess: (...args) => { if (scope.isCurrent()) callbacks?.onSuccess?.(...args); },
    onError: (...args) => { if (scope.isCurrent()) callbacks?.onError?.(...args); },
    onSettled: (...args) => { if (scope.isCurrent()) callbacks?.onSettled?.(...args); },
  }), [scope]);
  const { mutate, mutateAsync } = mutation;
  const scopedMutate = useCallback((variables: TVariables, callbacks?: MutateOptions<TData, TError, TVariables, TContext>) =>
    mutate(variables, guardCallbacks(callbacks)), [mutate, guardCallbacks]);
  const scopedMutateAsync = useCallback((variables: TVariables, callbacks?: MutateOptions<TData, TError, TVariables, TContext>) =>
    mutateAsync(variables, guardCallbacks(callbacks)), [mutateAsync, guardCallbacks]);
  return { ...mutation, mutate: scopedMutate, mutateAsync: scopedMutateAsync };
}
