import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import PopularCategories from "@/widgets/PopularCategories";
import CurrentAuctionsSection from "@/widgets/CurrentAuctionsSection";

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
        {/* <PopularCategories /> */}
        <CurrentAuctionsSection />
      </Container>
    </div>
  );
}
