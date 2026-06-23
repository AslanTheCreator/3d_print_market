import type { UserBaseModel } from "@/entities/user";

export interface ProfileTask {
  label: string;
  completed: boolean;
}

export const getProductWord = (count: number): string => {
  const lastTwoDigits = count % 100;

  if (lastTwoDigits >= 11 && lastTwoDigits <= 19) {
    return "товаров";
  }

  const lastDigit = count % 10;

  if (lastDigit === 1) {
    return "товар";
  }

  if (lastDigit >= 2 && lastDigit <= 4) {
    return "товара";
  }

  return "товаров";
};

export const getProfileTasks = (user: UserBaseModel): ProfileTask[] => [
  {
    label: "Добавьте фото профиля",
    completed: Boolean(user.imageId || user.image?.length),
  },
  {
    label: "Заполните имя профиля",
    completed: Boolean(user.fullName?.trim() || user.login?.trim()),
  },
  {
    label: "Укажите контактный телефон",
    completed: Boolean(user.phoneNumber?.trim()),
  },
  {
    label: "Добавьте способ оплаты",
    completed: user.accounts.length > 0,
  },
];

export const getProfileCompletion = (
  tasks: readonly ProfileTask[],
): number => {
  const completedTasks = tasks.filter((task) => task.completed).length;

  return Math.round((completedTasks / tasks.length) * 100);
};
