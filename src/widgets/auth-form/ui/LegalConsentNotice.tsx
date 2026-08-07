import { Box, Typography } from "@mui/material";
import Link from "next/link";
import type { ReactElement } from "react";
import { SITE_ROUTES } from "@/shared/config";

const LEGAL_LINK_TEXT_SX = {
  fontWeight: 500,
  textDecoration: "underline",
  textDecorationColor: "currentColor",
  textUnderlineOffset: "2px",
  transition: "color 0.2s ease",
  "&:hover": {
    color: "primary.dark",
  },
} as const;

const LEGAL_LINK_SX = {
  "&:focus-visible": {
    borderRadius: "2px",
    outline: "2px solid",
    outlineColor: "primary.main",
    outlineOffset: "2px",
  },
} as const;

export const LegalConsentNotice = (): ReactElement => {
  return (
    <Typography
      variant="body2"
      color="text.secondary"
      sx={{
        fontSize: "0.75rem",
        lineHeight: 1.35,
      }}
    >
      Регистрируясь на сайте, я принимаю{" "}
      <Box
        component={Link}
        href={SITE_ROUTES.userAgreement}
        target="_blank"
        rel="noopener noreferrer"
        sx={LEGAL_LINK_SX}
      >
        <Typography
          component="span"
          variant="inherit"
          color="primary"
          sx={LEGAL_LINK_TEXT_SX}
        >
          пользовательское соглашение
        </Typography>
      </Box>
      , а также даю Правообладателю согласие на обработку моих персональных
      данных в соответствии с{" "}
      <Box
        component={Link}
        href={SITE_ROUTES.privacy}
        target="_blank"
        rel="noopener noreferrer"
        sx={LEGAL_LINK_SX}
      >
        <Typography
          component="span"
          variant="inherit"
          color="primary"
          sx={LEGAL_LINK_TEXT_SX}
        >
          политикой конфиденциальности
        </Typography>
      </Box>
      .
    </Typography>
  );
};
