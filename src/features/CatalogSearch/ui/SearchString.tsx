import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";

const SearchString = () => {
  return (
    <Box component={"form"} height={"40px"}>
      <TextField size={"small"} placeholder="Поиск..." />
    </Box>
  );
};

export default SearchString;
