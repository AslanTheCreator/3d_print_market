# Performance-аудит

Первичный замер: 2026-06-23. Статус сверен с кодом и production build: 2026-07-23.

## Ограничения исходного замера

Замер выполнялся в desktop Chromium с fallback API, без реальных изображений, backend latency, mobile throttling и полноценного INP. Поэтому цифры ниже — исторический baseline, а не текущие Core Web Vitals.

- First Load JS ключевых routes: примерно `287–328 kB`.
- Холодная загрузка публичных страниц: примерно `1.0–1.1 MB`.
- В исходный transfer входили `484 kB` старых файлов шрифта; после аудита они заменены одним variable font.

Исторический network transfer после последующих изменений не переснимался.

## Build snapshot 2026-07-23

`npm run build` завершился успешно. First Load JS:

- **`/`** — `305 kB`.
- **`/catalog/[id]/detail`** — `333 kB`.
- **`/catalog/category/[...slug]`** — `305 kB`.
- **`/catalog/search`** — `301 kB`.
- **`/checkout`** — `314 kB`.
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

## Открыто

### Высокий приоритет

- **Повторить production/mobile замеры** — build snapshot обновлён, но baseline network transfer и Core Web Vitals остаётся историческим.
- **Оптимизировать logo assets** — `logo-desktop.png` около `925 kB`, `logo.svg` около `148 kB`.
- **Проверить mobile hydration/CLS** — крупные UI-деревья переключаются через `useMediaQuery`, mobile browser project и SSR match strategy отсутствуют.

### Средний приоритет

- **Решить кеширование каталога** — `/` и category route используют `force-dynamic`.
- **Проверить protected prefetch** — после точечных исправлений повторный network trace не выполнен.
- **Измерить Метрику** — production analytics загружается в root layout.

### Низкий приоритет

- **Контролировать icon imports** — MUI icons используются во многих client-компонентах; массовая замена без bundle evidence не нужна.
- **Ввести budget** — нет CI-порогов для JS, assets и Web Vitals.

## Следующий замер

1. Собрать проект и запустить `npm run test:standalone`.
2. Измерить `/`, поиск, карточку товара, checkout и privacy на mobile и desktop.
3. Зафиксировать JS, fonts, images, failed requests, LCP, CLS и INP/TBT.
4. Только после нового baseline установить performance budget.
