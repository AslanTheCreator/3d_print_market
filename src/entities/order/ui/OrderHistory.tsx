"use client";
import React, { useState } from "react";
import {
  Box,
  Button,
  Collapse,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Stack,
  Typography,
} from "@mui/material";
import {
  CheckCircle,
  ExpandLess,
  ExpandMore,
  History,
} from "@mui/icons-material";
import { ListOrdersModel } from "@/entities/order/model/types";
import { useOrderStatusDictionary } from "@/entities/order/lib/useOrderStatusDictionary";

interface OrderHistoryProps {
  histories: ListOrdersModel["histories"];
}

export const OrderHistory = ({ histories }: OrderHistoryProps) => {
  const [expanded, setExpanded] = useState(false);
  const { getStatusDescription, isLoading } = useOrderStatusDictionary();

  return (
    <Box>
      <Button
        startIcon={<History />}
        endIcon={expanded ? <ExpandLess /> : <ExpandMore />}
        onClick={() => setExpanded(!expanded)}
        size="small"
        sx={{ mb: 1 }}
      >
        История заказа ({histories.length})
      </Button>
      <Collapse in={expanded}>
        <List dense>
          {histories.map((history, index) => (
            <ListItem key={index} sx={{ py: 0.5, px: 0 }}>
              <ListItemIcon sx={{ minWidth: 32 }}>
                <CheckCircle sx={{ fontSize: 16 }} color="success" />
              </ListItemIcon>
              <ListItemText
                primary={
                  isLoading
                    ? history.status
                    : getStatusDescription(history.status)
                }
                secondary={
                  <Stack direction="column" spacing={0.5}>
                    {history.comment && (
                      <Typography variant="caption" color="text.secondary">
                        {history.comment}
                      </Typography>
                    )}
                    <Typography variant="caption" color="text.secondary">
                      {history.changedAt.replace(" ", ", ")}
                    </Typography>
                  </Stack>
                }
                primaryTypographyProps={{ variant: "body2", fontWeight: 500 }}
              />
            </ListItem>
          ))}
        </List>
      </Collapse>
    </Box>
  );
};
