"use client";
import { useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import MenuRounded from "@mui/icons-material/MenuRounded";
import { Box, Button, Divider, Drawer, IconButton, List, ListItemButton, ListItemText, Stack, Typography } from "@mui/material";
import { useAuth } from "@/entities/session";
import { confirmDiscardChanges } from "@/shared/lib";

const items = [["/admin/orders", "Заказы"], ["/admin/products", "Товары"], ["/admin/agents", "Боты"]];
export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { logout } = useAuth();
  const navigation = <Box sx={{ p: 2, width: 232 }}>
    <Typography fontWeight={800} variant="h6" sx={{ px: 2, py: 2 }}>Figurzilla</Typography>
    <Typography variant="overline" color="text.secondary" sx={{ px: 2 }}>Администрирование</Typography>
    <List aria-label="Разделы администрирования">{items.map(([href, label]) => <ListItemButton key={href} component="a" href={href}
      selected={pathname.startsWith(href)} aria-current={pathname.startsWith(href) ? "page" : undefined}
      onClick={() => setOpen(false)} sx={{ borderRadius: 2, mb: 1, minHeight: 48 }}><ListItemText primary={label} /></ListItemButton>)}</List>
    <Divider /><Button component="a" href="/dashboard" fullWidth sx={{ mt: 2 }}>В личный кабинет</Button>
  </Box>;
  return <Box sx={{ minHeight: "100dvh", bgcolor: "#fafafa", display: "flex", "& .MuiButton-root": { minHeight: 44 }, "& .MuiIconButton-root": { minWidth: 44, minHeight: 44 } }}>
    <Box component="aside" sx={{ display: { xs: "none", md: "block" }, borderRight: 1, borderColor: "divider", bgcolor: "background.paper", position: "fixed", inset: "0 auto 0 0" }}>{navigation}</Box>
    <Drawer open={open} onClose={() => setOpen(false)} sx={{ display: { md: "none" } }}>{navigation}</Drawer>
    <Box sx={{ ml: { md: "232px" }, flex: 1, minWidth: 0 }}>
      <Stack component="header" direction="row" alignItems="center" justifyContent="space-between" sx={{ px: { xs: 2, md: 4 }, minHeight: 72, bgcolor: "background.paper", borderBottom: 1, borderColor: "divider" }}>
        <Stack direction="row" alignItems="center" spacing={1}><IconButton aria-label="Открыть меню админки" onClick={() => setOpen(true)} sx={{ display: { md: "none" } }}><MenuRounded /></IconButton><Typography fontWeight={600}>Панель администратора</Typography></Stack>
        <Button onClick={() => { if (confirmDiscardChanges()) { logout(); window.location.assign("/auth/login"); } }}>Выйти</Button>
      </Stack>
      <Box component="main" sx={{ p: { xs: 2, md: 4 }, maxWidth: 1600, mx: "auto", overflowWrap: "anywhere" }}>{children}</Box>
    </Box>
  </Box>;
}
