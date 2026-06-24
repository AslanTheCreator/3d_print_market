"use client";

import { useQueryClient } from "@tanstack/react-query";
import { productKeys } from "@/entities/product";
import { useCreateReview } from "@/entities/review";
import { useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { LeaveReviewFormData } from "./types";
import { orderQueryKeys } from "@/entities/order";

type DialogState = "form" | "success";

interface UseLeaveReviewOptions {
  orderId: number;
  onSuccess?: () => void;
}

export const useLeaveReview = ({
  orderId,
  onSuccess,
}: UseLeaveReviewOptions) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogState, setDialogState] = useState<DialogState>("form");
  const createReviewMutation = useCreateReview();
  const queryClient = useQueryClient();

  const form = useForm<LeaveReviewFormData>({
    mode: "onChange",
    defaultValues: {
      rating: 0,
      comment: "",
    },
  });

  const openDialog = useCallback(() => {
    setDialogState("form");
    setIsDialogOpen(true);
  }, []);

  const closeDialog = useCallback(() => {
    setIsDialogOpen(false);
    // Сбрасываем состояние после анимации закрытия
    setTimeout(() => {
      setDialogState("form");
      form.reset();
      createReviewMutation.reset();
    }, 300);
  }, [form, createReviewMutation]);

  const handleSubmit = form.handleSubmit((data) => {
    createReviewMutation.mutate(
      {
        orderId,
        rating: data.rating,
        comment: data.comment.trim(),
      },
      {
        onSuccess: () => {
          // Инвалидация смежных entities — ответственность feature
          queryClient.invalidateQueries({ queryKey: productKeys.details() });
          queryClient.invalidateQueries({ queryKey: productKeys.lists() });
          queryClient.invalidateQueries({
            queryKey: orderQueryKeys.customerOrders(),
          });

          setDialogState("success");
          onSuccess?.();
        },
      },
    );
  });

  return {
    // Состояние диалога
    isDialogOpen,
    dialogState,
    openDialog,
    closeDialog,

    // Форма (react-hook-form)
    form,

    // Отправка
    handleSubmit,
    isPending: createReviewMutation.isPending,
    isError: createReviewMutation.isError,
    error: createReviewMutation.error,
  };
};
