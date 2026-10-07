# Stage 25 — B34: размеры изображений

Проверено 07.10.2026 в Chromium на локальном Next dev (3025), свежий browser context
для каждого viewport/DPR. API товаров/metadata подменён; raster fixture 1200×1200
проходит настоящий Next optimizer, q=75. Это Lab-замер синтетического изображения,
не production CDN и не проверка реального backend.

`sizes` учитывает 16/32 px padding Container, расширение mobile grid и padding
GridItem, gaps 8/12/20 px, auto-fill minima 156/190 px, card border и max-width 1504 px.
Grid и геометрия карточек не изменены. Выбранный source не меньше отображаемого
размера × DPR; тест также проверяет минимальный достаточный кандидат srcset.

| Viewport | DPR | clientWidth до/после | currentSrc w до → после | transferSize B до → после |
| --- | --- | --- | --- | --- |
| 600 | 1 | 169 / 169 | 384 → 256 | 66918 → 29340 |
| 900 | 1 | 192 / 192 | 384 → 256 | 66918 → 29340 |
| 1376 | 1 | 200 / 200 | 640 → 256 | 159600 → 29340 |
| 1504 | 1 | 221 / 221 | 640 → 256 | 159600 → 29340 |
| 600 | 2 | 169 / 169 | 640 → 384 | 159600 → 66918 |
| 900 | 2 | 192 / 192 | 640 → 384 | 159600 → 66918 |
| 1376 | 2 | 200 / 200 | 1080 → 640 | 305988 → 159600 |
| 1504 | 2 | 221 / 221 | 1080 → 640 | 305988 → 159600 |

Полный currentSrc и дробный renderedWidth сохранены в `image-sizing.json`
attachments: `/__playwright-image-sizing.png` через `/_next/image?url=…&w=…&q=75`.
Дополнительно проверены 393/723/724/891/892/899/1093/1094/1303/1304/1700 px при DPR 1/2.

Мобильный знак растеризован из сохранённого `logo.svg` посредством установленного
Sharp: density=300, resize contain на прозрачном квадрате, WebP lossless.
Файлы 44/88/132 px занимают 2526/6496/10988 B вместо исходных 143854 B.
`picture` выбирает 1x/2x/3x; повторное lossy-преобразование отключено, width/height
остаются 44×44 CSS px. Desktop-композиция не менялась.

Сравнение загруженных raster assets с исходным SVG при 44 и 88 px:
средняя абсолютная RGB-разница на фоне #4c3351 равна 0, изображения также
просмотрены визуально. Transfer при DPR 1/2 равен 2826/6796 B. Холодная мобильная
загрузка на Pixel 5 (DPR 2.75, Slow 4G/CPU ×4) дала transfer логотипа
60531 → 11288 B; CLS до/после 0. После изменения desktop logo transfer 5904 B,
CLS 0. Mobile и desktop не запрашивают знак другой версии; SSR gate без JS проходит.

Числа подтверждают уменьшение переданных байтов в этих сценариях. Изменение LCP
или скорости реальных страниц не заявляется: сетевые/серверные условия и изображения
пользователей отличаются. JSON/PNG находятся в локальных `test-results/stage25-*`
и заново создаются тестами; generated hashes намеренно не закрепляются.

Проверки: lint, typecheck, architecture:check, production build и HTTP smoke
(15/15) прошли. На production повторные `image-sizing` (32/32) и SSR/cold
mobile/desktop gates (3/3) прошли. Полный e2e дал 582 passed / 8 failed:
один сбой нового spec из-за чтения во время замены DOM устранён ожиданием
декодированного snapshot; повтор всего нового spec проходит. Остальные семь
сбоев находятся в `controls-focus`, `product-search-session`, трёх сценариях
`auth-dialogs.mobile`, reset-ожидании `mobile-rendering.mobile` и redirect timer
`product-publication.mobile`. Эти сценарии не исправлялись в B34; чистый полный
e2e-прогон не подтверждён. Подробности сохранены в
`test-results/stage25-full-report.json` и error-context/PNG/video attachments.
