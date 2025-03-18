import { useState, useEffect, useMemo } from "react";
import { useParams } from "next/navigation";
import { authenticate } from "@/shared/api/auth";
import { useAddToCart } from "@/features/add-to-cart/hooks/useAddToCart";
import { CardItem } from "../model/types";
import { fetchProductById } from "../api/service";

export const useProductDetails = () => {
  const params = useParams();
  const id = params?.id as string | undefined;
  const [productCard, setProductCard] = useState<CardItem | null>(null);

  useEffect(() => {
    const loadCard = async () => {
      try {
        if (id) {
          const data = await fetchProductById(id);
          setProductCard(data);
        }
      } catch (err) {
        console.error((err as Error).message);
      }
    };
    loadCard();
  }, [id]);

  const { mutate, isPending } = useAddToCart();

  const handleAddToCart = async () => {
    try {
      const token = await authenticate("user42", "stas");
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
