import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Image from "next/image";
import img from "../../../shared/assets/img-20240319-170130_0.60554391.webp";
import Link from "next/link";
import Stack from "@mui/material/Stack";

const ProductCard = () => {
  return (
    <Box border={"solid 1px #d2d2d2"} borderRadius={"6px"}>
      <Stack flexDirection={"row"}>
        <Image width={520} height={382} alt="Домики" src={img} />
        <Stack width={"100%"}>
          <Typography height={"80%"} color={"purple"}>
            Lorem ipsum dolor sit amet consectetur adipisicing elit. Quam
            consequuntur ratione nulla totam maxime. Repellat dolore obcaecati
            officiis cumque! Quasi, eius veritatis. Labore, quos placeat at
            fugiat hic sit molestiae?
          </Typography>
          <Stack
            flexDirection={"row"}
            alignItems={"center"}
            height={"20%"}
            borderTop={"solid 1px #d2d2d2"}
          >
            <Link href={""}>Malifaux</Link>
            <Link href={""}>Chaos Warriors</Link>
            <Link href={""}></Link>
            <Typography component={"div"}>6000</Typography>
          </Stack>
        </Stack>
      </Stack>
    </Box>
  );
};

export default ProductCard;
