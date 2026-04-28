import { Box, Typography, Container, Stack } from "@mui/material";

export const Footer = () => {
  return (
    <Box component={"footer"} bgcolor={"#54C5E5"} color={"white"}>
      <Container>
        <Stack justifyContent={"center"} alignItems={"center"} p={"16px 0"}>
          <Typography>© 2026 Figurzilla</Typography>
        </Stack>
      </Container>
    </Box>
  );
};
