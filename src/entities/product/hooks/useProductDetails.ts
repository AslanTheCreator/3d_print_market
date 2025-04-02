import { useState, useEffect, useMemo } from "react";
import { useParams } from "next/navigation";
import { ProductDetailsModel } from "../model/types";
import { productApi } from "../api/productApi";
import { useAddToCart } from "@/features/cart/add-to-cart/hooks/useAddToCart";
import { useCartProducts } from "@/entities/cart";
import { useRouter } from "next/navigation";

export const useProductDetails = () => {
  const params = useParams();
  const id = params?.id as string | undefined;
  const [productCard, setProductCard] = useState<ProductDetailsModel>(
    {} as ProductDetailsModel
  );
  const router = useRouter();

  const { data: cartItems } = useCartProducts({});

  const isInCart = cartItems?.some((item) => item.id === productCard.id);

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
    if (isInCart) router.push("/cart");
    else {
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
    isInCart,
  };
};
