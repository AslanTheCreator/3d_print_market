import { SvgIcon } from "@mui/material";
import { SvgIconProps } from "@mui/material";

interface PersonCustomIconProps extends SvgIconProps {}

export const PersonCustomIcon: React.FC<PersonCustomIconProps> = (props) => (
  <SvgIcon {...props} viewBox="0 0 24 24">
    <circle
      cx="12"
      cy="7"
      r="4"
      fill="#ef4284"
      stroke="black"
      strokeWidth="1"
    />
    <path
      d="M4 20c0-3.3 3.6-6 8-6s8 2.7 8 6"
      fill="#ef4284"
      stroke="black"
      strokeWidth="1"
    />
  </SvgIcon>
);
