"use client";
import { Button, Stack } from "@mui/material";
import { useSearchParams } from "next/navigation";
import { useAccountSessionKey } from "@/entities/session";
import { AdminProductEditor } from "@/features/admin-product-management";
export function AdminProductPage({ id }: { id: number }) {
  const sessionKey = useAccountSessionKey();
  const params = useSearchParams();
  const candidate = params.get("returnTo") ?? "";
  const returnTo = /^\/admin\/(products|agents)(\/\d+)?(\?[^\\]*)?$/.test(candidate) ? candidate : "/admin/products";
  return <Stack spacing={3}><Button href={returnTo} sx={{ alignSelf: "start" }}>← К списку</Button><AdminProductEditor session={sessionKey} id={id} /></Stack>;
}
