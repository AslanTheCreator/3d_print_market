import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";

export const SearchString = () => {
  return (
    <Box component={"form"} height={"40px"}>
      <TextField size={"small"} placeholder="Поиск..." />
    </Box>
  );
};
