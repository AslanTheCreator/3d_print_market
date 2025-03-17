import { CardItem } from "@/entities/product";
import { Box, IconButton, Stack, Typography, Divider } from "@mui/material";
import Image from "next/image";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";

const CartItem: React.FC<CardItem> = ({ id, name, price, image, category }) => {
  return (
    <Box display="flex" flexDirection={"column"} pt={"16px"} pb={"8px"}>
      <Stack pb={"10px"} flexDirection={"row"}>
        <Box position="relative" width={100} height={100} flexShrink={0}>
          <Image
            //   src={`data:${image[0].contentType};base64,${image[0].imageData}`}
            src={""}
            alt={name}
            fill
            style={{ objectFit: "cover" }}
          />
        </Box>
        <Stack>
          <Typography variant="h6" fontWeight="bold">
            {name}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {category?.name}
          </Typography>
          <Typography variant="body1" color="primary">
            {price} рублей
          </Typography>
        </Stack>
      </Stack>
      <Divider />
      <Stack pt={"8px"} justifyContent="space-between" flexDirection="row">
        <IconButton sx={{ p: 1, bgcolor: "#ebebeb", borderRadius: "5px" }}>
          <DeleteIcon />
        </IconButton>
        <Box display="flex" alignItems="center" gap={1}>
          <IconButton
            sx={{ p: 1, bgcolor: "#ebebeb", borderRadius: "5px" }}
            color="primary"
          >
            <RemoveIcon />
          </IconButton>
          <Typography>{"1"}</Typography>
          <IconButton
            sx={{ p: 1, bgcolor: "#ebebeb", borderRadius: "5px" }}
            color="primary"
          >
            <AddIcon />
          </IconButton>
        </Box>
      </Stack>
    </Box>
  );
};

export default CartItem;
