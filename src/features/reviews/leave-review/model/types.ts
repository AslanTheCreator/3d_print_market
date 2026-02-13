// Форма оставления отзыва
export interface LeaveReviewFormData {
  rating: number;
  comment: string;
}

// Константы валидации
export const REVIEW_VALIDATION = {
  RATING_MIN: 1,
  RATING_MAX: 5,
  COMMENT_MIN_LENGTH: 3,
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
  },
  comment: {
    required: "Напишите комментарий",
    minLength: {
      value: REVIEW_VALIDATION.COMMENT_MIN_LENGTH,
      message: `Минимум ${REVIEW_VALIDATION.COMMENT_MIN_LENGTH} символа`,
    },
    maxLength: {
      value: REVIEW_VALIDATION.COMMENT_MAX_LENGTH,
      message: `Максимум ${REVIEW_VALIDATION.COMMENT_MAX_LENGTH} символов`,
    },
  },
} as const;
