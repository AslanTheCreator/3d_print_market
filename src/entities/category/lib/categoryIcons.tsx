import { SvgIconComponent } from "@mui/icons-material";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import BlockIcon from "@mui/icons-material/Block";
import BrushIcon from "@mui/icons-material/Brush";
import BusinessIcon from "@mui/icons-material/Business";
import CategoryIcon from "@mui/icons-material/Category";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import EighteenUpRatingIcon from "@mui/icons-material/EighteenUpRating";
import FaceIcon from "@mui/icons-material/Face";
import HistoryIcon from "@mui/icons-material/History";
import HourglassTopIcon from "@mui/icons-material/HourglassTop";
import Inventory2Icon from "@mui/icons-material/Inventory2";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import MovieFilterIcon from "@mui/icons-material/MovieFilter";
import PetsIcon from "@mui/icons-material/Pets";
import SportsEsportsIcon from "@mui/icons-material/SportsEsports";
import StarIcon from "@mui/icons-material/Star";
import StyleIcon from "@mui/icons-material/Style";
import TheaterComedyIcon from "@mui/icons-material/TheaterComedy";
import TuneIcon from "@mui/icons-material/Tune";
import VerifiedIcon from "@mui/icons-material/Verified";
import ViewInArIcon from "@mui/icons-material/ViewInAr";
import WidgetsIcon from "@mui/icons-material/Widgets";

/**
 * Маппинг названий категорий на MUI-иконки.
 * Ключ — название категории в нижнем регистре для case-insensitive поиска.
 */
const iconMap: Record<string, SvgIconComponent> = {
  "аниме фигурки": ViewInArIcon,
  "аниме карточки": StyleIcon,
  "манга / книги": MenuBookIcon,
  нерелевантное: BlockIcon,
  "18+": EighteenUpRatingIcon,

  "по состоянию": Inventory2Icon,
  "по франшизе": MovieFilterIcon,
  "по производителю": BusinessIcon,
  "по типу": TuneIcon,
  "по игре / серии": SportsEsportsIcon,
  "по жанру": TheaterComedyIcon,

  "в наличии": CheckCircleIcon,
  предзаказ: HourglassTopIcon,
  "б/у": HistoryIcon,
  "новый, запечатанный": CheckCircleIcon,
  оценённые: VerifiedIcon,
  новая: CheckCircleIcon,

  "scale figure": ViewInArIcon,
  nendoroid: FaceIcon,
  figma: TheaterComedyIcon,
  "chibi / deformed": FaceIcon,
  "garage kit (gk)": WidgetsIcon,
  "gashapon / capsule": CategoryIcon,
  "statue / bust": AccountBalanceIcon,
  "plush / мягкие игрушки": PetsIcon,
  "акрил / стенды": WidgetsIcon,
  "nsfw (18+)": EighteenUpRatingIcon,

  "бустер / бокс": Inventory2Icon,
  "стартовый набор": WidgetsIcon,
  "синглы (отд. карты)": StyleIcon,
  "graded (psa/bgs)": VerifiedIcon,
  "промо карты": StarIcon,

  "манга (том)": MenuBookIcon,
  ранобэ: MenuBookIcon,
  артбук: BrushIcon,
  "манхва / маньхуа": MenuBookIcon,
  "коллекционное издание": StarIcon,
  сёнен: TheaterComedyIcon,
  сёдзё: TheaterComedyIcon,
  сейнен: TheaterComedyIcon,
  джосей: TheaterComedyIcon,

  "vocaloid / hatsune miku": MovieFilterIcon,
  "genshin impact": MovieFilterIcon,
  "honkai: star rail": MovieFilterIcon,
  "azur lane": MovieFilterIcon,
  arknights: MovieFilterIcon,
  "blue archive": MovieFilterIcon,
  "naruto / boruto": MovieFilterIcon,
  "one piece": MovieFilterIcon,
  "demon slayer": MovieFilterIcon,
  "attack on titan": MovieFilterIcon,
  "jujutsu kaisen": MovieFilterIcon,
  "chainsaw man": MovieFilterIcon,
  bleach: MovieFilterIcon,
  "dragon ball": MovieFilterIcon,
  "my hero academia": MovieFilterIcon,
  evangelion: MovieFilterIcon,
  "fate / stay night": MovieFilterIcon,
  "re:zero": MovieFilterIcon,
  "sword art online": MovieFilterIcon,
  "spy x family": MovieFilterIcon,
  overlord: MovieFilterIcon,
  "one punch man": MovieFilterIcon,
  "fullmetal alchemist": MovieFilterIcon,
  "sailor moon": MovieFilterIcon,
  "hunter x hunter": MovieFilterIcon,
  "tokyo revengers": MovieFilterIcon,
  "lycoris recoil": MovieFilterIcon,
  danganronpa: MovieFilterIcon,
  warhammer: MovieFilterIcon,
  "другая франшиза": MovieFilterIcon,

  "good smile company": BusinessIcon,
  "max factory": BusinessIcon,
  kotobukiya: BusinessIcon,
  alter: BusinessIcon,
  "bandai / banpresto": BusinessIcon,
  aniplex: BusinessIcon,
  "sega / s-fire": BusinessIcon,
  furyu: BusinessIcon,
  taito: BusinessIcon,
  freeing: BusinessIcon,
  "union creative": BusinessIcon,
  myethos: BusinessIcon,
  "apex / anigame": BusinessIcon,
  "другой производитель": BusinessIcon,

  "pokémon tcg": SportsEsportsIcon,
  "weiss schwarz": SportsEsportsIcon,
  "cardfight!! vanguard": SportsEsportsIcon,
  "one piece tcg": SportsEsportsIcon,
  "dragon ball super tcg": SportsEsportsIcon,
  "naruto tcg": SportsEsportsIcon,
  "digimon tcg": SportsEsportsIcon,
  "yu-gi-oh!": SportsEsportsIcon,
  "другая игра": SportsEsportsIcon,
};

/**
 * Возвращает MUI-иконку для категории по её названию.
 * Если совпадение не найдено — возвращает CategoryIcon (fallback).
 */
export const getCategoryIcon = (categoryName: string): SvgIconComponent => {
  const normalized = categoryName.toLowerCase().trim();
  return iconMap[normalized] ?? CategoryIcon;
};
