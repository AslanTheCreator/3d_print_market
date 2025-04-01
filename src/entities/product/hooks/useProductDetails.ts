import { useState, useEffect, useMemo } from "react";
import { useParams } from "next/navigation";
import { ProductDetailsModel } from "../model/types";
import { productApi } from "../api/productApi";
import { useAddToCart } from "@/features/cart/add-to-cart/hooks/useAddToCart";

export const useProductDetails = () => {
  const params = useParams();
  const id = params?.id as string | undefined;
  const [productCard, setProductCard] = useState<ProductDetailsModel>(
    {} as ProductDetailsModel
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

  const { mutate } = useAddToCart();
  const handleAddToCart = async () => {
    mutate(
      { productId: productCard.id },
      {
        onSuccess: () => {
          console.log("Товар успешно добавлен в корзину");
        },
        onError: () => {
          alert("Не удалось добавить товар в корзину.");
        },
      }
    );
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
  };
};
