import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import FeedPage from "@/pages/feed";

export default function Home() {
  return (
    <Container sx={{ marginTop: "10px" }}>
      <Typography component={"h2"} variant="h2">
        Популярные объявления
      </Typography>
      <Box pt={"20px"}>
        <FeedPage />
      </Box>
    </Container>
  );
}
