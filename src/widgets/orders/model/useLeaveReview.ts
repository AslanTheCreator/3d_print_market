"use client";

import { usePrivateScope } from "@/shared/lib/query";
import { useQueryClient } from "@tanstack/react-query";
import { productKeys } from "@/entities/product";
import { useCreateReview } from "@/entities/review";
import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { LeaveReviewFormData } from "./types";
import { orderQueryKeys } from "@/entities/order";
import { useOrderDialogLifecycle } from "./useOrderDialogLifecycle";
import { useOrderActionsAvailable } from "./orderActionsContext";

type DialogState = "form" | "success";

interface UseLeaveReviewOptions {
  orderId: number;
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const useLeaveReview = ({
  orderId,
  open,
  onClose,
  onSuccess,
}: UseLeaveReviewOptions) => {
  const scope = usePrivateScope();
  const [dialogState, setDialogState] = useState<DialogState>("form");
  const lock = useRef(false);
  const [submitting, setSubmitting] = useState(false);
  const actionsAvailable = useOrderActionsAvailable();
  const canWrite = useRef(actionsAvailable);
  canWrite.current = actionsAvailable;
  const createReviewMutation = useCreateReview();
  const queryClient = useQueryClient();

  const form = useForm<LeaveReviewFormData>({
    mode: "onChange",
    defaultValues: {
      rating: 0,
      comment: "",
    },
  });

  const lifecycle = useOrderDialogLifecycle(open, () => {
    setDialogState("form");
    form.reset();
    if (!lock.current) createReviewMutation.reset();
  });
  const closeDialog = () => {
    if (lock.current || createReviewMutation.isPending) return;
    onClose();
  };

  const handleSubmit = form.handleSubmit(async (data) => {
    if (lock.current || !canWrite.current || !lifecycle.isCurrent(lifecycle.generation)) return;
    lock.current = true;
    setSubmitting(true);
    const generation = lifecycle.generation;
    try {
      await createReviewMutation.mutateAsync(
        {
          orderId,
          rating: data.rating,
          comment: data.comment.trim(),
        },
        {
          onSuccess: () => {
            if (!scope.isCurrent()) return;
            // Инвалидация смежных entities — ответственность feature
            queryClient.invalidateQueries({ queryKey: productKeys.details() });
            queryClient.invalidateQueries({ queryKey: productKeys.lists() });
            queryClient.invalidateQueries({
              queryKey: scope.key(orderQueryKeys.customerOrders()),
            });

            if (lifecycle.isCurrent(generation)) {
              setDialogState("success");
              onSuccess?.();
            }
          },
        },
      );
    } catch {
      // Mutation хранит ошибку для повторной отправки из открытой формы.
    } finally {
      lock.current = false;
      setSubmitting(false);
    }
  });

  return {
    // Состояние диалога
    isDialogOpen: open,
    dialogState,
    closeDialog,
    onExited: lifecycle.onExited,
    actionsAvailable,

    // Форма (react-hook-form)
    form,

    // Отправка
    handleSubmit,
    isPending: submitting || createReviewMutation.isPending,
    isError: createReviewMutation.isError,
    error: createReviewMutation.error,
  };
};
