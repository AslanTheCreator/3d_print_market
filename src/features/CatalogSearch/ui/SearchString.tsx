import InputBase from "@mui/material/InputBase";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import SearchIcon from "@mui/icons-material/Search";

const SearchString = () => {
  return (
    <Box
      component={"form"}
      bgcolor={"white"}
      height={"40px"}
      sx={{
        display: "flex",
        alignItems: "center",
        borderRadius: "4px",
      }}
    >
      <InputBase
        sx={{ ml: 1, flex: 1 }}
        placeholder="Поиск"
        inputProps={{ "aria-label": "product search" }}
      />
      <IconButton
        sx={{
          backgroundColor: "#febd69",
          borderRadius: 0,
          borderTopRightRadius: "4px",
          borderBottomRightRadius: "4px",
          ":hover": {
            backgroundColor: "#f3a847",
          },
        }}
        color={"inherit"}
        type="button"
        aria-label="search"
      >
        <SearchIcon />
      </IconButton>
    </Box>
  );
};

export default SearchString;
