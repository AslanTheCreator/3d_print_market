import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import Box from "@mui/material/Box";
import CategoryCard from "@/features/CategoryCard";

function PopularCategories() {
  return (
    <Box p={"20px 0 28px 0"} component={"section"}>
      <Typography variant={"h2"}>Посмотрите популярные категории</Typography>
      <Stack direction={"row"} gap={"20px"} pt={"20px"}>
        <CategoryCard title="Warhammer 40.000" />
        <CategoryCard title="Malifaux" />
      </Stack>
    </Box>
  );
}

export default PopularCategories;
