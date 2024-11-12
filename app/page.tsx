import ProductCardList from "@/entities/Card/ui/ProductCardList";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";

export default function Home() {
  return (
    <Container sx={{ marginTop: "10px" }}>
      <Typography component={"h2"} variant="h2">
        Текущие аукционы
      </Typography>
      <Box pt={"20px"}>
        <ProductCardList />
      </Box>
    </Container>
  );
}
