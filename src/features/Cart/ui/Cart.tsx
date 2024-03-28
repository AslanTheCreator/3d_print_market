import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import Link from "next/link";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

export function Cart() {
  return (
    <Link href={"#"}>
      <Box display={"flex"} flexDirection={"column"} alignItems={"center"}>
        <ShoppingCartIcon color={"warning"} fontSize={"medium"} />
        <Typography
          fontSize={"14px"}
          lineHeight={"18px"}
          mt={"1px"}
          color={"white"}
        >
          Корзина
        </Typography>
      </Box>
    </Link>
  );
}
