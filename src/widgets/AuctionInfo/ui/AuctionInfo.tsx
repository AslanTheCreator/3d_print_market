import { Stack, TextField, Typography, Box } from "@mui/material";

export const AuctionInfo = () => {
  return (
    <Box>
      <Stack>
        <Typography>До окончания аукциона осталось:</Typography>
        <Typography
          padding={"12px"}
          color={"#9a9a9a"}
          bgcolor={"#f9f9f9"}
          borderTop={"solid 1px #d9d9d9"}
          borderBottom={"solid 1px #d9d9d9"}
        >
          Время окончания: 21:00, 08 ноября
        </Typography>
      </Stack>
      <Stack>
        <Typography>Текущая ставка: 2500 P</Typography>
        <Stack direction={"row"} alignItems={"center"}>
          <Typography width={"60%"}>Сделать ставку:</Typography>
          <TextField label="2500 P" size={"small"} />
        </Stack>
      </Stack>
    </Box>
  );
};
