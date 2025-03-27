import { useState, useEffect, useMemo } from "react";
import { useParams } from "next/navigation";
import { useAddToCart } from "@/features/add-to-cart/hooks/useAddToCart";
import { ProductDetailsModel } from "../model/types";
import { productApi } from "../api/productApi";
import { useAuth } from "@/features/auth/hooks/useAuth";

export const useProductDetails = () => {
  const params = useParams();
  const id = params?.id as string | undefined;
  const [productCard, setProductCard] = useState<ProductDetailsModel | null>(
    null
  );

  useEffect(() => {
    const loadCard = async () => {
      try {
        if (id) {
          const data = await productApi.getProductById(id);
          setProductCard(data);
        }
      } catch (err) {
        console.error((err as Error).message);
      }
    };
    loadCard();
  }, [id]);

  const { mutate, isPending } = useAddToCart();
  const { token, isLoading: authLoading } = useAuth();
  const handleAddToCart = async () => {
    try {
      mutate({ token, productId: Number(id) });
    } catch (error) {
      console.error("Ошибка при добавлении товара в корзину:", error);
      alert("Не удалось добавить товар в корзину.");
    }
  };

  const mainImage = useMemo(() => {
    return productCard?.image?.[0]
      ? `data:${productCard.image[0].contentType};base64,${productCard.image[0].imageData}`
      : undefined;
  }, [productCard]);

  const additionalImages = useMemo(() => {
    return (
      productCard?.image
        ?.slice(1)
        .map((img) => `data:${img.contentType};base64,${img.imageData}`) || []
    );
  }, [productCard]);

  return {
    productCard,
    handleAddToCart,
    mainImage,
    additionalImages,
    isPending,
  };
};
