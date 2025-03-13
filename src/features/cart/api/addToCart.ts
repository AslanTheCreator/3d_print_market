import { CardItem, CardResponse } from "@/entities/product";
import config from "@/shared/config/api";
import axios from "axios";

export const addToCart = async (token: string, productId: number) => {
  if (!token || !productId) {
    throw new Error("addToCart: Token or productId is null or undefined");
  }

  try {
    const response = await axios.post(
      `${config.apiBaseUrl}/basket?productId=${productId}`,
      {},
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (response.status !== 200) {
      throw new Error(
        `addToCart: Unable to add product to cart, status: ${response.status}`
      );
    }
  } catch (error) {
    console.error("addToCart: Error occurred while adding to cart", error);
    throw error;
  }
};

export const fetchProductsCart = async (token: string): Promise<CardItem[]> => {
  if (!token) {
    throw new Error("fetchProductsCart: Token is null or undefined");
  }

  try {
    const response = await axios.get<CardResponse>(
      `${config.apiBaseUrl}/basket/find`,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (response.status !== 200) {
      throw new Error(
        `fetchProductsCart: Unable to fetch products from cart, status: ${response.status}`
      );
    }

    return response.data.content;
  } catch (error) {
    console.error(
      "fetchProductsCart: Error occurred while fetching cart",
      error
    );
    throw error;
  }
};
