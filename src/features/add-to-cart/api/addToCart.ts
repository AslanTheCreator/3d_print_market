import config from "@/shared/config/api";
import axios from "axios";

export const addToCart = async (
  authToken: string,
  productId: number
): Promise<void> => {
  if (!authToken || !productId) {
    throw new Error("addToCart: authToken or productId is null or undefined");
  }

  try {
    const response = await axios.post(
      `${config.apiBaseUrl}/basket?productId=${productId}`,
      {},
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
      }
    );

    if (response.status !== 200) {
      throw new Error(
        `addToCart: Unable to add product to cart, status: ${response.status}`
      );
    }
  } catch (error) {
    throw error;
  }
};
