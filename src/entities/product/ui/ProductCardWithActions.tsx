import { useIsFavorite } from "@/entities/favorites/hooks";
import { ProductCard, ProductCardModel } from "@/entities/product";
import { FavoriteButton } from "@/features/toggle-favorite";
import { useRouter } from "next/navigation";
import { Box } from "@mui/material";
import { AddToCartButton } from "@/features/add-to-cart";

export const ProductCardWithActions: React.FC<{
  product: ProductCardModel;
}> = ({ product }) => {
  const router = useRouter();
  const isFavorite = useIsFavorite(product.id);

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
        isFavorite={isFavorite}
        productName={product.name}
      />
    </Box>
  );
};
