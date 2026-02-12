import { SvgIconComponent } from "@mui/icons-material";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import FaceIcon from "@mui/icons-material/Face";
import StarIcon from "@mui/icons-material/Star";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import VerifiedIcon from "@mui/icons-material/Verified";
import EighteenUpRatingIcon from "@mui/icons-material/EighteenUpRating";
import HourglassTopIcon from "@mui/icons-material/HourglassTop";
import BusinessIcon from "@mui/icons-material/Business";
import TheaterComedyIcon from "@mui/icons-material/TheaterComedy";
import PetsIcon from "@mui/icons-material/Pets";
import MovieFilterIcon from "@mui/icons-material/MovieFilter";
import ViewInArIcon from "@mui/icons-material/ViewInAr";
import BrushIcon from "@mui/icons-material/Brush";
import WidgetsIcon from "@mui/icons-material/Widgets";
import CategoryIcon from "@mui/icons-material/Category";

/**
 * Маппинг названий категорий на MUI-иконки.
 * Ключ — название категории в нижнем регистре для case-insensitive поиска.
 */
const iconMap: Record<string, SvgIconComponent> = {
  "prize figures": EmojiEventsIcon,
  nendroids: FaceIcon,
  "best sellers": StarIcon,
  statues: AccountBalanceIcon,
  "complete models": VerifiedIcon,
  "nsfw (18+)": EighteenUpRatingIcon,
  preorder: HourglassTopIcon,
  companies: BusinessIcon,
  figma: TheaterComedyIcon,
  "bunny suites": PetsIcon,
  franchises: MovieFilterIcon,
  "3d print": ViewInArIcon,
  handmade: BrushIcon,
  other: WidgetsIcon,
};

/**
 * Возвращает MUI-иконку для категории по её названию.
 * Если совпадение не найдено — возвращает CategoryIcon (fallback).
 */
export const getCategoryIcon = (categoryName: string): SvgIconComponent => {
  const normalized = categoryName.toLowerCase().trim();
  return iconMap[normalized] ?? CategoryIcon;
};
