import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Image from "next/image";
import mainImg from "../../src/shared/assets/photo-2024-08-13-13-11-29_8.69344055.webp";

const page = () => {
  return (
    <div>
      <Box pt={"20px"}>
        <Typography variant={"h1"}>Название</Typography>
        <Stack flexWrap={"wrap"}>
          <Stack width={"100%"}>
            <Box>
              <Image
                src={mainImg}
                alt="Main image"
                style={{ width: "100%", height: "auto" }}
              />
            </Box>
            <Stack flexDirection={"row"} ml={"-5px"} mr={"-5px"}>
              <Box pl={"5px"} pr={"5px"} width={"25%"}>
                <Image
                  src={mainImg}
                  alt="additional image"
                  style={{ width: "100%", height: "auto" }}
                />
              </Box>
              <Box pl={"5px"} pr={"5px"} width={"25%"}>
                <Image
                  src={mainImg}
                  alt="additional image"
                  style={{ width: "100%", height: "auto" }}
                />
              </Box>
            </Stack>
          </Stack>
          <Stack></Stack>
        </Stack>
      </Box>
    </div>
  );
};

export default page;
