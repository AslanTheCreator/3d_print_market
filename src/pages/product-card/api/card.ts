import axios from "axios";

export const fetchCards = async () => {
  const API_URL = "http://localhost:8081/product/1";

  try {
    const response = await axios.get(API_URL);
    return response.data;
  } catch (err) {
    if (axios.isAxiosError(err)) {
      throw new Error(
        `Ошибка запроса: ${err.response?.status} - ${err.message}`
      );
    } else {
      throw new Error("Неизвестная ошибка");
    }
  }
};
