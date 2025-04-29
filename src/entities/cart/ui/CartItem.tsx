import {
  Box,
  IconButton,
  Stack,
  Typography,
  Divider,
  useTheme,
  useMediaQuery,
  Paper,
  alpha,
  Skeleton,
} from "@mui/material";
import Image from "next/image";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import { CartProductModel } from "../model/types";
import { useRemoveFromCart } from "@/features/cart/add-to-cart/hooks/useRemoveFromCart";
import { useState } from "react";
import { formatPrice } from "@/shared/lib/formatPrice";

export const CartItem: React.FC<CartProductModel> = ({
  id,
  name,
  price,
  category,
  image,
}) => {
  const { mutate, isPending } = useRemoveFromCart();
  const [isImageLoaded, setIsImageLoaded] = useState<boolean>(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const handleRemove = () => {
    mutate(
      { productId: id },
      {
        onSuccess: () => {
          console.log("Товар успешно удален из корзины");
        },
        onError: () => {
          alert("Не удалось удалить товар из корзины.");
        },
      }
    );
  };
  return (
    <Paper
      elevation={0}
      sx={{
        p: { xs: 1.5, sm: 2 },
        mb: 2,
        borderRadius: { xs: 1.5, sm: 2 },
        border: `1px solid ${alpha(theme.palette.divider, 0.8)}`,
        transition: "box-shadow 0.2s",
        "&:hover": {
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
        },
      }}
    >
      {/* Верхняя часть с изображением и информацией */}
      <Stack direction="row" spacing={2} pb={1.5}>
        {/* Изображение */}
        <Box
          position="relative"
          sx={{
            width: { xs: 100, sm: 120 },
            height: { xs: 100, sm: 120 },
            borderRadius: 1.5,
            overflow: "hidden",
            flexShrink: 0,
            backgroundColor: alpha(theme.palette.primary.main, 0.05),
          }}
        >
          {image && image[0]?.imageData ? (
            <>
              {!isImageLoaded && (
                <Skeleton
                  variant="rectangular"
                  width="100%"
                  height="100%"
                  animation="wave"
                  sx={{ position: "absolute", top: 0, left: 0 }}
                />
              )}
              <Image
                src={`data:${image[0].contentType};base64,${image[0].imageData}`}
                alt={name}
                fill
                sizes="(max-width: 600px) 100px, 120px"
                style={{
                  objectFit: "cover",
                  opacity: isImageLoaded ? 1 : 0,
                  transition: "opacity 0.3s",
                }}
                onLoad={() => setIsImageLoaded(true)}
              />
            </>
          ) : (
            <Box
              sx={{
                width: "100%",
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "text.secondary",
                fontSize: "0.75rem",
              }}
            >
              Изображение недоступно
            </Box>
          )}
        </Box>

        {/* Информация о товаре */}
        <Stack flexGrow={1} spacing={0.5} justifyContent="flex-start">
          {category?.name && (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{
                fontSize: isMobile ? "0.625rem" : "0.75rem",
                fontWeight: 500,
              }}
            >
              {category.name}
            </Typography>
          )}

          <Typography
            variant={isMobile ? "subtitle2" : "subtitle1"}
            fontWeight={600}
            sx={{
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {name}
          </Typography>

          <Typography
            variant={isMobile ? "body2" : "body1"}
            fontWeight={700}
            color="primary.main"
            sx={{ mt: 0.5 }}
          >
            {formatPrice(price) + " ₽"}
          </Typography>
        </Stack>
      </Stack>

      <Divider />

      {/* Нижняя часть с кнопками */}
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        pt={1.5}
      >
        <IconButton
          onClick={handleRemove}
          disabled={isPending}
          aria-label="Удалить товар из корзины"
          sx={{
            p: 1,
            bgcolor: alpha(theme.palette.error.main, 0.1),
            borderRadius: "8px",
            color: theme.palette.error.main,
            "&:hover": {
              bgcolor: alpha(theme.palette.error.main, 0.15),
            },
            transition: "background-color 0.2s",
          }}
        >
          <DeleteOutlineIcon fontSize={isMobile ? "small" : "medium"} />
        </IconButton>

        <Stack direction="row" alignItems="center" spacing={1}>
          <IconButton
            size={isMobile ? "small" : "medium"}
            sx={{
              p: isMobile ? 0.75 : 1,
              bgcolor: alpha(theme.palette.primary.main, 0.1),
              borderRadius: "8px",
              color: theme.palette.primary.main,
              "&:hover": {
                bgcolor: alpha(theme.palette.primary.main, 0.15),
              },
              transition: "background-color 0.2s",
            }}
          >
            <RemoveIcon fontSize={isMobile ? "small" : "medium"} />
          </IconButton>

          <Typography
            variant={isMobile ? "body2" : "body1"}
            fontWeight={600}
            sx={{ minWidth: isMobile ? "24px" : "28px", textAlign: "center" }}
          >
            1
          </Typography>

          <IconButton
            size={isMobile ? "small" : "medium"}
            sx={{
              p: isMobile ? 0.75 : 1,
              bgcolor: alpha(theme.palette.primary.main, 0.1),
              borderRadius: "8px",
              color: theme.palette.primary.main,
              "&:hover": {
                bgcolor: alpha(theme.palette.primary.main, 0.15),
              },
              transition: "background-color 0.2s",
            }}
          >
            <AddIcon fontSize={isMobile ? "small" : "medium"} />
          </IconButton>
        </Stack>
      </Stack>
    </Paper>
  );
};
