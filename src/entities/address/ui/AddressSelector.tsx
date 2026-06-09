import {
  FormControl,
  FormLabel,
  Button,
  Box,
  Skeleton,
  Card,
  CardContent,
  Typography,
  IconButton,
  Stack,
  Chip,
  alpha,
  useTheme,
} from "@mui/material";
import {
  Delete,
  Home,
  RadioButtonChecked,
  RadioButtonUnchecked,
  Add,
} from "@mui/icons-material";
import { Address } from "@/shared/types";

interface AddressSelectorProps {
  addresses: Address[];
  isLoading: boolean;
  selectedAddressId?: number;
  onAddressSelect: (address: Address) => void;
  onAddNewAddress?: () => void;
  onDeleteAddress?: (address: Address) => void;
  showRadio?: boolean;
  showDeleteButton?: boolean;
  showAddButton?: boolean;
}

export const AddressSelector = ({
  addresses,
  selectedAddressId,
  onAddressSelect,
  onAddNewAddress,
  onDeleteAddress,
  isLoading,
  showRadio = true,
  showDeleteButton = false,
  showAddButton = false,
}: AddressSelectorProps) => {
  const theme = useTheme();

  if (isLoading) {
    return (
      <Box>
        {[1, 2, 3].map((i) => (
          <Skeleton
            key={i}
            height={100}
            sx={{ mb: 2, borderRadius: 2 }}
            variant="rectangular"
          />
        ))}
      </Box>
    );
  }

  if (!addresses || (addresses.length === 0 && showAddButton)) {
    return (
      <Box
        sx={{
          textAlign: "center",
          py: 4,
          px: 2,
          border: `2px dashed ${theme.palette.divider}`,
          borderRadius: 2,
          bgcolor: alpha(theme.palette.primary.main, 0.02),
        }}
      >
        <Home
          sx={{
            fontSize: 48,
            color: theme.palette.text.disabled,
            mb: 2,
          }}
        />
        <Typography variant="body1" color="text.secondary" gutterBottom>
          У вас пока нет сохраненных адресов
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={onAddNewAddress}
          sx={{
            mt: 2,
            width: { xs: "100%", sm: "auto" },
          }}
        >
          Добавить адрес
        </Button>
      </Box>
    );
  }

  return (
    <FormControl component="fieldset" fullWidth>
      {showRadio && addresses.length > 0 && (
        <FormLabel
          component="legend"
          sx={{
            mb: 2,
            fontSize: "1rem",
            fontWeight: 600,
            color: "text.primary",
          }}
        >
          Выберите адрес доставки
        </FormLabel>
      )}

      <Stack spacing={2}>
        {addresses.map((address) => {
          const isSelected = selectedAddressId === address.id;

          return (
            <Card
              key={address.id}
              sx={{
                position: "relative",
                cursor: "pointer",
                transition: "all 0.2s ease-in-out",
                border: `2px solid ${
                  isSelected
                    ? theme.palette.primary.main
                    : theme.palette.divider
                }`,
                boxShadow: isSelected
                  ? `0 0 0 1px ${
                      theme.palette.primary.main
                    }, 0 4px 12px ${alpha(theme.palette.primary.main, 0.15)}`
                  : "none",
                bgcolor: isSelected
                  ? alpha(theme.palette.primary.main, 0.02)
                  : "background.paper",
                "&:hover": {
                  borderColor: isSelected
                    ? theme.palette.primary.main
                    : theme.palette.primary.light,
                  boxShadow: `0 2px 8px ${alpha(
                    theme.palette.primary.main,
                    0.1,
                  )}`,
                  transform: "translateY(-2px)",
                },
              }}
              onClick={() => onAddressSelect(address)}
            >
              <CardContent
                sx={{
                  p: { xs: 2, sm: 2.5 },
                  "&:last-child": { pb: { xs: 2, sm: 2.5 } },
                }}
              >
                <Box
                  display="flex"
                  alignItems="flex-start"
                  justifyContent="space-between"
                  gap={2}
                >
                  {/* Левая часть: иконка/радио + информация */}
                  <Box display="flex" alignItems="flex-start" gap={2} flex={1}>
                    {showRadio ? (
                      <Box
                        sx={{
                          color: isSelected
                            ? "primary.main"
                            : "action.disabled",
                          mt: 0.5,
                        }}
                      >
                        {isSelected ? (
                          <RadioButtonChecked />
                        ) : (
                          <RadioButtonUnchecked />
                        )}
                      </Box>
                    ) : (
                      <Box
                        sx={{
                          p: 1,
                          borderRadius: 2,
                          bgcolor: alpha(theme.palette.primary.main, 0.08),
                          color: "primary.main",
                          display: { xs: "none", sm: "flex" },
                        }}
                      >
                        <Home />
                      </Box>
                    )}

                    <Box flex={1}>
                      <Typography
                        variant="body1"
                        fontWeight={isSelected ? 600 : 500}
                        sx={{
                          mb: 0.5,
                          color: isSelected ? "primary.main" : "text.primary",
                        }}
                      >
                        {address.street} {address.houseNumber}
                        {address.apartmentNumber &&
                          `, кв. ${address.apartmentNumber}`}
                      </Typography>

                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ mb: 1 }}
                      >
                        {address.city}, {address.country}
                      </Typography>

                      <Chip
                        label={`Индекс: ${address.index}`}
                        size="small"
                        sx={{
                          height: 24,
                          fontSize: "0.75rem",
                          bgcolor: alpha(theme.palette.secondary.main, 0.08),
                          color: "secondary.main",
                          fontWeight: 500,
                        }}
                      />
                    </Box>
                  </Box>

                  {/* Кнопка удаления */}
                  {showDeleteButton && onDeleteAddress && (
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteAddress(address);
                      }}
                      sx={{
                        color: "text.secondary",
                        transition: "all 0.2s",
                        "&:hover": {
                          color: "error.main",
                          bgcolor: alpha(theme.palette.error.main, 0.08),
                        },
                      }}
                    >
                      <Delete />
                    </IconButton>
                  )}
                </Box>
              </CardContent>
            </Card>
          );
        })}
      </Stack>

      {showAddButton && onAddNewAddress && (
        <Button
          variant="outlined"
          startIcon={<Add />}
          onClick={onAddNewAddress}
          size="large"
          sx={{
            mt: 3,
            alignSelf: "flex-start",
            minWidth: { xs: "100%", sm: 200 },
            fontWeight: 600,
          }}
        >
          Добавить новый адрес
        </Button>
      )}
    </FormControl>
  );
};
