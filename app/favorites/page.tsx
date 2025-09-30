import { FavoriteProductCatalog } from "@/widgets/favorite-product-catalog";
import { Container } from "@mui/material";

export default function FavoritesPage() {
  return (
    <Container sx={{ pt: "20px" }}>
      <FavoriteProductCatalog />
    </Container>
  );
}
