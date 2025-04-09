"use client";

import {
  Box,
  Button,
  MenuItem,
  TextField,
  Typography,
  InputAdornment,
} from "@mui/material";
import { useEffect, useState } from "react";
import { ProductCreateModel } from "@/entities/product/model/types";
import { useCreateProduct } from "../hooks/useCreateProduct";
import { categoryApi } from "@/entities/category/api/categoryApi";
import { CategoryModel } from "@/shared/model/types/category";

const currencies = ["₽", "$", "€"];

export const CreateProductForm = () => {
  const { mutate: createProduct, isPending } = useCreateProduct();
  const [form, setForm] = useState<ProductCreateModel>({
    name: "",
    price: 0,
    currency: "RUB",
    description: "",
    categoryId: 1,
    imageIds: [],
    count: 1,
    originality: "NEW",
  });

  const [categories, setCategories] = useState<CategoryModel[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const data = await categoryApi.getCategories();
      console.log(data);
      setCategories(data);
    };
    fetchData();
  }, []);

  const handleChange = (key: keyof ProductCreateModel, value: any) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = () => {
    createProduct(form);
  };

  return (
    <Box
      component="form"
      noValidate
      autoComplete="off"
      sx={{
        p: 2,
        maxWidth: 500,
        mx: "auto",
        display: "flex",
        flexDirection: "column",
        gap: 2,
      }}
    >
      <Typography variant="h5" fontWeight={600} textAlign="center">
        Создание товара
      </Typography>

      <TextField
        select
        label="Категория"
        value
        onChange={(e) => handleChange("categoryId", e.target.value)}
        fullWidth
      >
        {categories.map((cat) => (
          <MenuItem key={cat.id} value={cat.id}>
            {cat.name}
          </MenuItem>
        ))}
      </TextField>

      <TextField
        label="Название товара"
        value={form.name}
        onChange={(e) => handleChange("name", e.target.value)}
        fullWidth
      />

      <TextField
        type="file"
        inputProps={{ accept: "image/*" }}
        onChange={(e) => {
          const file = (e.target as HTMLInputElement).files?.[0];
          if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
              handleChange("imageIds", reader.result);
            };
            reader.readAsDataURL(file);
          }
        }}
        fullWidth
      />

      <TextField
        type="number"
        label="Цена"
        value={form.price}
        onChange={(e) => handleChange("price", +e.target.value)}
        InputProps={{
          endAdornment: (
            <InputAdornment position="end">
              <TextField
                select
                value={form.currency}
                onChange={(e) => handleChange("currency", e.target.value)}
                variant="standard"
              >
                {currencies.map((curr) => (
                  <MenuItem key={curr} value={curr}>
                    {curr}
                  </MenuItem>
                ))}
              </TextField>
            </InputAdornment>
          ),
        }}
        fullWidth
      />

      <TextField
        label="Описание"
        multiline
        minRows={3}
        value={form.description}
        onChange={(e) => handleChange("description", e.target.value)}
        fullWidth
      />

      <Button
        variant="contained"
        onClick={handleSubmit}
        disabled={isPending}
        size="large"
      >
        Разместить товар
      </Button>
    </Box>
  );
};
