import { HomeProductCatalog } from "@/widgets/home-product-catalog";
import { Container } from "@mui/material";

export default function HomePage() {
  return (
    <Container sx={{ pt: "20px" }}>
      <HomeProductCatalog />
    </Container>
  );
}
