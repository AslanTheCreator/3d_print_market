import { Box, Stack, Typography } from "@mui/material";

export interface LegalSection {
  title: string;
  paragraphs: string[];
}

interface LegalDocumentProps {
  publishedAt: string;
  sections: LegalSection[];
}

export function LegalDocument({ publishedAt, sections }: LegalDocumentProps) {
  return (
    <Stack
      spacing={3.5}
      sx={{
        p: { xs: 2.5, sm: 4 },
        bgcolor: "background.paper",
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 2,
      }}
    >
      <Typography variant="body2" color="text.secondary">
        Дата публикации и вступления в силу: {publishedAt}
      </Typography>

      {sections.map((section) => (
        <Box key={section.title}>
          <Typography
            component="h2"
            variant="h5"
            sx={{ mb: 1.5, fontSize: { xs: "1.125rem", sm: "1.25rem" } }}
          >
            {section.title}
          </Typography>
          <Stack spacing={1.25}>
            {section.paragraphs.map((paragraph) => (
              <Typography key={paragraph} variant="body2" sx={{ lineHeight: 1.75 }}>
                {paragraph}
              </Typography>
            ))}
          </Stack>
        </Box>
      ))}
    </Stack>
  );
}
