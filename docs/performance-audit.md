# Performance-аудит frontend-проекта Figurzilla

Дата аудита: 2026-06-23  
Проект: Next.js App Router, React 19, TypeScript, MUI, TanStack Query, Zustand, Playwright  
Режим аудита: код приложения не изменялся; создан только этот отчет.

## Executive summary

- Production build проходит, но First Load JS на ключевых страницах высокий: `/catalog/[id]/detail` - 337 kB, `/` и `/catalog/category/[...slug]` - 301 kB, `/catalog/search` - 297 kB, `/favorites` - 296 kB, `/checkout` - 286 kB.
- Runtime desktop-замер на production server с fallback API показал холодную загрузку публичных страниц около 1.0-1.1 MB transfer, из них примерно 500-550 kB JS и 484 kB fonts.
- Основные причины: глобальный client shell, тяжелый header/providers слой, 127 файлов с `use client`, 88 файлов с MUI icons, 5 загружаемых Montserrat woff2 на route, Swiper на product detail.
- На публичных страницах наблюдаются лишние failed prefetch/redirect requests к protected dashboard routes для анонимного пользователя.
- Проверки `lint`, `typecheck`, `architecture:check`, `build`, `test:smoke` прошли. `test:e2e` требует отдельного исправления test-server запуска: тесты фактически доходят до `ok`, но команда зависает/таймаутится из-за несовместимости `next start` с `output: "standalone"` в текущем CI/Playwright сценарии.

## Окружение и команды

Окружение:

- Node.js: `v24.15.0`
- npm: `11.12.1`
- В текущей PowerShell-среде команды запускались через `npm.cmd`, потому что прямой `npm` блокируется execution policy.

Команды:

| Команда | Статус | Комментарий |
| --- | --- | --- |
| `npm.cmd run lint` | passed | ESLint без warning. |
| `npm.cmd run typecheck` | passed | `next typegen` и `tsc --noEmit` прошли. |
| `npm.cmd run architecture:check` | passed | Steiger: `No problems found`. |
| `npm.cmd run build` | passed | Next production build успешен. |
| `npm.cmd run test:smoke` | passed | 14 тестов passed на production server с fallback API. |
| `npm.cmd run test:e2e` | incomplete | Первый прогон вывел `ok` для 34 тестов, но команда таймаутилась через 300s; второй прогон с `node .next/standalone/server.js` тоже таймаутился и ловил проблемы локальной standalone-статики. |

Ограничения замеров:

- Backend не использовался как источник истины; runtime-замеры запускались с `CLIENT_API_BASE_URL=http://127.0.0.1:9` и `API_BASE_URL=http://127.0.0.1:9`.
- Метрики API waterfall для реальных данных, реальные товарные изображения и production latency backend не измерялись.
- INP полноценно не измерялся: нужен интерактивный сценарий с пользовательскими действиями. В отчете вместо этого указан приблизительный TBT/long tasks.
- Lighthouse с mobile throttling не запускался; замеры ниже - desktop Chromium без network throttling.

## Проверенные страницы и flows

- Главная: `/`
- Каталог категории: `/catalog/category/[...slug]`
- Поиск: `/catalog/search?query=test`
- Карточка товара: `/catalog/[id]/detail`
- Auth: `/auth/login`, `/auth/register`
- Checkout: `/checkout`
- Favorites: `/favorites`
- Dashboard redirects: `/dashboard`, `/dashboard/products`, `/dashboard/products/new`, `/dashboard/purchase`, `/dashboard/sales`, `/dashboard/settings`, `/dashboard/security`
- Info pages: `/about`, `/contacts`, `/privacy`, `/user-agreement`
- Error states: `not-found`, `error`, `global-error` просмотрены статически через route/build/client imports.

## Build metrics

Route-size данные из `npm.cmd run build`:

| Route | Type | Size | First Load JS |
| --- | --- | ---: | ---: |
| `/` | dynamic | 6.7 kB | 301 kB |
| `/catalog/category/[...slug]` | dynamic | 6.59 kB | 301 kB |
| `/catalog/search` | static | 4.62 kB | 297 kB |
| `/catalog/[id]/detail` | dynamic | 43.3 kB | 337 kB |
| `/checkout` | static | 18 kB | 286 kB |
| `/favorites` | static | 10.9 kB | 296 kB |
| `/auth/login` | static | 1.58 kB | 233 kB |
| `/auth/register` | static | 1.3 kB | 233 kB |
| `/dashboard` | dynamic | 232 B | 307 kB |
| `/dashboard/products` | dynamic | 8.4 kB | 255 kB |
| `/dashboard/products/new` | dynamic | 185 B | 282 kB |
| `/dashboard/products/[id]/edit` | dynamic | 182 B | 282 kB |
| `/dashboard/purchase` | dynamic | 192 B | 300 kB |
| `/dashboard/sales` | dynamic | 191 B | 300 kB |
| `/dashboard/settings` | dynamic | 20.6 kB | 265 kB |
| `/dashboard/security` | dynamic | 7.01 kB | 232 kB |
| `/about` | static | 1.35 kB | 140 kB |
| `/contacts`, `/privacy`, `/user-agreement` | static | 1.3 kB | 129 kB |

Общие build-факты:

- Shared First Load JS: 102 kB.
- Middleware: 34 kB.
- Самый тяжелый route chunk: `app/(catalog)/catalog/[id]/detail/page` около 50 kB raw file size.
- `.next/app-build-manifest.json`: `/layout` подключает 30 JS-файлов; catalog/search/category/detail - 31-33 JS-файла.

## Runtime metrics

Production server, desktop Chromium, холодный context на route, fallback API.

| Route | TTFB | FCP | LCP | CLS | Requests | JS | Fonts | Total transfer | Failed requests |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| `/` | 106 ms | 248 ms | 248 ms | 0.0002 | 74 | 511 kB | 484 kB | 1049 kB | 3 protected redirects |
| `/catalog/category/32-test` | 34 ms | 152 ms | 152 ms | 0.0003 | 76 | 513 kB | 484 kB | 1051 kB | 3 protected redirects |
| `/catalog/search?query=test` | 4 ms | 72 ms | 292 ms | 0.0002 | 65 | 499 kB | 484 kB | 1010 kB | `/products/find` failed twice with fallback API |
| `/catalog/1/detail` | 36 ms | 132 ms | 132 ms | 0.0002 | 78 | 552 kB | 484 kB | 1090 kB | 3 protected redirects |
| `/auth/login` | 3 ms | 88 ms | 88 ms | 0.0002 | 76 | 509 kB | 484 kB | 1047 kB | 3 protected redirects |
| `/checkout` | 3 ms | 68 ms | 240 ms | 0.0002 | 75 | 510 kB | 484 kB | 1044 kB | 3 protected redirects |
| `/favorites` | 3 ms | 64 ms | 220 ms | 0.0002 | 74 | 507 kB | 484 kB | 1041 kB | 3 protected redirects |
| `/about` | 4 ms | 112 ms | 112 ms | 0.0002 | 73 | 503 kB | 484 kB | 1036 kB | 3 protected redirects |
| `/privacy` | 4 ms | 92 ms | 92 ms | 0.0002 | 60 | 483 kB | 484 kB | 993 kB | none observed |

Вывод по runtime:

- Локальные TTFB/FCP/LCP хорошие, но эти значения нельзя считать production Core Web Vitals из-за fallback API, отсутствия throttling и отсутствия реальных изображений каталога.
- Главная проблема в cold-load transfer: даже статичные/legal страницы могут получать около 1 MB ресурсов из-за глобального JS shell и шрифтов.
- CLS в синтетическом desktop-сценарии низкий.

## Static analysis metrics

- `use client`: 127 файлов.
  - `src/widgets`: 79
  - `src/shared`: 19
  - `src/entities`: 10
  - `src/features`: 9
  - `src/app`: 4
  - `app/*` route clients: 6
- MUI icons:
  - 88 файлов содержат `@mui/icons-material`.
  - 127 import lines с `@mui/icons-material`.
- Heavy/runtime libraries:
  - `swiper`: `src/shared/ui/image-gallery/ImageGallery.tsx`, `src/widgets/product-details/ui/ProductReviewsSection.tsx`
  - `framer-motion`: `src/widgets/dashboard-home/ui/DashboardHomeWidget.tsx`
  - `lodash`: `useCartQuantity.ts`, `useHideOnScroll.ts`
  - `lucide-react`: `EmptyCatalogState.tsx`
  - `next/image`: 10 файлов
- Assets:
  - `src/shared/assets/logo/logo-desktop.png`: 924.4 kB, PNG signature valid.
  - `src/shared/assets/logo/logo.svg`: 148.4 kB.
  - Montserrat woff2 files: 6 files, about 94-100 kB each; runtime loaded 5 fonts, about 484 kB.
  - `src/shared/assets/icons/favorites.png`: 41.7 kB, PNG signature valid.
- `prefetch={false}` найден только в `src/entities/product/ui/ProductCard.tsx`.

## Findings

### Critical

#### C1. Production test-server сценарий несовместим с `output: "standalone"` и делает e2e/performance-проверки нестабильными

Evidence:

- `next.config.mjs` использует `output: "standalone"`.
- `package.json` содержит `start: "next start"`.
- `playwright.config.ts` при `PLAYWRIGHT_USE_PRODUCTION_SERVER=true` по умолчанию запускает `npx next start -p ${PORT}`.
- `.github/workflows/frontend-ci.yml` smoke step также запускает `npx next start -p 3010`.
- Локальный e2e-прогон с `next start` вывел `ok` для всех 34 тестов, но команда не завершилась до timeout 300s, а Next напечатал предупреждение: `next start` не предназначен для `output: "standalone"`.
- Прямой запуск `node .next/standalone/server.js` из workspace без копирования `.next/static` внутрь `.next/standalone` дал ошибки статических media. Dockerfile это копирование делает, но CI smoke/e2e до Docker build его не использует.

Impact:

- CI и локальные production-like проверки могут зависать или проверять не тот runtime.
- Performance-аудит и e2e не дают надежного final status, хотя `build` и `smoke` через вручную поднятый server прошли.

Recommendation:

- Выбрать один production-like test server path:
  - либо запускать e2e/smoke через собранный Docker image;
  - либо перед `node .next/standalone/server.js` копировать `public` и `.next/static` в `.next/standalone`;
  - либо использовать отдельный non-standalone режим для CI webServer, если нужен именно `next start`.
- Синхронизировать `package.json`, `playwright.config.ts` и `.github/workflows/frontend-ci.yml`.

Expected effect:

- Надежные e2e/performance-проверки без зависаний.
- Корректная проверка production asset serving.

### Important

#### I1. Глобальный client shell делает даже статичные страницы тяжелыми

Evidence:

- `app/layout.tsx` оборачивает весь сайт в `AppProviders` и `AppLayout`.
- `src/app/providers/AppProviders.tsx` - client component; внутри `ThemeProvider`, `AuthProvider`, `QueryProvider`, `NotificationProvider`.
- `src/app/layouts/AppLayout.tsx` всегда рендерит `Header` и `Footer`; `Header` - client component.
- `.next/app-build-manifest.json`: `/layout` подключает 30 JS-файлов.
- Runtime: `/privacy` без observed failed requests все равно загрузил 60 resources, 483 kB JS и 484 kB fonts.

Impact:

- Статичные/legal страницы получают стоимость интерактивного marketplace shell.
- Public catalog/auth/checkout маршруты стартуют с 500+ kB JS transfer в холодном desktop context.

Recommendation:

- Разделить shell на server/static части и client islands.
- Проверить, можно ли вынести `AuthProvider`, `QueryProvider`, `NotificationProvider` ниже, только туда, где они нужны.
- Разделить `Header` на статичную server-разметку и отдельные client-компоненты для search/actions/mobile scroll.
- Не ломать MUI theme setup: сначала сделать spike на одной статичной группе страниц.

Expected effect:

- Снижение First Load JS для info/auth/public pages.
- Меньше hydration work и script requests.

Status 2026-06-30, I1 v2:

- Принято продуктовое ограничение: единые `Header` и `Footer`, глобальные `AppProviders` и все бизнес-возможности header остаются на всех страницах.
- Реализована оптимизация внутри единого shell: `CategoriesDrawer`/`CategoriesMenu` и `PendingActionsPopover` вынесены в lazy client chunks, pending action model больше не импортирует MUI icon components, `useHideOnScroll` больше не тянет `lodash/throttle`.
- Для footer-ссылок на `/dashboard/*` отключен Next prefetch, чтобы анонимный пользователь не получал лишние protected prefetch/redirect requests.
- Build после изменения: `/layout` подключает 29 файлов вместо 30; `HeaderActions -> PendingActionsPopover` вынесен в `static/chunks/2600...js` около 9.6 kB; `HeaderCategoryButton -> CategoriesDrawer` вынесен в отдельные lazy chunks `6718`, `6574`, `3820`, `2740`.
- First Load JS после `npm.cmd run build`: `/about` - 140 kB, `/privacy` - 130 kB, `/` - 301 kB, `/catalog/search` - 296 kB, `/favorites` - 296 kB. Из-за сохранения полного глобального shell снижение First Load JS ограничено; основной эффект I1 v2 - меньше cold-load кода закрытых header-сценариев и меньше лишних protected prefetch-запросов.
- Проверки: `npm.cmd run lint`, `npm.cmd run typecheck`, `npm.cmd run architecture:check`, `npm.cmd run build` прошли.

#### I2. Шрифты Montserrat дают около 484 kB transfer на route

Evidence:

- `src/app/config/fonts.ts` подключает 6 локальных woff2: weights 400, 500, 600, 700, 800, 900.
- Runtime resource timing показывает 5 font requests и около 484 kB font transfer на route.
- Source assets суммарно около 582 kB.

Impact:

- Шрифты сравнимы по весу с JS на каждой cold-load странице.
- На мобильной сети это будет заметно по FCP/LCP, даже при `display: "swap"`.

Recommendation:

- Проверить реальные используемые `fontWeight` и оставить минимальный набор.
- Рассмотреть variable font Montserrat вместо нескольких отдельных woff2.
- Если нужен полный Cyrillic coverage, отдельно проверить subset strategy и визуальные требования.

Expected effect:

- Существенное снижение transfer на всех страницах.

#### I3. Product detail - самый тяжелый маршрут по JS

Evidence:

- Build: `/catalog/[id]/detail` - 43.3 kB route size, 337 kB First Load JS.
- Runtime: 78 requests, 56 JS requests, 552 kB JS transfer, 1090 kB total transfer.
- `ProductDetailsWidget` является client component и выбирает mobile/desktop через `useMediaQuery`.
- `ImageGallery` и `ProductReviewsSection` используют Swiper.

Impact:

- Карточка товара - ключевой коммерческий route; лишний JS напрямую влияет на perceived performance и INP.
- Swiper/reviews/related sections могут попадать в начальную стоимость даже когда часть UI ниже первого экрана.

Recommendation:

- Отложить тяжелые секции: reviews carousel, fullscreen gallery, related products.
- Проверить dynamic import для Swiper-зависимых частей.
- Сохранить SSR initial product data, но сократить client boundary вокруг чистого контента.
- Mobile/desktop ветки грузить осторожно: не допускать загрузки обеих тяжелых реализаций без необходимости.

Expected effect:

- Снижение route JS для product detail.
- Меньше hydration и long tasks на карточке товара.

#### I4. Public pages инициируют лишние prefetch/redirect requests к protected dashboard routes

Evidence:

- Runtime failed requests на `/`, `/catalog/category/32-test`, `/catalog/1/detail`, `/auth/login`, `/checkout`, `/favorites`, `/about`:
  - `/auth/login?redirect=%2Fdashboard%2Fproducts%2Fnew`
  - `/auth/login?redirect=%2Fdashboard%2Fproducts`
  - `/auth/login?redirect=%2Fdashboard%2Fsales`
- `prefetch={false}` найден только в `ProductCard`.
- Protected dashboard links существуют в dashboard navigation и pending-actions surface.
- Middleware редиректит `/dashboard` и `/dashboard/:path*` на `/auth/login`.

Impact:

- Анонимный public traffic создает лишние requests и redirects.
- Метрики network waterfall загрязняются failed prefetch.
- Сервер получает бесполезную работу на protected routes.

Recommendation:

- Для auth-dependent dashboard links поставить `prefetch={false}`.
- Не рендерить protected links до завершения auth initialization, если они недоступны анониму.
- При исправлении подтвердить точный initiator через Playwright trace/DevTools, потому что runtime evidence показывает эффект, а не единственный источник.

Expected effect:

- Меньше фоновых requests и redirect noise.
- Чище network waterfall и ниже серверная нагрузка для public pages.

#### I5. Главная и категория принудительно dynamic, что ограничивает кеширование

Evidence:

- `app/page.tsx`: `export const dynamic = "force-dynamic"`.
- `app/(catalog)/catalog/category/[...slug]/page.tsx`: `export const dynamic = "force-dynamic"`.
- Обе страницы делают server-side initial product fetch через `productApi.getProducts`.
- Category metadata/page используют `cache()` для category path, но route все равно dynamic.

Impact:

- Анонимные каталоговые страницы нельзя эффективно отдать как prerendered/revalidated content.
- TTFB и backend load будут зависеть от API на каждый request.

Recommendation:

- Согласовать с backend/product owner допустимую свежесть для anonymous catalog first page.
- Если допустима задержка свежести, рассмотреть `revalidate` или server-side cache для category metadata/categories и first products page.
- Не менять API contract и поля без backend-согласования.

Expected effect:

- Ниже TTFB и backend pressure на public catalog traffic.

#### I6. Product infinite queries переопределяют retry и могут дублировать failed requests

Evidence:

- `src/shared/lib/hooks/useInfiniteProducts.ts` задает `retry = 2`.
- Это обходит более аккуратную default retry policy из `QueryProvider`.
- Runtime `/catalog/search?query=test` при fallback API показал два failed `/products/find` requests.
- `SearchProducts` не передает `isError` в `ProductCatalog`, поэтому API-failure может выглядеть как пустое/зависшее состояние.

Impact:

- Ошибки API могут множить сетевую нагрузку.
- Пользователь поиска может не получить явный error state.

Recommendation:

- Использовать общий `shouldRetryQuery` policy или передавать retry function в infinite product queries.
- Для search page передавать `isError` и `onRetry` в `ProductCatalog`.
- Для 4xx/backend validation ошибок не ретраить.

Expected effect:

- Меньше лишних API calls при ошибках.
- Лучше perceived performance и error UX поиска.

#### I7. Крупные локальные logo assets попадают в критичный shell

Evidence:

- `logo-desktop.png`: 924.4 kB source asset.
- `favorites.png`: 41.7 kB.
- `HeaderLogo` и mobile `Header` используют `next/image` с `priority` для logo.
- Header присутствует в глобальном AppLayout.

Impact:

- Большой source PNG увеличивает размер deploy artifacts и работу image optimizer.
- Header является first-viewport элементом, поэтому любые проблемы с logo asset влияют на все страницы.

Recommendation:

- Перегенерировать desktop logo в реальном отображаемом размере или заменить на оптимизированный SVG/WebP/AVIF, если визуально допустимо.
- Оставить `priority` только для реально видимого logo variant на текущем breakpoint.

Expected effect:

- Ниже deploy/static media size и меньше нагрузка image optimizer.

#### I8. Production analytics в head может влиять на реальные Core Web Vitals

Evidence:

- `MetrikaHead` вставляет production-only inline script и грузит `https://mc.yandex.ru/metrika/tag.js`.
- Включены `webvisor`, `clickmap`, `trackLinks`, ecommerce.

Impact:

- Third-party analytics может влиять на TBT/INP в реальном production, хотя локальный fallback-замер это не отражает полноценно.

Recommendation:

- В реальном production audit отдельно снять Lighthouse/WebPageTest/Chrome trace с включенной Метрикой.
- Проверить, можно ли отложить часть analytics до idle/consent/после первого paint без потери бизнес-требований.

Expected effect:

- Более точная оценка реальных Core Web Vitals и возможное снижение main-thread contention.

### Minor

#### M1. MUI icons imports стоит постепенно стандартизировать

Evidence:

- 127 import lines с `@mui/icons-material`.
- 88 файлов с icon imports.
- Есть barrel imports вида `import { Add, Remove } from "@mui/icons-material"`.

Impact:

- Tree-shaking обычно помогает, но такой объем icon imports увеличивает риск распухания chunks и build/transpile cost.

Recommendation:

- При будущих правках предпочитать точечные imports и не добавлять новые barrel imports без причины.
- Не делать отдельный большой refactor только ради icons без bundle analyzer подтверждения.

#### M2. Swiper и framer-motion используются точечно, но требуют lazy strategy

Evidence:

- `swiper` только в gallery/reviews.
- `framer-motion` только в dashboard home.

Impact:

- Не глобальная проблема, но эти библиотеки не должны попадать в first-load публичных routes сверх необходимости.

Recommendation:

- При оптимизации product detail/dashboard проверять, остались ли эти зависимости только в route chunks, а не в shared shell.

#### M3. Middleware сам по себе не является performance-проблемой

Evidence:

- `middleware.ts` проверяет только auth cookies и matcher ограничен `/dashboard`, `/dashboard/:path*`.
- Build size middleware: 34 kB.

Impact:

- Основной issue не middleware, а prefetch protected routes с public pages.

Recommendation:

- Не оптимизировать middleware первым; сначала убрать лишние protected route prefetch.

## Quick wins

- Отключить prefetch для protected dashboard/pending action links.
- Уменьшить набор Montserrat weights или перейти на variable font после визуальной проверки.
- Оптимизировать `logo-desktop.png`.
- Передавать `isError/onRetry` в `SearchProducts` и убрать безусловный `retry=2` для product infinite queries.
- Исправить CI/Playwright production server command под standalone output.

## Рекомендации, требующие согласования

- Кеширование `/` и `/catalog/category/[...slug]`: нужно согласовать допустимую свежесть каталога с backend/product owner.
- Отложенная Метрика: нужно согласовать с аналитикой, можно ли менять момент загрузки `webvisor/clickmap`.
- Product detail code-splitting: нужно проверить UX на mobile/desktop, чтобы lazy loading галереи/reviews не ухудшил first interaction.

## Что не проверялось

- Реальные production Core Web Vitals из Chrome UX Report или аналитики.
- Mobile throttling Lighthouse.
- Реальные backend latency и реальные изображения товаров/CDN.
- Authenticated dashboard с настоящими пользовательскими данными.
- Bundle analyzer с module attribution: новая dependency не добавлялась, отдельный analyzer не подключался.

## Приоритизация

Critical:

- Блокирует надежный production-like запуск, CI/e2e/performance validation или может сделать релизный runtime непроверенным.
- Сейчас сюда попадает C1.

Important:

- Существенно увеличивает First Load JS, transfer, hydration или network noise на ключевых routes.
- Влияет на главную, каталог, product detail, checkout/favorites/auth или массовые public pages.
- Требует focused refactor или согласования, но имеет понятный performance effect.

Minor:

- Локальные оптимизации без доказанного сильного влияния на Core Web Vitals.
- Cleanup imports/assets/tooling, который лучше делать постепенно и подтверждать метриками.

## Suggested next steps

1. Исправить production-like test server path для standalone и повторить `npm run test:e2e` без таймаутов.
2. Добавить lightweight performance smoke на 5 routes: `/`, `/catalog/search`, `/catalog/[id]/detail`, `/checkout`, `/privacy`, с budgets по JS/font/failed requests.
3. Сделать отдельный optimization PR для шрифтов и protected-link prefetch.
4. После этого переснять build/runtime metrics и сравнить с таблицами из этого отчета.
