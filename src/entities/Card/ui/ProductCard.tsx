import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Image from "next/image";
import Link from "next/link";
import Stack from "@mui/material/Stack";
import { ButtonStyled } from "@/shared/ui/Button";

interface IProductCard {
  id: number;
  name: string;
  series: string;
  author: string;
  price: number;
  imageUrl: string;
}

const ProductCard: React.FC<IProductCard> = ({
  id,
  name,
  author,
  price,
  imageUrl,
  series,
}) => {
  return (
    <Link href={`/catalog/card/${id}`}>
      <Box border={"solid 1px #d2d2d2"} borderRadius={"6px"}>
        <Image alt={name} src={imageUrl} width={286} height={208} />
        <Box p={"8px"}>
          <Typography fontSize={15}>{name}</Typography>
          <Typography fontSize={13} color={"#818181"}>
            {series}
          </Typography>
          <Stack
            direction={"row"}
            justifyContent={"space-between"}
            alignItems={"center"}
            mt={"10px"}
          >
            <Typography fontWeight={700}>{price}&#8381;</Typography>
            <ButtonStyled variant="contained">Предзаказ</ButtonStyled>
          </Stack>
        </Box>
      </Box>
    </Link>
  );
};

export default ProductCard;
