import { ButtonStyled } from "@/shared/ui/Button";
import { Typography, Box } from "@mui/material";

export const AuctionInfo = () => {
  return (
    <Box>
      <Typography fontWeight={700} fontSize={29}>
        18 000&#8381;
      </Typography>
      <Typography fontSize={14}>В наличии 1 шт.</Typography>
      <ButtonStyled sx={{ marginTop: "15px" }} variant="contained">
        Добавить в корзину
      </ButtonStyled>
    </Box>
  );
};
