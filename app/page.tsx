import { Container } from "@mui/material";
import { HomeProductCatalog } from "@/widgets/home-product-catalog";

export default function HomePage() {
  return (
    <Container sx={{ pt: "20px" }}>
      <HomeProductCatalog />
    </Container>
  );
}
