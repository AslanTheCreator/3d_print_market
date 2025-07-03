import { useIsFavorite } from "@/entities/favorites/hooks";
import { ProductCard, ProductCardModel } from "@/entities/product";
import { FavoriteButton } from "@/features/toggle-favorite/ui/FavoriteButton";
import { useRouter } from "next/navigation";
import { Box } from "@mui/material";
import { AddToCartButton } from "@/features/cart/add-to-cart/ui/AddToCartButton";

export const ProductCardWithActions: React.FC<{
  product: ProductCardModel;
}> = ({ product }) => {
  const router = useRouter();
  const isFavorite = useIsFavorite(product.id); // Теперь хук вызывается в компоненте

  return (
    <Box sx={{ position: "relative" }}>
      <ProductCard
        {...product}
        onCardClick={() => router.push(`/catalog/${product.id}/detail`)}
        actions={<AddToCartButton productId={product.id} />}
      />
      <FavoriteButton productId={product.id} isFavorite={isFavorite} />
    </Box>
  );
};
