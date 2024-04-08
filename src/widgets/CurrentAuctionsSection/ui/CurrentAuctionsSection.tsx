import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import Box from "@mui/material/Box";
import ProductCard from "@/features/ProductCard/ui/ProductCard";

const CurrentAuctionsSection = () => {
  return (
    <Box component={"section"}>
      <Typography variant={"h2"}>Текущие аукционы</Typography>
      <Stack direction={"row"} gap={"20px"}>
        <ProductCard />
      </Stack>
    </Box>
  );
};

export default CurrentAuctionsSection;
