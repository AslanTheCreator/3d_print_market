import { FavoritesWidget } from "@/widgets/favorites/ui/FavoritesWidget";
import { Container } from "@mui/material";

export default function FavoritesPage() {
  return (
    <Container sx={{ pt: "20px" }}>
      <FavoritesWidget />
    </Container>
  );
}
