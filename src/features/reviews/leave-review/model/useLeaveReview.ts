"use client";

import { useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { useCreateReview } from "@/entities/reviews";
import { LeaveReviewFormData } from "./types";

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
