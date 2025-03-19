import React, { useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  Grid,
  TextField,
  Typography,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import { User } from "@/entities/user";

interface PersonalInfoSectionProps {
  userData: User;
}

const PersonalInfoSection: React.FC<PersonalInfoSectionProps> = ({
  userData,
}) => {
  const [formData, setFormData] = useState<Partial<User>>(userData);

  const handleChange =
    (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setFormData({
        ...formData,
        [field]: e.target.value,
      });
    };
  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          mb={2}
        >
          <Typography variant="h6">Личные данные</Typography>
          <Button startIcon={<EditIcon />} onClick={() => {}}>
            {1 ? "Отменить" : "Редактировать"}
          </Button>
        </Box>

        <Divider sx={{ mb: 2 }} />

        {0 ? (
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="ФИО"
                value={formData.fullName || ""}
                onChange={handleChange("fullName")}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={formData.mail || ""}
                onChange={handleChange("mail")}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            {/* <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Пол"
                select
                SelectProps={{ native: true }}
                value={formData.gender || ""}
                onChange={handleChange("gender")}
              >
                <option value="male">Мужской</option>
                <option value="female">Женский</option>
                <option value="other">Другой</option>
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Адрес"
                multiline
                rows={2}
                value={formData.address || ""}
                onChange={handleChange("address")}
              />
            </Grid> */}
            <Grid item xs={12}>
              <Box display="flex" justifyContent="flex-end" gap={1}>
                <Button variant="outlined" onClick={() => {}}>
                  Отмена
                </Button>
                <Button variant="contained" onClick={() => {}}>
                  Сохранить
                </Button>
              </Box>
            </Grid>
          </Grid>
        ) : (
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2">ФИО</Typography>
              <Typography variant="body1">{userData.fullName}</Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2">Email</Typography>
              <Typography variant="body1">
                {userData.mail || "Не указана"}
              </Typography>
            </Grid>
            {/* <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2">Пол</Typography>
              <Typography variant="body1">
                {userData.gender === "male"
                  ? "Мужской"
                  : userData.gender === "female"
                  ? "Женский"
                  : userData.gender === "other"
                  ? "Другой"
                  : "Не указан"}
              </Typography>
            </Grid>
            <Grid item xs={12}>
              <Typography variant="subtitle2">Адрес</Typography>
              <Typography variant="body1">
                {userData.address || "Не указан"}
              </Typography>
            </Grid> */}
          </Grid>
        )}
      </CardContent>
    </Card>
  );
};

export default PersonalInfoSection;
