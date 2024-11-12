import { Typography, Breadcrumbs, Box } from "@mui/material";
import Link from "next/link";
import { ProductGallery } from "@/entities/Card/ui/ProductGallery";
import { AuctionInfo } from "@/widgets/AuctionInfo/ui/AuctionInfo";
import { ProductAccordion } from "@/widgets/Card/ui/ProductAccordion";

export const ProductCardDetails = () => {
  return (
    <Box>
      <Breadcrumbs>
        <Link color="inherit" href="/">
          Каталог
        </Link>
        <Link color="inherit" href="/">
          Варгеймы
        </Link>
        <Typography sx={{ color: "text.primary" }}>Warhammer 40.000</Typography>
      </Breadcrumbs>
      <Typography component={"h2"} variant={"h3"}>
        Aragorn Lord of the Rings Diorama
      </Typography>
      <ProductGallery />
      <AuctionInfo />
      <ProductAccordion />
    </Box>
  );
};
