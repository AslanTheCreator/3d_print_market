# Performance-аудит

Первичный замер: 2026-06-23. Статус сверен с кодом, production build и
standalone Lab-прогоном: 2026-07-28.

## Ограничения исходного замера

Замер выполнялся в desktop Chromium с fallback API, без реальных изображений, backend latency, mobile throttling и полноценного INP. Поэтому цифры ниже — исторический baseline, а не текущие Core Web Vitals.

- First Load JS ключевых routes: примерно `287–328 kB`.
- Холодная загрузка публичных страниц: примерно `1.0–1.1 MB`.
- В исходный transfer входили `484 kB` старых файлов шрифта; после аудита они заменены одним variable font.

Исторический network transfer после последующих изменений не переснимался.

## Build snapshot 2026-07-28

`npm run build` завершился успешно. First Load JS:

- **`/`** — `286 kB`.
- **`/catalog/[id]/detail`** — `305 kB`.
- **`/catalog/category/[...slug]`** — `286 kB`.
- **`/catalog/search`** — `286 kB`.
- **`/checkout`** — `309 kB`.
- **`/privacy`** — `130 kB`.

Shared First Load JS — `102 kB`. Это build-time размеры Next.js, а не Core Web Vitals и не объём полного network transfer.

Крупнейшие статические brand assets:

- `logo-desktop.png` — `946,540` bytes;
- `logo.svg` — `151,982` bytes.

## Выполнено

- Montserrat заменён одним `Montserrat-Variable.woff2`.
- Drawer категорий и popover действий header загружаются lazy.
- Reviews и related products в карточке товара вынесены в lazy/deferred sections.
- Для части protected links отключён prefetch.
- Production-like проверки переведены на standalone runner.
- Крупные checkout, settings, product form и gallery компоненты декомпозированы.
- Header и product detail переведены на одно CSS-first DOM-дерево без
  render-time `useMediaQuery`; responsive asset для header выбирается через
  `picture`.
- Добавлен отдельный Pixel 5 Playwright project, no-JS SSR-проверка и CI gate
  CLS `≤0.1` по session-window алгоритму.

## Lab snapshot 2026-07-28

Один локальный standalone-прогон с fixture API подтвердил:

- `/about`, Slow 4G / CPU ×4: CLS `0`, LCP `784 ms`, transfer `447,368 B`;
- fixture product detail, без throttling: CLS `0`, LCP `224 ms`, transfer
  `626,659 B`;
- mobile browser не запросил `logo-desktop`, а cold desktop не запросил
  compact-only logo assets.

В E2E внешний тег Яндекс Метрики заменён локальным пустым ответом, поэтому
transfer size отражает frontend assets, но не production analytics traffic.

Это диагностические Lab-значения одного запуска. Они не являются production
Core Web Vitals, field p75 или performance budget.

## Открыто

### Высокий приоритет

- **Повторить production/mobile замеры** — build snapshot обновлён, но baseline network transfer и Core Web Vitals остаётся историческим.
- **Оптимизировать logo assets** — `logo-desktop.png` около `925 kB`, `logo.svg` около `148 kB`.

### Средний приоритет

- **Решить кеширование каталога** — `/` и category route используют `force-dynamic`.
- **Проверить protected prefetch** — после точечных исправлений повторный network trace не выполнен.
- **Измерить Метрику** — production analytics загружается в root layout.

### Низкий приоритет

- **Контролировать icon imports** — MUI icons используются во многих client-компонентах; массовая замена без bundle evidence не нужна.
- **Расширить budget** — CLS gate добавлен, но нет CI-порогов для JS, assets,
  LCP и INP.

## Следующий замер

1. Измерить `/`, поиск, карточку товара, checkout и privacy на staging с
   совместимым backend на mobile и desktop.
2. Зафиксировать JS, fonts, images, failed requests, LCP, CLS и INP/TBT.
3. Собрать production field p75 через RUM без чувствительных данных.
4. Только после репрезентативного baseline установить дополнительные budgets.
