import {
  Checkbox,
  FormControl,
  FormControlLabel,
  FormHelperText,
  Typography,
} from "@mui/material";
import type { ReactElement } from "react";
import { SITE_ROUTES } from "@/shared/config";
import { AppLink } from "@/shared/ui/app-link";

interface PersonalDataConsentFieldProps {
  checked: boolean;
  error?: string;
  onChange: (checked: boolean) => void;
}

const ERROR_ID = "personal-data-consent-error";

export const PersonalDataConsentField = ({
  checked,
  error,
  onChange,
}: PersonalDataConsentFieldProps): ReactElement => {
  return (
    <FormControl error={Boolean(error)}>
      <FormControlLabel
        sx={{
          alignItems: "flex-start",
          m: 0,
          ".MuiFormControlLabel-label": {
            pt: 0.75,
          },
        }}
        control={
          <Checkbox
            checked={checked}
            onChange={(event) => onChange(event.target.checked)}
            inputProps={{
              "aria-describedby": error ? ERROR_ID : undefined,
              "aria-invalid": Boolean(error),
            }}
          />
        }
        label={
          <Typography variant="body2">
            Я даю согласие на обработку персональных данных в соответствии с{" "}
            <AppLink
              href={SITE_ROUTES.privacy}
              target="_blank"
              rel="noopener noreferrer"
            >
              Политикой обработки персональных данных
            </AppLink>
          </Typography>
        }
      />

      {error && (
        <FormHelperText id={ERROR_ID} sx={{ ml: 1.5, mt: 0 }}>
          {error}
        </FormHelperText>
      )}
    </FormControl>
  );
};
