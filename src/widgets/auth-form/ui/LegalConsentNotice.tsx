import {
  Box,
  Checkbox,
  FormControl,
  FormControlLabel,
  FormHelperText,
  Stack,
  Typography,
} from "@mui/material";
import Link from "next/link";
import { useId, type ReactElement } from "react";
import { SITE_ROUTES } from "@/shared/config";

type ConsentName = "agreement" | "privacy";

interface LegalConsentNoticeProps {
  values: Record<ConsentName, boolean>;
  errors: Record<ConsentName, string>;
  onChange: (name: ConsentName, checked: boolean) => void;
}

const LEGAL_LINK_TEXT_SX = {
  fontWeight: 500,
  textDecoration: "underline",
  textDecorationColor: "currentColor",
  textUnderlineOffset: "2px",
  transition: "color 0.2s ease",
  "&:hover": { color: "primary.dark" },
} as const;

const LEGAL_LINK_SX = {
  "&:focus-visible": {
    borderRadius: "2px",
    outline: "2px solid",
    outlineColor: "primary.main",
    outlineOffset: "2px",
  },
} as const;

export const LegalConsentNotice = ({
  values,
  errors,
  onChange,
}: LegalConsentNoticeProps): ReactElement => {
  const id = useId();

  return (
    <Stack spacing={1}>
      {(["agreement", "privacy"] as const).map((name) => {
        const labelId = `${id}-${name}-label`;
        const errorId = `${id}-${name}-error`;
        const isAgreement = name === "agreement";

        return (
          <FormControl key={name} error={!!errors[name]}>
            <FormControlLabel
              sx={{ m: 0, alignItems: "flex-start", minHeight: 44 }}
              control={
                <Checkbox
                  checked={values[name]}
                  onChange={(_, checked) => onChange(name, checked)}
                  color="primary"
                  inputProps={{
                    "aria-labelledby": labelId,
                    "aria-required": true,
                    "aria-invalid": !!errors[name],
                    "aria-describedby": errors[name] ? errorId : undefined,
                  }}
                  sx={{
                    width: 44,
                    height: 44,
                    flexShrink: 0,
                    "&.Mui-focusVisible": {
                      outline: "2px solid",
                      outlineColor: "primary.main",
                      outlineOffset: "-2px",
                    },
                  }}
                />
              }
              label={
                <Typography
                  id={labelId}
                  component="span"
                  color="text.secondary"
                  sx={{
                    display: "block",
                    fontSize: "0.8125rem",
                    lineHeight: 1.5,
                    py: 1.25,
                  }}
                >
                  {isAgreement ? "Я принимаю условия " : "Я ознакомлен(а) с "}
                  <Box
                    component={Link}
                    href={isAgreement ? SITE_ROUTES.userAgreement : SITE_ROUTES.privacy}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(event) => event.stopPropagation()}
                    sx={LEGAL_LINK_SX}
                  >
                    <Typography
                      component="span"
                      variant="inherit"
                      color="accent.primary"
                      sx={LEGAL_LINK_TEXT_SX}
                    >
                      {isAgreement ? "Пользовательского соглашения" : "Политикой конфиденциальности"}
                    </Typography>
                  </Box>
                  {isAgreement ? "." : " и даю согласие на обработку моих персональных данных."}
                </Typography>
              }
            />
            {errors[name] && (
              <FormHelperText id={errorId} role="alert" sx={{ ml: 5.5, mt: 0 }}>
                {errors[name]}
              </FormHelperText>
            )}
          </FormControl>
        );
      })}
    </Stack>
  );
};
