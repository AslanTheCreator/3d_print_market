"use client";

import React, { useCallback, useState } from "react";
import {
  Box,
  Button,
  CircularProgress,
  Alert,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from "@mui/material";
import { Refresh } from "@mui/icons-material";
import { useRouter } from "next/navigation";
import {
  ProductCardSkeleton,
  useDeleteProduct,
  useUserProductsInfinite,
} from "@/entities/product";
import { useNotification } from "@/shared/ui/notification";
import { EmptyCatalogState } from "@/shared/ui/states";
import { UserProductCard } from "./UserProductCard";
import { SortBy } from "@/entities/product";

interface ProductToDelete {
  id: number;
  name: string;
}

const productsGridSx = {
  display: "grid",
  gridTemplateColumns: {
    xs: "repeat(2, minmax(0, 1fr))",
    sm: "repeat(auto-fill, minmax(190px, 1fr))",
  },
  gap: { xs: 1, sm: 2, md: 2.5 },
  alignItems: "stretch",
} as const;

export const UserProductsList: React.FC = () => {
  const router = useRouter();
  const { showNotification } = useNotification();
  const { mutateAsync: deleteProduct, isPending: isDeleting } =
    useDeleteProduct();
  const [productToDelete, setProductToDelete] = useState<ProductToDelete | null>(
    null,
  );

  const [sortBy] = React.useState<SortBy>("DATE_DESC");

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useUserProductsInfinite(12, undefined, sortBy);

  const products = data?.pages.flat() ?? [];

  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleOpenDeleteDialog = (product: ProductToDelete) => {
    setProductToDelete(product);
  };

  const handleCloseDeleteDialog = () => {
    if (!isDeleting) {
      setProductToDelete(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!productToDelete) return;

    try {
      await deleteProduct(productToDelete.id);
      showNotification("Товар успешно удалён", "success");
      handleCloseDeleteDialog();
    } catch {
      showNotification("Не удалось удалить товар", "error");
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <Box sx={productsGridSx}>
        {Array.from({ length: 12 }).map((_, index) => (
          <ProductCardSkeleton key={index} />
        ))}
      </Box>
    );
  }

  // Error state
  if (isError) {
    return (
      <Alert
        severity="error"
        sx={{ borderRadius: 2 }}
        action={
          <Button color="inherit" size="small" onClick={() => refetch()}>
            Повторить
          </Button>
        }
      >
        Ошибка загрузки товаров: {error?.message}
      </Alert>
    );
  }

  // Empty state
  if (products.length === 0) {
    return (
      <EmptyCatalogState
        type="empty"
        title="У вас пока нет товаров"
        description="Начните продавать, создав свой первый товар. Это просто и быстро!"
        actionLabel="Создать товар"
        onAction={() => router.push("/dashboard/products/new")}
      />
    );
  }

  return (
    <Box>
      {/* Products Grid */}
      <Box sx={productsGridSx}>
        {products.map((product) => (
          <UserProductCard
            key={product.id}
            {...product}
            onDeleteClick={handleOpenDeleteDialog}
          />
        ))}
      </Box>

      {/* List Actions */}
      <Box sx={{ display: "flex", justifyContent: "center", mt: 4, gap: 2 }}>
        <Button
          variant="outlined"
          onClick={() => refetch()}
          disabled={isRefetching}
          startIcon={
            isRefetching ? <CircularProgress size={16} /> : <Refresh />
          }
        >
          Обновить
        </Button>

        {hasNextPage && (
          <Button
            variant="outlined"
            onClick={handleLoadMore}
            disabled={isFetchingNextPage}
            size="large"
            sx={{ minWidth: 200 }}
          >
            {isFetchingNextPage ? (
              <CircularProgress size={24} />
            ) : (
              "Загрузить ещё"
            )}
          </Button>
        )}
      </Box>

      <Dialog
        open={Boolean(productToDelete)}
        onClose={handleCloseDeleteDialog}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 600 }}>Удалить товар?</DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 1.5 }}>
            {productToDelete?.name}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Это действие нельзя отменить.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={handleCloseDeleteDialog}
            variant="outlined"
            disabled={isDeleting}
          >
            Отмена
          </Button>
          <Button
            onClick={handleConfirmDelete}
            color="error"
            variant="contained"
            disabled={isDeleting}
            startIcon={isDeleting ? <CircularProgress size={18} /> : undefined}
          >
            {isDeleting ? "Удаление..." : "Удалить"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
