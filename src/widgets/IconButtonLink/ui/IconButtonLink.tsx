import React from "react";
import Box from "@mui/material/Box";
import NavLink from "@/shared/ui/NavLink";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import ShoppingCartOutlinedIcon from "@mui/icons-material/ShoppingCartOutlined";
import Stack from "@mui/material/Stack";

const iconLinks = [
  {
    url: "",
    icon: <PersonOutlineIcon color={"secondary"} fontSize={"large"} />,
  },
  {
    url: "",
    icon: <ShoppingCartOutlinedIcon fontSize={"large"} color={"secondary"} />,
  },
];

const IconButtonLink = () => {
  return (
    <Stack direction={"row"}>
      {iconLinks.map((iconlink, id) => (
        <NavLink key={id} url={iconlink.url} childComponent={iconlink.icon} />
      ))}
    </Stack>
  );
};

export default IconButtonLink;
