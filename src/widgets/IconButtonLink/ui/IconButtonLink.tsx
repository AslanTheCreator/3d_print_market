import React from "react";
import Box from "@mui/material/Box";
import NavLink from "@/shared/ui/NavLink";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import ShoppingCartOutlinedIcon from "@mui/icons-material/ShoppingCartOutlined";
import Stack from "@mui/material/Stack";

const iconLinks = [
  {
    url: "login",
    icon: <PersonOutlineIcon fontSize={"large"} color="primary" />,
  },
  {
    url: "cart",
    icon: <ShoppingCartOutlinedIcon fontSize={"large"} color="primary" />,
  },
];

const IconButtonLink = () => {
  return (
    <Stack direction={"row"} gap={2} alignItems={"center"}>
      {iconLinks.map((iconlink, id) => (
        <NavLink key={id} url={iconlink.url} childComponent={iconlink.icon} />
      ))}
    </Stack>
  );
};

export default IconButtonLink;
