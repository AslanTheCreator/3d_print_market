import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";

export const SearchString = () => {
  return (
    <Box
      component={"form"}
      height={"40px"}
      bgcolor={"white"}
      borderRadius={"4px"}
      width={"100%"}
    >
      <TextField fullWidth size={"small"} placeholder="Поиск..." />
    </Box>
  );
};
