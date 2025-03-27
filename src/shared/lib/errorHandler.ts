import axios, { AxiosError } from "axios";

export const errorHandler = {
  /**
   * Обрабатывает ошибки axios с базовой информацией
   * @param error - Ошибка от axios
   * @param customMessage - Пользовательское сообщение об ошибке
   * @returns Error
   */
  handleAxiosError(
    error: unknown,
    customMessage: string = "Произошла ошибка"
  ): Error {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      const errorMessage =
        axiosError.response?.data instanceof Object
          ? JSON.stringify(axiosError.response.data)
          : axiosError.message;

      console.error(`${customMessage}: ${errorMessage}`);

      return new Error(
        `${customMessage}. Статус: ${
          axiosError.response?.status || "Неизвестно"
        }`
      );
    }

    console.error(customMessage, error);
    return new Error(customMessage);
  },
};
