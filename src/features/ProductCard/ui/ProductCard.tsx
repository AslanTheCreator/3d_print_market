import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Image from "next/image";
import img from "../../../shared/assets/img-20240319-170130_0.60554391.webp";
import Link from "next/link";

const ProductCard = () => {
  return (
    <Box>
      <Box>
        <Box>
          <Image width={520} height={382} alt="Домики" src={img} />
          <Box>
            <Link href={""}>Malifaux</Link>
            <Link href={""}>Chaos Warriors</Link>
            <Link href={""}></Link>
            <Typography component={"div"}>6000</Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default ProductCard;
