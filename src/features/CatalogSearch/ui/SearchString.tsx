import InputBase from "@mui/material/InputBase";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import SearchIcon from "@mui/icons-material/Search";

export function SearchString() {
  return (
    <Box
      component={"form"}
      bgcolor={"white"}
      sx={{
        display: "flex",
        alignItems: "center",
        borderRadius: "4px",
      }}
    >
      <InputBase
        sx={{ ml: 1, flex: 1 }}
        placeholder="Поиск"
        inputProps={{ "aria-label": "search google maps" }}
      />
      <IconButton
        sx={{ backgroundColor: "#febd69", p: "10px" }}
        type="button"
        aria-label="search"
      >
        <SearchIcon />
      </IconButton>
    </Box>
  );
}
