// Форма оставления отзыва
export interface LeaveReviewFormData {
  rating: number;
  comment: string;
}

// Константы валидации
export const REVIEW_VALIDATION = {
  RATING_MIN: 1,
  RATING_MAX: 5,
  COMMENT_MAX_LENGTH: 500,
} as const;

// Правила валидации для react-hook-form
export const REVIEW_FORM_RULES = {
  rating: {
    required: "Поставьте оценку",
    min: {
      value: REVIEW_VALIDATION.RATING_MIN,
      message: "Минимальная оценка — 1",
    },
    max: {
      value: REVIEW_VALIDATION.RATING_MAX,
      message: "Максимальная оценка — 5",
    },
    validate: (rating: number) => Number.isInteger(rating) || "Выберите целую оценку",
  },
  comment: {
    maxLength: {
      value: REVIEW_VALIDATION.COMMENT_MAX_LENGTH,
      message: `Максимум ${REVIEW_VALIDATION.COMMENT_MAX_LENGTH} символов`,
    },
  },
} as const;
