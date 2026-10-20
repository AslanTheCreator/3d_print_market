"use client";
import { Button, Stack } from "@mui/material";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAccountSessionKey } from "@/entities/session";
import { AdminProductEditor } from "@/features/admin-product-management";
import { adminProductReturnTo } from "../model/adminProductReturnTo";
export function AdminProductPage({ id }: { id: number }) {
  const sessionKey = useAccountSessionKey();
  const params = useSearchParams();
  const returnTo = adminProductReturnTo(params.get("returnTo"));
  return <Stack spacing={3}><Button component={Link} prefetch={false} href={returnTo ?? "/admin/products"} sx={{ alignSelf: "start" }}>← К списку</Button><AdminProductEditor key={`${sessionKey}:${id}`} session={sessionKey} id={id} returnTo={returnTo} /></Stack>;
}
