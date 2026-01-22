import Link, { LinkProps as NextLinkProps } from "next/link";
import MuiLink, { LinkProps as MuiLinkProps } from "@mui/material/Link";

type AppLinkProps = Omit<MuiLinkProps, "href"> & Pick<NextLinkProps, "href">;

export const AppLink = ({ href, children, ...muiProps }: AppLinkProps) => {
  return (
    <MuiLink component={Link} href={href} {...muiProps}>
      {children}
    </MuiLink>
  );
};
