"use client";
import { useQuery } from "@tanstack/react-query";
import { Box, Stack } from "@mui/material";
import { RequestFeedback } from "@/shared/ui/request-feedback";
import { adminImageApi } from "../api/adminImageApi";
export function AdminImages({ ids, session }: { ids: number[]; session: number | null }) {
  const query = useQuery({ queryKey: ["admin", session, "images", ids], queryFn: ({ signal }) => adminImageApi.read(ids, signal), enabled: ids.length > 0 && session !== null, retry: false });
  if (!ids.length) return null;
  return <Stack spacing={1}><RequestFeedback pending={query.isPending} error={query.error} retry={() => void query.refetch()} />
    {query.data?.map((image, index) => <Box component="img" key={index} src={`data:${image.contentType};base64,${image.imageData}`} alt={image.fileName || `Изображение ${index + 1}`} sx={{ maxWidth: "100%", maxHeight: 360, objectFit: "contain", bgcolor: "grey.100", borderRadius: 2 }} />)}
  </Stack>;
}
