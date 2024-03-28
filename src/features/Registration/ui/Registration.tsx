import Link from "next/link";
import Box from "@mui/material/Box";
import AccountBoxIcon from "@mui/icons-material/AccountBox";
import Typography from "@mui/material/Typography";

export default function Registration() {
  return (
    <Link href={"/Registration"}>
      <Box display={"flex"} flexDirection={"column"} alignItems={"center"}>
        <AccountBoxIcon color={"warning"} fontSize={"medium"} />
        <Typography
          fontSize={"14px"}
          lineHeight={"18px"}
          mt={"1px"}
          color={"white"}
        >
          Войти
        </Typography>
      </Box>
    </Link>
  );
}
