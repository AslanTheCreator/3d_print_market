import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import RegistrationForm from "@/features/UserRegistration/ui/RegistrationForm";
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
    <Box pt={"30px"} pb={"30px"}>
      <Typography variant="h1" textAlign={"center"}>
        {title}
      </Typography>
      <Box mt={"5px"} textAlign={"center"}>
        <Typography>{subtitle}</Typography>
        <Link
          style={{ color: "#ce7c7c", textDecoration: "underline" }}
          href={url}
        >
          {linkText}
        </Link>
      </Box>
      <RegistrationForm buttonTitle={buttonTitle} />
    </Box>
  );
};

export default AuthForm;
