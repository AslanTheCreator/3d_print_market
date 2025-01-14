import { Box, Stack, Button, TextField } from "@mui/material";
import Typography from "@mui/material/Typography";
import Link from "next/link";

interface IAuthForm {
  title: string;
  subtitle: string;
  url: string;
  linkText: string;
  buttonTitle: string;
}

const AuthForm: React.FC<IAuthForm> = ({
  title,
  subtitle,
  url,
  linkText,
  buttonTitle,
}) => {
  return (
    <Box
      pt={"30px"}
      pb={"30px"}
      display={"flex"}
      flexDirection={"column"}
      alignItems={"center"}
    >
      <Typography
        component={"h2"}
        fontWeight={400}
        fontSize={27}
        lineHeight={"30px"}
        textAlign={"center"}
      >
        {title}
      </Typography>
      <Box mt={"5px"} textAlign={"center"} fontSize={17}>
        <Typography component={"span"} fontSize={17}>
          {subtitle}
        </Typography>
        <Link
          style={{ color: "#ce7c7c", textDecoration: "underline" }}
          href={url}
        >
          {linkText}
        </Link>
      </Box>
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
    </Box>
  );
};

export default AuthForm;
