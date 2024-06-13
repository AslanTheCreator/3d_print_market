import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Image from "next/image";
import img from "../../../shared/assets/img-20240319-170130_0.60554391.webp";
import Link from "next/link";
import Stack from "@mui/material/Stack";
import Button from "@mui/material/Button";

const ProductCard = () => {
  return (
    <Box border={"solid 1px #d2d2d2"} borderRadius={"6px"}>
      <Stack>
        <Image
          alt="Домики"
          src={img}
          style={{ width: "100%", height: "auto" }}
        />
        <Stack direction={"row"}>
          <Stack
            alignItems={"center"}
            borderRight={"solid 1px #d2d2d2"}
            width={"50%"}
          >
            <Button variant={"contained"}>Предзаказ</Button>
            <Typography component={"div"}>6000</Typography>
          </Stack>
          <Stack alignItems={"center"} justifyContent={"center"} width={"50%"}>
            <Link href={""}>Aslan</Link>
            <Stack>
              <Link href={""}>Название товара</Link>
            </Stack>
          </Stack>
        </Stack>
      </Stack>
    </Box>
  );
};

export default ProductCard;
