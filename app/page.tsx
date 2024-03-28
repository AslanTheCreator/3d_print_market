import { CardProduct } from "@/widgets/CardProduct";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import PopularCategories from "@/widgets/PopularCategories";

export default function Home() {
  return (
    <div style={{ backgroundColor: "#f2f6f9" }}>
      <Container
        maxWidth={"lg"}
        style={{
          backgroundColor: "#fff",
          borderRadius: "32px",
        }}
        component={"main"}
      >
        <PopularCategories />
        <Typography variant={"h2"}>Текущие аукционы</Typography>
        <Stack direction={"row"} gap={"20px"}>
          <CardProduct />
          <CardProduct />
          <CardProduct />
          <CardProduct />
        </Stack>
      </Container>
    </div>
  );
}
