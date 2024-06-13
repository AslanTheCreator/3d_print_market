import Container from "@mui/material/Container";
import Box from "@mui/material/Box";
import Input from "@mui/material/Input";
import Typography from "@mui/material/Typography";
import RegistrationForm from "@/features/UserRegistration/ui/RegistrationForm";

export default function page() {
  return (
    <div style={{ backgroundColor: "#f2f6f9" }}>
      <Container
        maxWidth={"sm"}
        style={{
          backgroundColor: "#fff",
          borderRadius: "32px",
        }}
        component={"main"}
      >
        <Box pt={"30px"} pb={"30px"}>
          <Typography variant="h1" textAlign={"center"}>
            Вход в аккаунт
          </Typography>
          <Box mt={"5px"} textAlign={"center"}>
            <Typography>Войдите или зарегистрируйтесь</Typography>
          </Box>
          <RegistrationForm />
        </Box>
      </Container>
    </div>
  );
}
