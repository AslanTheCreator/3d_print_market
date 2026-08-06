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
  CircularProgress,
  useTheme,
} from "@mui/material";
import Link from "next/link";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import { PersonalDataConsentField } from "./PersonalDataConsentField";

interface AuthFormSubmitValues {
  email: string;
  password: string;
  age?: number;
}

interface IAuthForm {
  title: string;
  subtitle: string;
  url: string;
  linkText: string;
  buttonTitle: string;
  onSubmit?: (values: AuthFormSubmitValues) => Promise<void>;
  isLoading?: boolean;
  onForgotPassword?: () => void;
  passwordAutoComplete?: "current-password" | "new-password";
  showAgeField?: boolean;
  requirePersonalDataConsent?: boolean;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_AGE = 0;
const MAX_AGE = 150;
const PERSONAL_DATA_CONSENT_ERROR =
  "Необходимо дать согласие на обработку персональных данных";

const getAgeError = (ageValue: string): string => {
  const normalizedAge = ageValue.trim();

  if (!normalizedAge) {
    return "Введите возраст";
  }

  if (!/^\d+$/.test(normalizedAge)) {
    return "Введите целое число";
  }

  const parsedAge = Number(normalizedAge);

  if (parsedAge < MIN_AGE || parsedAge > MAX_AGE) {
    return `Возраст должен быть от ${MIN_AGE} до ${MAX_AGE}`;
  }

  return "";
};

const AuthForm: React.FC<IAuthForm> = ({
  title,
  subtitle,
  url,
  linkText,
  buttonTitle,
  onSubmit,
  isLoading = false,
  onForgotPassword,
  passwordAutoComplete = "current-password",
  showAgeField = false,
  requirePersonalDataConsent = false,
}) => {
  const theme = useTheme();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [age, setAge] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [ageError, setAgeError] = useState("");
  const [hasPersonalDataConsent, setHasPersonalDataConsent] = useState(false);
  const [personalDataConsentError, setPersonalDataConsentError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleTogglePassword = () => {
    setShowPassword((prev) => !prev);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedEmail = email.trim();
    const nextEmailError = !normalizedEmail
      ? "Введите email"
      : EMAIL_PATTERN.test(normalizedEmail)
        ? ""
        : "Введите корректный email";
    const nextPasswordError = password ? "" : "Введите пароль";
    const nextAgeError = showAgeField ? getAgeError(age) : "";
    const nextPersonalDataConsentError =
      requirePersonalDataConsent && !hasPersonalDataConsent
        ? PERSONAL_DATA_CONSENT_ERROR
        : "";

    setEmailError(nextEmailError);
    setPasswordError(nextPasswordError);
    setAgeError(nextAgeError);
    setPersonalDataConsentError(nextPersonalDataConsentError);

    if (
      nextEmailError ||
      nextPasswordError ||
      nextAgeError ||
      nextPersonalDataConsentError
    ) {
      return;
    }

    setEmail(normalizedEmail);
    const normalizedAge = age.trim();
    if (showAgeField) {
      setAge(normalizedAge);
    }
    setPasswordError("");

    if (onSubmit) {
      try {
        setIsSubmitting(true);
        await onSubmit({
          email: normalizedEmail,
          password,
          ...(showAgeField ? { age: Number(normalizedAge) } : {}),
        });
      } catch (error) {
        console.error("Authentication error:", error);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      width="100%"
      sx={{
        pt: { xs: 3, sm: 4 },
        pb: { xs: 3, sm: 4 },
        px: { xs: 2, sm: 0 },
      }}
    >
      <Typography
        component="h2"
        variant="h2"
        fontWeight={700}
        textAlign="center"
        sx={{
          fontSize: { xs: "1.5rem", sm: "2rem" },
          lineHeight: { xs: 1.3, sm: 1.2 },
        }}
      >
        {title}
      </Typography>

      <Box
        mt={1}
        textAlign="center"
        sx={{ maxWidth: { xs: "100%", sm: "450px" } }}
      >
        <Typography
          component="span"
          variant="body1"
          sx={{ fontSize: { xs: "0.875rem", sm: "1rem" } }}
        >
          {subtitle}{" "}
        </Typography>
        <Link href={url} passHref>
          <Typography
            component="span"
            color="primary"
            sx={{
              fontSize: { xs: "0.875rem", sm: "1rem" },
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
        noValidate
        onSubmit={handleSubmit}
        display="flex"
        flexDirection="column"
        width="100%"
        sx={{
          maxWidth: { xs: "100%", sm: "320px" },
          mt: { xs: 3, sm: 5 },
        }}
      >
        <Stack spacing={{ xs: 1.5, sm: 2 }}>
          <TextField
            id="auth-email"
            fullWidth
            label="Email"
            type="email"
            name="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setEmailError("");
            }}
            error={!!emailError}
            helperText={emailError || undefined}
            FormHelperTextProps={{
              sx: {
                ml: 1.5,
                mt: 0.5,
                fontSize: "0.75rem",
              },
            }}
            InputProps={{
              sx: {
                borderRadius: theme.shape.borderRadius,
                fontSize: { xs: "0.875rem", sm: "1rem" },
              },
            }}
          />

          <TextField
            id="auth-password"
            fullWidth
            label="Пароль"
            type={showPassword ? "text" : "password"}
            name="password"
            autoComplete={passwordAutoComplete}
            required
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setPasswordError("");
            }}
            error={!!passwordError}
            helperText={passwordError || undefined}
            FormHelperTextProps={{
              sx: {
                ml: 1.5,
                mt: 0.5,
                fontSize: "0.75rem",
              },
            }}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    type="button"
                    onClick={handleTogglePassword}
                    edge="end"
                    size="medium"
                    aria-label={
                      showPassword ? "Скрыть пароль" : "Показать пароль"
                    }
                    aria-pressed={showPassword}
                    sx={{ p: { xs: 0.625, sm: 1 } }}
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
                fontSize: { xs: "0.875rem", sm: "1rem" },
              },
            }}
          />

          {showAgeField && (
            <TextField
              id="auth-age"
              fullWidth
              label="Возраст"
              type="number"
              name="age"
              autoComplete="off"
              required
              value={age}
              onChange={(e) => {
                setAge(e.target.value);
                setAgeError("");
              }}
              error={!!ageError}
              helperText={ageError || undefined}
              FormHelperTextProps={{
                sx: {
                  ml: 1.5,
                  mt: 0.5,
                  fontSize: "0.75rem",
                },
              }}
              inputProps={{
                min: MIN_AGE,
                max: MAX_AGE,
                step: 1,
                inputMode: "numeric",
              }}
              InputProps={{
                sx: {
                  borderRadius: theme.shape.borderRadius,
                  fontSize: { xs: "0.875rem", sm: "1rem" },
                },
              }}
            />
          )}

          {requirePersonalDataConsent && (
            <PersonalDataConsentField
              checked={hasPersonalDataConsent}
              error={personalDataConsentError}
              onChange={(checked) => {
                setHasPersonalDataConsent(checked);
                if (checked) {
                  setPersonalDataConsentError("");
                }
              }}
            />
          )}

          {/* Кнопка "Забыли пароль?" */}
          {onForgotPassword && (
            <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 0.5 }}>
              <Typography
                component="button"
                type="button"
                onClick={onForgotPassword}
                sx={{
                  background: "none",
                  border: "none",
                  minHeight: 44,
                  padding: "0 4px",
                  display: "inline-flex",
                  alignItems: "center",
                  fontSize: { xs: "0.8rem", sm: "0.875rem" },
                  fontWeight: 500,
                  color: "primary.main",
                  textDecoration: "none",
                  cursor: "pointer",
                  transition: "color 0.2s ease",
                  "&:hover": {
                    textDecoration: "underline",
                    color: theme.palette.primary.dark,
                  },
                }}
              >
                Забыли пароль?
              </Typography>
            </Box>
          )}

          <Button
            variant="contained"
            type="submit"
            disabled={isSubmitting || isLoading}
            sx={{
              minHeight: { xs: "48px", sm: "56px" },
              mt: { xs: 2, sm: 3 },
              position: "relative",
              fontWeight: 600,
              fontSize: { xs: "0.875rem", sm: "1rem" },
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
