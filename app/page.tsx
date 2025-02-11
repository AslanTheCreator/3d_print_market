import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import FeedPage from "@/pages/feed";

export default function Home() {
  return (
    <Container sx={{ paddingTop: "10px", backgroundColor: "#F1F1F1" }}>
      <Typography component={"h2"} variant="h2">
        Свежие предзаказы
      </Typography>
      <Box pt={"20px"}>
        <FeedPage />
      </Box>
    </Container>
  );
}
