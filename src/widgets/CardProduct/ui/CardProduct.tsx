import Card from "@mui/material/Card";
import CardActions from "@mui/material/CardActions";
import CardContent from "@mui/material/CardContent";
import CardMedia from "@mui/material/CardMedia";
import Typography from "@mui/material/Typography";
import Image from "next/image";
import img from "../../../shared/assets/img-20240319-170130_0.60554391.webp";

export function CardProduct() {
  return (
    <Card>
      <Image width={520} height={382} alt="Домики" src={img} />
      <CardContent>
        <Typography>Домики Фэнтези</Typography>
        <Typography>250Ru</Typography>
      </CardContent>
    </Card>
  );
}
