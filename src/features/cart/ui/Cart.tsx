import { ButtonStyled } from "@/shared/ui/Button";
import {
  Box,
  Button,
  Container,
  IconButton,
  Stack,
  Typography,
} from "@mui/material";
import { useRouter } from "next/navigation";
import Image from "next/image";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import { useState } from "react";
import { CardItem } from "@/entities/product";

const Cart = () => {
  const [cart, setCart] = useState<CardItem[]>([]);
  const router = useRouter();

  return (
    <Container sx={{ marginTop: "10px" }}>
      {/* <Box
        display={"flex"}
        flexDirection={"column"}
        alignItems={"flex-start"}
        gap={"10px"}
      >
        <Typography component={"h2"} fontSize={32} fontWeight={900}>
          Корзина пуста
        </Typography>
        <Typography component={"span"} fontSize={14} fontWeight={400}>
          Воспользуйтесь поиском, чтобы найти всё, что нужно. Если в Корзине
          были товары, войдите, чтобы посмотреть список
        </Typography>
        <ButtonStyled variant="contained" onClick={() => router.push("/login")}>
          Войти
        </ButtonStyled>
      </Box> */}
      <Box>
        <Box display={"flex"} pb={"10px"} gap={"10px"}>
          <Box position="relative" width={100} height={100} flexShrink={0}>
            <Image src={""} alt={""} fill style={{ objectFit: "cover" }} />
          </Box>
          <Stack>
            <Typography variant="h6" fontWeight="bold">
              Название товара
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Категория
            </Typography>
            <Typography variant="body1" color="primary">
              1000 рублей
            </Typography>
          </Stack>
        </Box>
        <Stack justifyContent={"space-between"} flexDirection={"row"}>
          <IconButton
            onClick={() => {}}
            sx={{ p: "5px", backgroundColor: "#ebebeb", borderRadius: "5px" }}
          >
            <DeleteIcon />
          </IconButton>
          <Box display="flex" alignItems="center" gap={1}>
            <IconButton
              onClick={() => {}}
              sx={{ p: "5px", backgroundColor: "#ebebeb", borderRadius: "5px" }}
              color="primary"
            >
              <RemoveIcon />
            </IconButton>
            <Typography>1</Typography>
            <IconButton
              onClick={() => {}}
              sx={{ p: "5px", backgroundColor: "#ebebeb", borderRadius: "5px" }}
              color="primary"
            >
              <AddIcon />
            </IconButton>
          </Box>
        </Stack>
      </Box>
    </Container>
  );
};
export default Cart;
