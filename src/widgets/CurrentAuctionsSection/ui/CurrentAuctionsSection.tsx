import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import ProductCardList from "@/entities/Card";

const CurrentAuctionsSection = () => {
  return (
    <Box component={"section"} p={"20px 0 28px 0"}>
      <Typography variant={"h2"}>Текущие аукционы</Typography>
      <ProductCardList />
    </Box>
  );
};

export default CurrentAuctionsSection;
