import { CardItem, CardResponse } from "@/entities/product";
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

export const fetchCartProducts = async (
  authToken: string
): Promise<CardItem[]> => {
  if (!authToken) {
    throw new Error("fetchCartProducts: authToken is null or undefined");
  }

  try {
    const response = await axios.post<CardResponse[]>(
      `${config.apiBaseUrl}/basket/find`,
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
        `fetchCartProducts: Unable to fetch products from cart, status: ${response.status}`
      );
    }

    return response.data[0].content;
  } catch (error) {
    throw error;
  }
};
