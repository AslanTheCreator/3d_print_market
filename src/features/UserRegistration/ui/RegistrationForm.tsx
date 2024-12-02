import TextField from "@mui/material/TextField";
import Stack from "@mui/material/Stack";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";

interface IRegistrationForm {
  buttonTitle: string;
}

const RegistrationForm: React.FC<IRegistrationForm> = ({ buttonTitle }) => {
  return (
    <Box
      component={"form"}
      display={"flex"}
      flexDirection={"column"}
      gap={"5px"}
      mt={"40px"}
      width={"280px"}
    >
      <Stack gap={"5px"}>
        <TextField placeholder="Email" />
        <TextField placeholder="Пароль" />
      </Stack>
      <Button variant="contained" sx={{ minHeight: "56px" }}>
        {buttonTitle}
      </Button>
    </Box>
  );
};

export default RegistrationForm;
