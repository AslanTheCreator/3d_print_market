import Container from "@mui/material/Container";
import CurrentAuctionsSection from "@/widgets/CurrentAuctionsSection";

export default function Home() {
  return (
    <div style={{ backgroundColor: "#f2f6f9" }}>
      <Container
        maxWidth={"sm"}
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
