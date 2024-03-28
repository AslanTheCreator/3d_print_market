import Image from "next/image";
import Link from "next/link";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import img from "../../../shared/assets/cat1.webp";

interface ICategoryCard {
  title: string;
}

const CategoryCard: React.FC<ICategoryCard> = ({ title }) => {
  return (
    <Box height={"250px"} position={"relative"}>
      <Link
        href={"/"}
        style={{
          transition: "all 0.3s ease",
          display: "block",
        }}
      >
        <Image
          alt="Карточка категории"
          src={img}
          style={{ borderRadius: "4px", width: "100%" }}
        />
        <Box
          bgcolor={"rgba(28, 28, 30, 0.8)"}
          borderRadius={"0 0 4px 4px"}
          position={"absolute"}
          p={"0 20px 0 20px"}
          left={0}
          right={0}
          bottom={0}
          sx={{
            ":hover": { background: "rgba(251, 57, 57, 0.9)" },
            transition: "all 0.3s ease",
          }}
        >
          <Box height={"70px"} display={"flex"} alignItems={"center"}>
            <Typography variant={"subtitle1"} component={"div"} color={"white"}>
              {title}
            </Typography>
          </Box>
        </Box>
      </Link>
    </Box>
  );
};

export default CategoryCard;
