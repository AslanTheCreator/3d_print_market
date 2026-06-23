import type React from "react";
import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  IconButton,
  Stack,
  Typography,
  alpha,
  useTheme,
} from "@mui/material";
import { CameraAltRounded, PersonRounded, StarRounded } from "@mui/icons-material";
import type { UserBaseModel } from "@/entities/user";
import { getImageUrl } from "@/shared/lib";
import { ProfileProgress } from "./ProfileProgress";
import { getProfileCompletion, getProfileTasks } from "./model";

interface ProfileOverviewProps {
  user: UserBaseModel;
  onEditProfile: () => void;
}

export const ProfileOverview = ({
  user,
  onEditProfile,
}: ProfileOverviewProps): React.ReactElement => {
  const theme = useTheme();
  const userName = user.login || user.fullName;
  const userImage = user.image?.[0];
  const userImageSrc = getImageUrl(userImage, "medium");
  const tasks = getProfileTasks(user);
  const completion = getProfileCompletion(tasks);
  const rating = Number.isFinite(user.averageRating)
    ? user.averageRating.toFixed(1)
    : "0.0";

  return (
    <Card
      sx={{
        mb: { xs: 1.25, sm: 2 },
        borderRadius: 2,
        backgroundColor: theme.palette.common.white,
        border: `1px solid ${alpha(theme.palette.common.black, 0.08)}`,
        boxShadow: "0 6px 18px rgba(15, 23, 42, 0.04)",
      }}
    >
      <CardContent sx={{ p: { xs: 2, sm: 2.5, md: 3 } }}>
        <Stack
          direction={{ xs: "column", lg: "row" }}
          spacing={{ xs: 1.5, sm: 3, lg: 4 }}
          divider={
            <Divider
              orientation="vertical"
              flexItem
              sx={{ display: { xs: "none", lg: "block" } }}
            />
          }
        >
          <Stack
            direction="row"
            spacing={{ xs: 1.25, sm: 2.5 }}
            alignItems="center"
            sx={{ flex: "1 1 42%", minWidth: 0 }}
          >
            <Box sx={{ position: "relative", flexShrink: 0 }}>
              <Avatar
                src={userImageSrc}
                alt={userName}
                sx={{
                  width: { xs: 60, sm: 118 },
                  height: { xs: 60, sm: 118 },
                  border: { xs: "2px solid", sm: "3px solid" },
                  borderColor: "background.paper",
                  boxShadow: "0 0 0 1px rgba(15, 23, 42, 0.12)",
                  bgcolor: "primary.light",
                }}
              >
                {!userImageSrc && (
                  <PersonRounded sx={{ fontSize: { xs: 30, sm: 48 } }} />
                )}
              </Avatar>

              <IconButton
                aria-label="Редактировать профиль"
                onClick={onEditProfile}
                sx={{
                  position: "absolute",
                  right: { xs: -4, sm: -6 },
                  bottom: { xs: -4, sm: -6 },
                  width: { xs: 32, sm: 42 },
                  height: { xs: 32, sm: 42 },
                  bgcolor: "background.paper",
                  boxShadow: "0 6px 18px rgba(15, 23, 42, 0.18)",
                  "&:hover": {
                    bgcolor: "background.paper",
                  },
                }}
              >
                <CameraAltRounded sx={{ fontSize: { xs: 18, sm: 20 } }} />
              </IconButton>
            </Box>

            <Box minWidth={0}>
              <Typography
                variant="h4"
                component="h2"
                sx={{
                  fontWeight: 800,
                  lineHeight: 1.15,
                  mb: { xs: 0.5, sm: 1 },
                  fontSize: { xs: "1.15rem", sm: "2rem" },
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  wordBreak: "break-word",
                }}
              >
                {userName}
              </Typography>

              <Typography
                variant="body2"
                color="text.secondary"
                sx={{
                  mb: 1.5,
                  display: { xs: "none", sm: "block" },
                }}
              >
                Профиль Figurzilla
              </Typography>

              <Stack
                direction="row"
                spacing={{ xs: 0.75, sm: 1.25 }}
                alignItems="center"
                sx={{ minWidth: 0 }}
              >
                <StarRounded
                  sx={{ color: "#FFB300", fontSize: { xs: 18, sm: 22 } }}
                />
                <Typography
                  variant="subtitle1"
                  fontWeight={800}
                  sx={{ fontSize: { xs: "0.875rem", sm: "1rem" } }}
                >
                  {rating}
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{
                    fontSize: { xs: "0.75rem", sm: "0.875rem" },
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {user.totalReviews} отзывов
                </Typography>
              </Stack>
            </Box>
          </Stack>

          <ProfileProgress tasks={tasks} completion={completion} />

          <Stack
            spacing={{ xs: 1.25, sm: 2.5 }}
            sx={{
              flex: { xs: "0 1 auto", lg: "0 0 260px" },
              minWidth: 0,
              justifyContent: { xs: "flex-start", lg: "center" },
            }}
          >
            <Button
              variant="contained"
              onClick={onEditProfile}
              sx={{
                minHeight: { xs: 40, sm: 46 },
                borderRadius: 1.5,
                textTransform: "none",
                fontWeight: 800,
                width: "100%",
              }}
            >
              Редактировать профиль
            </Button>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
};
