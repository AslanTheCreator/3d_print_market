import { CartContent } from "@/widgets/cart-content";
import { Container } from "@mui/material";

export default function CartPage() {
  return (
    <Container sx={{ pt: "20px" }}>
      <CartContent />
    </Container>
  );
}
