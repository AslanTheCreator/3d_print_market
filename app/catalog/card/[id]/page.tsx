import {
  Container,
  Grid,
  Typography,
  Stack,
  TextField,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Breadcrumbs,
} from "@mui/material";
import Box from "@mui/material/Box";
import Image from "next/image";
import img from "../../../../src/shared/assets/photo-8-2024-11-03-17-59-52_2.14640913.webp";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import Link from "next/link";

export default function CardPage() {
  const arrayImg = [
    {
      id: 1,
      img: img,
    },
    {
      id: 2,
      img: img,
    },
  ];
  return (
    <div>
      <Container sx={{ marginTop: "10px" }}>
        <Box>
          <Breadcrumbs>
            <Link color="inherit" href="/">
              Каталог
            </Link>
            <Link
              color="inherit"
              href="/material-ui/getting-started/installation/"
            >
              Варгеймы
            </Link>
            <Typography sx={{ color: "text.primary" }}>
              Warhammer 40.000
            </Typography>
          </Breadcrumbs>
          <Typography component={"h2"} variant={"h3"}>
            Aragorn Lord of the Rings Diorama
          </Typography>
          <Box mt={"15px"}>
            <Image alt="главная картинка" src={img} width={290} height={290} />
            <Grid container spacing={1}>
              {arrayImg.map((_, index) => (
                <Grid item xs={3} key={index}>
                  <Image
                    alt="дополнительная картинка"
                    src={img}
                    width={65}
                    height={65}
                  />
                </Grid>
              ))}
            </Grid>
          </Box>
          <Stack>
            <Typography>До окончания аукциона осталось:</Typography>
            <Typography
              padding={"12px"}
              color={"#9a9a9a"}
              bgcolor={"#f9f9f9"}
              borderTop={"solid 1px #d9d9d9"}
              borderBottom={"solid 1px #d9d9d9"}
            >
              Время окончания: 21:00, 08 ноября
            </Typography>
          </Stack>
          <Stack>
            <Typography>Текущая ставка: 2500 P</Typography>
            <Stack direction={"row"} alignItems={"center"}>
              <Typography width={"60%"}>Сделать ставку:</Typography>
              <TextField label="2500 P" size={"small"} />
            </Stack>
          </Stack>
          <Box mt={"20px"}>
            <Accordion>
              <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                aria-controls="panel1-content"
                id="panel1-header"
              >
                Описание товара
              </AccordionSummary>
              <AccordionDetails>
                Lorem ipsum dolor sit amet, consectetur adipiscing elit.
                Suspendisse malesuada lacus ex, sit amet blandit leo lobortis
                eget.
              </AccordionDetails>
            </Accordion>
            <Accordion>
              <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                aria-controls="panel2-content"
                id="panel2-header"
              >
                Обсуждение товара
              </AccordionSummary>
              <AccordionDetails>
                Lorem ipsum dolor sit amet, consectetur adipiscing elit.
                Suspendisse malesuada lacus ex, sit amet blandit leo lobortis
                eget.
              </AccordionDetails>
            </Accordion>
            <Accordion>
              <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                aria-controls="panel3-content"
                id="panel3-header"
              >
                Отзывы о продавце
              </AccordionSummary>
              <AccordionDetails>
                Lorem ipsum dolor sit amet, consectetur adipiscing elit.
                Suspendisse malesuada lacus ex, sit amet blandit leo lobortis
                eget.
              </AccordionDetails>
            </Accordion>
          </Box>
        </Box>
      </Container>
    </div>
  );
}
