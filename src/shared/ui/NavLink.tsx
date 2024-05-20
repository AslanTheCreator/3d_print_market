import Link from "next/link";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

interface INavLinkProps {
  text?: string;
  url: string;
  childComponent: React.ReactNode;
}

const NavLink: React.FC<INavLinkProps> = ({ text, url, childComponent }) => {
  return (
    <Link href={`/${url}`}>
      <Box display={"flex"} flexDirection={"column"} alignItems={"center"}>
        {childComponent}
        <Typography
          fontSize={"14px"}
          lineHeight={"18px"}
          mt={"1px"}
          color={"white"}
        >
          {text}
        </Typography>
      </Box>
    </Link>
  );
};

export default NavLink;
