import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import Box from "@mui/material/Box";
import ProductCard from "@/features/ProductCard/ui/ProductCard";

const CurrentAuctionsSection = () => {
  return (
    <Box component={"section"} p={"20px 0 28px 0"}>
      <Typography variant={"h2"}>Текущие аукционы</Typography>
      <Stack paddingTop={"20px"} gap={"25px"}>
        <ProductCard />
        <ProductCard />
      </Stack>
    </Box>
  );
};

export default CurrentAuctionsSection;
