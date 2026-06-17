# Аудит готовности Figurzilla frontend к production

Дата аудита: 2026-06-17.

## Вывод

Frontend имеет хорошую базу для MVP: Next.js App Router, строгий TypeScript, FSD, Steiger, CI, Docker standalone, runtime API config, security headers, error/not-found страницы, sitemap/robots, smoke/e2e тесты и документация backend-контракта.

К публичному production-запуску проект пока не готов без закрытия блокеров. Основные причины: JS-readable auth tokens, секреты в `docker-compose.yml`, отсутствие идемпотентности checkout, недостаточная наблюдаемость, ненадежный production-like e2e запуск и слабое покрытие ключевых пользовательских сценариев.

## Область проверки

Проверялись:

- структура `app`, `src`, `entities`, `features`, `widgets`, `shared`;
- routing, metadata, error boundaries, sitemap, robots;
- auth, token refresh, middleware, protected routes;
- API client, runtime env config, backend contract;
- checkout, orders, image loading, adult category gate;
- CI, Dockerfile, docker-compose, npm scripts;
- тесты smoke/e2e;
- TypeScript, lint, FSD architecture, dependency audit;
- типовые production-практики: security, observability, release, test strategy, operations.

Backend не проверялся напрямую. Backend-зависимости ниже основаны только на frontend-коде и `docs/backend-contract.md`.

## Проверки

| Проверка | Статус | Комментарий |
| --- | --- | --- |
| `npm.cmd run lint` | passed | ESLint без warnings. |
| `npm.cmd run typecheck` | passed | `next typegen` и `tsc --noEmit` прошли. |
| `npm.cmd run architecture:check` | passed | Steiger: `No problems found`. |
| `npm.cmd run build` | passed | Production build успешно собран. |
| `npm.cmd audit --omit=dev --audit-level=high` | passed | `found 0 vulnerabilities`. |
| `npm.cmd run test:smoke` | passed | 14/14 при ручном запуске standalone server с тестовым API URL. |
| `npm.cmd run test:e2e` | unstable / failed | Запуски уходили в timeout; production-like standalone без скопированных `.next/static` и `public` ломает hydration, обычный dev-run дал flaky/failing adult-category тесты. |

Важно: `playwright.config.ts` и CI используют `next start` для production-like сценария, но при `output: "standalone"` Next выводит предупреждение, что нужно использовать `node .next/standalone/server.js`. Локальный запуск `node .next/standalone/server.js` требует такой же раскладки assets, как в Dockerfile: `public` и `.next/static` должны быть рядом с standalone runtime.

## Уже хорошо

- FSD-границы контролируются `steiger`, текущая проверка проходит.
- TypeScript strict включен.
- CI содержит install, audit, typecheck, lint, architecture check, build, smoke, e2e, Docker build и `docker compose config`.
- `Dockerfile` использует Next standalone output и запускает runtime от non-root `node`.
- Есть runtime endpoint `/api/config`, чтобы не зашивать browser API URL только на build time.
- Есть базовые security headers: CSP, HSTS, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`.
- Есть глобальные error UI: `app/error.tsx`, `app/global-error.tsx`, `app/not-found.tsx`.
- Есть SEO-база: metadata, canonical, `robots.ts`, `sitemap.ts`, noindex для приватных/служебных страниц.
- Есть loading/error/empty state компоненты и они уже применяются во многих пользовательских местах.
- Есть документированный backend production contract в `docs/backend-contract.md`.
- Runtime dependency audit на high vulnerabilities сейчас чистый.

## Критично до production

### 1. Перевести auth на HttpOnly cookie contract

Сейчас frontend хранит `access_token` и `refresh_token` через `js-cookie` в `src/shared/lib/token/tokenStorage.ts`, добавляет `Authorization: Bearer` в `src/shared/api/axios/instances.ts` и отправляет refresh token через `X-Refresh-Token` в `src/shared/api/authApi.ts`.

Риск: при XSS или стороннем script execution токены доступны JavaScript. Для marketplace с личным кабинетом, заказами и платежными реквизитами это production-blocker.

Что сделать:

- дождаться backend-контракта из `docs/backend-contract.md`: login/verify/refresh/logout через HttpOnly cookies;
- включить `withCredentials`;
- убрать JS-readable token storage;
- убрать `Authorization: Bearer` и `X-Refresh-Token` после миграционного окна;
- добавить CSRF-защиту для state-changing requests;
- валидировать protected access не только по наличию cookie в `middleware.ts` и `app/(user)/dashboard/layout.tsx`, а по реальному backend/session contract.

### 2. Убрать и ротировать секреты из `docker-compose.yml`

В `docker-compose.yml` есть hardcoded DB/MinIO credentials и SMTP password. Значение секрета намеренно не приводится в этом документе.

Риск: если репозиторий доступен вне локальной машины или история уже ушла в remote, секрет считается скомпрометированным.

Что сделать:

- немедленно ротировать SMTP password и любые реальные ключи;
- вынести секреты в `.env`, secret manager или CI/CD secrets;
- оставить в repo только безопасные placeholder values;
- отдельно решить, нужна ли очистка git history, если секрет уже был опубликован.

### 3. Сделать checkout идемпотентным

`src/entities/order/api/orderApi.ts` создает заказ через `POST /order/BOOKED`, а `src/widgets/checkout/model/useCheckoutSubmit.ts` отправляет заказы по одному и поддерживает retry failed orders.

Риск: двойной клик, timeout, retry, refresh страницы или повтор сети может создать дубли заказов. Для marketplace это денежный и операционный риск.

Что сделать:

- после backend-готовности добавить `Idempotency-Key` для создания заказа;
- хранить ключ на попытку checkout/retry, а не генерировать новый при каждом сетевом повторе одного и того же payload;
- покрыть тестами double submit, network timeout, partial success и retry.

### 4. Добавить production observability

Сейчас есть `console.error` и Яндекс.Метрика, но нет полноценного error tracking, runtime логирования инцидентов, алертов и трассировки.

Риск: production-инциденты будут обнаруживаться поздно, без stack trace, browser context, release version и user impact.

Что сделать:

- подключить error tracking для client/server ошибок;
- завести release/version tagging;
- настроить uptime/health checks;
- определить алерты по 5xx, JS errors, checkout/auth failures;
- описать incident/runbook flow.

### 5. Починить production-like e2e launcher

Текущие e2e не дают надежный сигнал production readiness:

- `playwright.config.ts` запускает `next start`, хотя проект собирается с `output: "standalone"`;
- CI smoke step тоже использует `npx next start`;
- standalone runtime локально требует assets, которые Dockerfile копирует отдельно;
- обычный `test:e2e` в текущей среде ушел в timeout и показал нестабильность adult-category тестов.

Что сделать:

- либо тестировать Docker image как production artifact;
- либо добавить test helper, который перед e2e копирует `public` и `.next/static` в `.next/standalone`;
- либо для e2e использовать non-standalone production server, но тогда явно разделить "app e2e" и "artifact e2e";
- устранить flaky adult-category сценарии и убрать зависание команды после прохождения/падения тестов.

## Важно до beta / публичного MVP

### 1. Расширить e2e покрытие ключевых сценариев

Сейчас e2e покрывает anonymous access и adult-category gate. Нет надежных сценариев:

- login/register/verify/password reset;
- создание и редактирование товара;
- seller settings: addresses, shipping, payment, social networks;
- cart add/update/remove;
- checkout happy path, partial failure, retry;
- seller/customer order transitions;
- favorites authenticated flow;
- logout/session expiration.

Нужны стабильные test accounts, test data seeding и договоренность с backend о cleanup.

### 2. Усилить CSP и frontend security

В `next.config.mjs` сейчас:

- `script-src` содержит `'unsafe-inline'` для Метрики;
- `connect-src` разрешает `http: https: ws: wss:`;
- production image sources включают HTTP endpoint по IP;
- CSP не использует nonce/hash.

После auth migration это все равно стоит ужесточить:

- сузить `connect-src` до реальных origins;
- убрать HTTP image origin из production;
- рассмотреть nonce/hash для inline analytics;
- проверить privacy/legal требования для Webvisor/ecommerce tracking.

### 3. Убрать `any` из shared hooks и UI

Найдено 9 вхождений `any`, включая:

- `src/shared/lib/hooks/useFormInitializer.ts`;
- `src/shared/lib/hooks/useBatchForm.ts`;
- `src/entities/account/model/queryKeys.ts`;
- `src/features/auth/ui/PasswordResetDialog.tsx`.

Это не блокер, но shared hooks с `any` размывают strict mode и усложняют безопасные изменения форм.

### 4. Разгрузить крупные компоненты

Самые крупные файлы:

- `src/widgets/product-catalog/ui/PriceRangeFilter.tsx` - 659 строк;
- `src/widgets/dashboard-settings/ui/ShippingMethodsWidget.tsx` - 642;
- `src/widgets/create-product-form/ui/CreateProductForm.tsx` - 577;
- `src/widgets/dashboard-settings/ui/PaymentAccountsWidget.tsx` - 548;
- `src/widgets/dashboard-home/ui/DashboardContent.tsx` - 508;
- `src/shared/ui/image-gallery/FullscreenImageViewer.tsx` - 493.

Риск не в размере самом по себе, а в стоимости изменений. При следующих задачах эти места лучше декомпозировать по смысловым блокам, без большой абстрактной переработки.

### 5. Снизить silent failure

В нескольких местах ошибки превращаются в пустые массивы или generic state: `app/page.tsx`, `app/sitemap.ts`, `src/shared/api/imageApi.ts`, category/product metadata. Для UX это иногда нормально, но для production нужна телеметрия: когда backend недоступен, команда должна видеть частоту и влияние ошибок.

### 6. Довести Docker/compose до production-grade

`Dockerfile` как frontend runtime выглядит нормально для MVP. Но `docker-compose.yml` не должен быть production compose:

- секреты в файле;
- dev credentials;
- backend/db/minio настройки смешаны с frontend repo;
- PostgreSQL устанавливает `pg_cron` через `apt-get` при старте контейнера;
- MinIO image старый;
- нет healthcheck у frontend service;
- нет ресурсных лимитов и production secrets.

Если compose нужен только для local stack, это надо явно зафиксировать в README и не использовать его как production template.

### 7. Добавить dependency maintenance

Audit чистый, но нет видимых Renovate/Dependabot правил, dependency review и регулярной политики обновлений. Для production нужно автоматизировать security и minor/patch updates, иначе стек быстро устареет.

### 8. Добавить performance budget

Build показывает First Load JS примерно:

- `/auth/login` и `/auth/register`: 228 kB;
- `/checkout`: 284 kB;
- `/favorites`, `/catalog/search`: около 293-294 kB;
- `/catalog/[id]/detail`: 334 kB.

Это не катастрофа, но нет бюджета, bundle analysis, Lighthouse/Web Vitals gate и мониторинга Core Web Vitals.

## Можно оставить на потом

- Schema.org structured data для товаров, организации, breadcrumbs.
- Visual regression tests для ключевых страниц.
- Storybook или отдельная песочница shared/ui.
- Feature flags для рискованных функций.
- A/B testing инфраструктура.
- PWA/offline сценарии.
- Расширенная accessibility automation через axe.
- Release notes/changelog automation.
- Более строгая политика source maps: отдельные hidden source maps для error tracking, без публичной раздачи.

## Что обычно есть у production frontend-проекта

### Security

- HttpOnly Secure SameSite cookies или другой защищенный auth contract.
- CSRF strategy для cookie-auth.
- Secret scanning и dependency scanning.
- CSP без broad `connect-src` и без лишнего `unsafe-inline`.
- Rate limit и lockout на backend для auth endpoints.
- Security headers и регулярная проверка через scanner.

### Observability

- Error tracking client/server.
- Release tags и sourcemaps для stack traces.
- Uptime checks для frontend и API.
- Алерты по error rate, latency, checkout failures, auth failures.
- Dashboard по Core Web Vitals и ключевым бизнес-сценариям.

### Delivery

- CI quality gates на pull requests.
- Production artifact test: Docker image или standalone bundle.
- Deploy previews или staging.
- Rollback procedure.
- Branch protection и required checks.
- Документированный release checklist.

### Testing

- Smoke после деплоя.
- E2E happy paths и failure paths.
- Auth/session tests.
- Checkout/order tests с идемпотентностью.
- Test data management.
- Небольшой слой unit/component tests для чистой логики и сложных hooks.

### Operations

- Environment matrix: local, test/staging, production.
- Runbooks для "API недоступен", "auth сломан", "checkout падает", "CDN/images недоступны".
- Health/readiness endpoint или agreed health route.
- Логи reverse proxy/CDN.
- Backup/restore и миграции относятся к backend, но frontend release должен знать зависимости.

### Product/legal

- Privacy policy и user agreement опубликованы.
- Cookie/analytics consent, если требуется выбранной юрисдикцией и набором трекеров.
- Контакты поддержки.
- Модерация/жалобы/abuse flow для marketplace.

## Рекомендуемый порядок работ

1. Закрыть секреты: ротация, env/secrets, убрать реальные credentials из compose.
2. Согласовать и внедрить HttpOnly cookie auth + CSRF.
3. Добавить идемпотентность checkout после backend-готовности.
4. Починить production-like e2e artifact test и стабилизировать adult-category тесты.
5. Подключить error tracking, release tags, uptime и базовые алерты.
6. Добавить e2e для login, cart, checkout, create product, order transitions.
7. Ужесточить CSP и убрать HTTP/IP image source из production.
8. Постепенно разгрузить самые крупные компоненты при ближайших изменениях в этих зонах.
9. Добавить performance budget и dependency automation.

## Итоговая оценка

Текущее состояние: сильный MVP frontend foundation, но не production-ready для публичного marketplace.

Минимальный критерий для первого production запуска:

- нет секретов в репозитории;
- auth tokens не доступны JavaScript;
- checkout не создает дубли при retry;
- production artifact проходит smoke и e2e без ручных обходов;
- есть error tracking и алерты;
- покрыты login/cart/checkout/create product/order flows;
- backend contract из `docs/backend-contract.md` подтвержден на test/staging.
