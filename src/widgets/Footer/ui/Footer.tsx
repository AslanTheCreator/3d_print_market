import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";

const Footer = () => {
  return (
    <Box component={"footer"} bgcolor={"#54C5E5"} color={"white"}>
      <Container>
        <Stack justifyContent={"center"} alignItems={"center"} p={"16px 0"}>
          <Typography>© 2024 3D Print Market</Typography>
        </Stack>
      </Container>
    </Box>
  );
};

export default Footer;
