import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Image from "next/image";
import Link from "next/link";
import Stack from "@mui/material/Stack";
import Button from "@mui/material/Button";
import { ButtonStyled } from "@/shared/ui/Buttons";

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
    <Link href={`/product/${id}`}>
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
        {/* <Stack direction={"row"}>
          <Stack
            alignItems={"center"}
            borderRight={"solid 1px #d2d2d2"}
            width={"50%"}
          >
            <ButtonStyled variant="outlined">Предзаказ</ButtonStyled>
            <Typography component={"div"}>{price}</Typography>
          </Stack>
          <Stack alignItems={"center"} justifyContent={"center"} width={"50%"}>
            <Link href={""}>{author}</Link>
            <Stack>
              <Link href={""}>{name}</Link>
            </Stack>
          </Stack>
        </Stack> */}
      </Box>
    </Link>
  );
};

export default ProductCard;
