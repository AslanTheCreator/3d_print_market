import Stack from "@mui/material/Stack";
import Button from "@mui/material/Button";

const buttons = [
  {
    name: "Печать",
  },
  {
    name: "Modelling",
  },
  {
    name: "Товары",
  },
];

const NavigationButtons = () => {
  return (
    <Stack
      direction={"row"}
      maxHeight={"40px"}
      pl={"11px"}
      gap={"10px"}
      mr={"30px"}
      component={"nav"}
    >
      {buttons.map((button) => (
        <Button key={button.name} size={"large"} variant={"contained"}>
          {button.name}
        </Button>
      ))}
    </Stack>
  );
};

export default NavigationButtons;
