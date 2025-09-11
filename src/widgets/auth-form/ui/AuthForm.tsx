"use client";

import React, { useState } from "react";
import {
  Box,
  Stack,
  Button,
  TextField,
  Typography,
  InputAdornment,
  IconButton,
  FormHelperText,
  CircularProgress,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import Link from "next/link";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";

interface IAuthForm {
  title: string;
  subtitle: string;
  url: string;
  linkText: string;
  buttonTitle: string;
  onSubmit?: (email: string, password: string) => Promise<void>;
  isLoading?: boolean;
}

const AuthForm: React.FC<IAuthForm> = ({
  title,
  subtitle,
  url,
  linkText,
  buttonTitle,
  onSubmit,
  isLoading = false,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  // const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleTogglePassword = () => {
    setShowPassword((prev) => !prev);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");

    // Submit form if onSubmit is provided
    if (onSubmit) {
      try {
        setIsSubmitting(true);
        await onSubmit(email, password);
      } catch (error) {
        console.error("Authentication error:", error);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <Box
      pt={isMobile ? 3 : 4}
      pb={isMobile ? 3 : 4}
      px={isMobile ? 2 : 0}
      display="flex"
      flexDirection="column"
      alignItems="center"
      width="100%"
    >
      <Typography
        component="h2"
        variant={isMobile ? "h3" : "h2"}
        fontWeight={500}
        textAlign="center"
        sx={{
          fontSize: isMobile ? "1.5rem" : "2rem",
          lineHeight: isMobile ? 1.3 : 1.2,
        }}
      >
        {title}
      </Typography>

      <Box mt={1} textAlign="center" maxWidth={isMobile ? "100%" : "450px"}>
        <Typography
          component="span"
          variant="body1"
          sx={{ fontSize: isMobile ? "0.875rem" : "1rem" }}
        >
          {subtitle}{" "}
        </Typography>
        <Link href={url} passHref>
          <Typography
            component="span"
            color="primary"
            sx={{
              fontSize: isMobile ? "0.875rem" : "1rem",
              textDecoration: "underline",
              fontWeight: 500,
              transition: "color 0.2s ease",
              "&:hover": {
                color: theme.palette.primary.dark,
              },
            }}
          >
            {linkText}
          </Typography>
        </Link>
      </Box>

      <Box
        component="form"
        onSubmit={handleSubmit}
        display="flex"
        flexDirection="column"
        width="100%"
        maxWidth={isMobile ? "100%" : "320px"}
        mt={isMobile ? 3 : 5}
      >
        <Stack spacing={isMobile ? 1.5 : 2}>
          <Box>
            <TextField
              fullWidth
              placeholder="Email"
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              InputProps={{
                sx: {
                  borderRadius: theme.shape.borderRadius,
                  fontSize: isMobile ? "0.875rem" : "1rem",
                },
              }}
            />
          </Box>

          <Box>
            <TextField
              fullWidth
              placeholder="Пароль"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={!!passwordError}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={handleTogglePassword}
                      edge="end"
                      size={isMobile ? "small" : "medium"}
                      aria-label="toggle password visibility"
                    >
                      {showPassword ? (
                        <VisibilityOffIcon />
                      ) : (
                        <VisibilityIcon />
                      )}
                    </IconButton>
                  </InputAdornment>
                ),
                sx: {
                  borderRadius: theme.shape.borderRadius,
                  fontSize: isMobile ? "0.875rem" : "1rem",
                },
              }}
            />
            {passwordError && (
              <FormHelperText
                error
                sx={{
                  ml: 1.5,
                  mt: 0.5,
                  fontSize: "0.75rem",
                }}
              >
                {passwordError}
              </FormHelperText>
            )}
          </Box>

          <Button
            variant="contained"
            type="submit"
            disabled={isSubmitting || isLoading}
            sx={{
              minHeight: isMobile ? "48px" : "56px",
              mt: isMobile ? 2 : 3,
              position: "relative",
              fontWeight: 600,
              fontSize: isMobile ? "0.875rem" : "1rem",
              transition: "all 0.2s ease",
            }}
          >
            {isSubmitting || isLoading ? (
              <CircularProgress
                size={24}
                color="inherit"
                sx={{ position: "absolute" }}
              />
            ) : (
              buttonTitle
            )}
          </Button>
        </Stack>
      </Box>
    </Box>
  );
};

export default AuthForm;
