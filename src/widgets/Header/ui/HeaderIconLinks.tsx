import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import ShoppingCartOutlinedIcon from "@mui/icons-material/ShoppingCartOutlined";
import Stack from "@mui/material/Stack";
import Link from "next/link";

const headerIcons = [
  {
    url: "/auth/login",
    icon: <PersonOutlineIcon fontSize={"large"} color="primary" />,
  },
  {
    url: "/cart",
    icon: <ShoppingCartOutlinedIcon fontSize={"large"} color="primary" />,
  },
];

export const HeaderIconLinks = () => {
  return (
    <Stack direction={"row"} gap={2} alignItems={"center"}>
      {headerIcons.map((item, id) => (
        <Link href={item.url} key={id}>
          {item.icon}
        </Link>
      ))}
    </Stack>
  );
};
