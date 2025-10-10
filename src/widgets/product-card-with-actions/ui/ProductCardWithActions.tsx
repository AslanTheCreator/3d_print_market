import { ProductCard, ProductCardModel } from "@/entities/product";
import { FavoriteButton } from "@/features/toggle-favorite";
import { useRouter } from "next/navigation";
import { Box } from "@mui/material";
import { AddToCartButton } from "@/features/cart";
import { useFavoritesChecks } from "@/entities/favorites/hooks";

export const ProductCardWithActions: React.FC<{
  product: ProductCardModel;
}> = ({ product }) => {
  const router = useRouter();
  const { isProductInFavorites: isFavorite } = useFavoritesChecks();

  return (
    <Box sx={{ position: "relative" }}>
      <ProductCard
        {...product}
        onCardClick={() => router.push(`/catalog/${product.id}/detail`)}
        actions={
          <AddToCartButton
            productId={product.id}
            availability={product.availability}
            productName={product.name}
          />
        }
      />
      <FavoriteButton
        productId={product.id}
        isFavorite={isFavorite(product.id)}
        productName={product.name}
      />
    </Box>
  );
};
