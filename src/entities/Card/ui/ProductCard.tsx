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
        <Typography mb={"4px"} mt={"12px"} fontWeight={700}>
          {name}
        </Typography>
        <Typography>{series}</Typography>
        <Stack
          direction={"row"}
          justifyContent={"space-between"}
          alignItems={"center"}
        >
          <Typography>{price} P</Typography>

          <ButtonStyled variant="outlined">Предзаказ</ButtonStyled>
        </Stack>
      </Box>
    </Link>
  );
};

export default ProductCard;
