# Готовность MVP и production

Первичный аудит: 2026-06-17. Актуальная сверка frontend `1.25.0`: 2026-07-28.

## Решение

- **Локальная демонстрация или закрытый staging** — `УСЛОВНО ГОТОВ`.
  - Условия: только тестовые данные, без реальных платежей и с ограниченным набором товаров.
- **Публичный MVP** — **NO-GO**.
  - Причина: открыты риски показа 18+ контента, секретов, auth, приватных данных и неподтверждённой backend-защиты внешних товаров.
- **Публичный production** — **NO-GO**.
  - Причина: дополнительно не подтверждены real-backend acceptance, observability, deploy/rollback и юридическая готовность.

Проект имеет сильную инженерную основу: production build, standalone runtime, Docker image и текущие автоматические проверки проходят. Зелёные quality gates не компенсируют продуктовые, security и эксплуатационные блокеры.

## Сводка

### Готово

- **Build и качество кода** — lint, strict TypeScript, Steiger для `src`, runtime dependency audit и build проходят.
- **Архитектурные границы** — варианты каталога объединены без widget-to-widget imports; доменные DTO, image и session находятся в entities, а Axios связан с session через app-level adapter.
- **Frontend-защита внешних товаров** — write model исключает `EXTERNAL_ONLY`; edit/delete/extend скрыты, прямой edit route заблокирован.
- **Целостность редактирования внутренних товаров** — form mapper сохраняет подтверждённые `originality` и `externalUrl`.

### Частично готово

- **Основные buyer/seller flows** — каталог, auth UI, корзина, checkout, товары и заказы реализованы; реальные end-to-end сценарии с backend не проверены.
- **CI и тесты** — 15 smoke и 115 Playwright tests проходят в desktop и
  curated mobile Chromium, но CI работает без реального backend.
- **SEO, performance, accessibility** — metadata/security headers и mobile
  Lab CLS gate есть; остаются soft 404, отсутствие production field data и
  automated accessibility gate.

### Блокеры

- **Контент и защита 18+** — age gate действует только в category flow; главная и detail route его обходят.
- **Backend-защита внешних товаров** — не подтверждён запрет create/update/delete/extend для записей внешнего источника.
- **Security и приватность** — tracked secret, JS-readable tokens, password в query и неподтверждённый доступ к платёжным данным.
- **Целостность заказа** — backend не обеспечивает идемпотентность `POST /order/BOOKED`.
- **Deployment и эксплуатация** — нет подтверждённых CD, health/readiness, post-deploy smoke, rollback, error tracking и алертов.

### Не подтверждено

- **Юридическая готовность** — тексты есть, но реквизиты оператора, consent flow для Метрики/Webvisor и итоговая редакция требуют юридической проверки.

## P0: блокеры публичного MVP

### Контент 18+

- `AgeVerificationGate` подключён только в `CategoryProducts`.
- Главная получает общий публичный список и не фильтрует adult products на frontend.
- `/catalog/[id]/detail` использует `publicClient`, не применяет age gate и не ставит `noindex` по категории товара.
- `sitemap.ts` исключает adult category paths, но не фильтрует product entries по adult category.
- Spot-check публичного контура 2026-07-23 подтвердил, что анонимная главная показывает товары с категорией `NSFW (18+)`, а их detail pages открываются без gate с `index, follow`.

До запуска 18+ политика должна одинаково применяться к главной, поиску, seller catalog, direct detail, related products, sitemap и backend выдаче.

### Публичные заглушки

- Главная публикует фиктивный «Розыгрыш фигурки недели» с жёсткой ссылкой `/catalog/1/detail`.
- Профиль продавца показывает одинаковое вымышленное описание и `126` отзывов для любого продавца.

Заглушки должны быть удалены либо заменены подтверждёнными backend/content-данными до публичного трафика.

### Товары внешнего источника

Frontend рассматривает `EXTERNAL_ONLY` как read-only тип: форма и write DTO его не принимают, управляющие действия скрыты, прямой edit route не выполняет mutation.

До запуска backend должен подтвердить запрет публичных create/update/delete/extend операций для внешнего товара. Проверка update обязана опираться на сохранённое происхождение записи, а не на новый `availability` из payload, иначе ограничение обходится подменой типа. Доверенный import/sync-контур остаётся единственным writer.

### Секреты

В tracked `docker-compose.yml` находится plaintext SMTP credential, а также локальные hardcoded credentials. Требуется:

1. немедленная ротация раскрытого секрета;
2. удаление из текущего дерева и истории Git;
3. проверка истории и образов secret scanner'ом;
4. перенос runtime-секретов в управляемое secret storage.

Удаление только из последнего commit не закрывает инцидент.

### Auth и чувствительные данные

- Access и refresh tokens доступны JavaScript через `js-cookie`; logout не завершает server session, а server guards проверяют только наличие cookie.
- Смена пароля передаёт старый и новый пароли в URL query, где они могут попасть в access logs и APM.
- Подтверждения оплаты читаются через общий `imageApi` на `publicClient`; приватность чеков на уровне backend/object storage не подтверждена.
- Платёжные реквизиты продавца запрашиваются по `participantId`; order-scoped authorization backend не подтверждена.

Целевая модель auth, приватных изображений и платёжных реквизитов описана в [backend-contract.md](./backend-contract.md). До её проверки на staging реальные auth, order и payment data использовать нельзя.

### Checkout

Frontend не повторяет уже подтверждённые позиции в текущей сессии, но timeout может означать как ошибку, так и успешно созданный заказ. Без backend idempotency повтор способен создать дубль. Требование описано в [backend-checkout-idempotency.md](./backend-checkout-idempotency.md).

### Acceptance с реальным backend

CI поднимает standalone frontend с недоступным API и использует mocked/fake данные. Не проверены на одном release candidate:

- register, verify, login, refresh, logout и password reset;
- seller setup, create/edit product и upload;
- cart и checkout с актуальными остатками;
- полный buyer/seller order lifecycle;
- payment proof и order-scoped доступ;
- timeout/retry/idempotency и запрет покупки собственного товара.

### Эксплуатация и выпуск

Репозиторий собирает образ, но не подтверждает:

- публикацию immutable image digest и связь release с revision;
- production target, CD и post-deploy smoke;
- liveness/readiness и проверку backend dependency;
- rollback и incident runbook;
- error tracking с redaction, release correlation, uptime, alerts и SLO.

Если эти элементы находятся во внешнем infra-репозитории, документация должна ссылаться на конкретный runbook и подтверждённый release pipeline.

### Юридический gate

Юридические страницы присутствуют, но кодовый аудит не подтверждает достаточность документов. Перед публичным трафиком нужно получить юридическое подтверждение как минимум для:

- идентификации оператора и реквизитов;
- обработки персональных и платёжных данных;
- правил marketplace, продавцов, возвратов и споров;
- adult content;
- Яндекс Метрики/Webvisor, cookie и момента получения согласия.

Сейчас Метрика с Webvisor загружается во всех production environments до технического consent gate.

## P1: высокий риск до production

- **Redirect после auth** — проверка допускает backslash-вариант внешнего URL; нужен origin-based sanitizer и e2e.
- **Session teardown** — автоматический logout не гарантирует очистку auth-bound Query cache, Zustand и user-нескопированного product draft.
- **Логи** — часть raw Axios/Auth errors логируется без гарантированного удаления password/token/request data.
- **Refresh queue** — 10-секундный timeout не удаляет subscriber; поздний refresh может повторить mutation после ошибки в UI.
- **HTTPS и CSP** — production env допускает публичный HTTP API; CSP содержит `'unsafe-inline'`, широкие connect sources и HTTP image origin.
- **Settings error states** — ошибки загрузки accounts, social networks и части transfers могут выглядеть как пустые настройки.
- **External purchase** — разрешён любой HTTP(S) host, но UI обещает Telegram и не показывает фактический домен.
- **HTTP status/SEO** — invalid product, category и seller routes рендерят client error state с HTTP 200; это soft 404.
- **Индексация private routes** — dashboard запрещён в `robots.txt`, но layout не задаёт `noindex` и наследует root metadata.
- **Accessibility scan** — implementation-дефекты исправлены 2026-07-30:
  auth/OTP inputs имеют labels и связанные ошибки, icon actions — явные имена,
  составные controls доступны с клавиатуры, standalone touch targets — не
  меньше `44×44 px`. Общий automated accessibility scan всё ещё отсутствует и
  остаётся открытым release-control gap.
- **Performance** — локальный mobile Lab CLS gate добавлен и проходит, но нет
  production Core Web Vitals/RUM и budgets для LCP, INP, JS или assets.
- **Споры и support** — dispute status отображается, но действия открытия/закрытия спора и подтверждённый support runbook отсутствуют.
- **Docker/CI** — собранный image не запускается в CI; compose defaults используют исторические frontend/backend tags.

## Подтверждённые проверки

Lint, typecheck, Steiger, build и полный E2E-прогон повторены 2026-07-30 для
текущего рабочего дерева:

- **`npm run lint`** — пройдено, warnings `0`.
- **`npm run typecheck`** — пройдено.
- **`npm run architecture:check`** — пройдено для `src`, Steiger problems `0`.
- **`npm audit --omit=dev --audit-level=high`** — после обновления PostCSS до
  `8.5.18` пройдено 2026-07-29: `0 vulnerabilities`.
- **`npm run build`** — production build пройден.
- **`npm run test:e2e -- --workers=2`** — 115 Playwright tests пройдены:
  105 desktop и 10 mobile.
- **`docker compose config --quiet`** — последний подтверждённый результат от
  2026-07-23: конфигурация валидна.
- **`docker build -f Dockerfile -t figurzilla-frontend:audit .`** — последний
  подтверждённый результат от 2026-07-23: image собран.

Ограничения этих результатов:

- прежний результат Steiger был false green: команда `steiger .` не
  анализировала FSD-слои внутри `src`; текущая команда использует
  `steiger src`;
- `fsd/insignificant-slice` отключён как неприменимый при внешнем корневом
  `app/`; сам `app/` остаётся зоной обязательного ручного review;
- Playwright запускается в desktop Chromium и отдельном Pixel 5 mobile
  Chromium project; Firefox/WebKit не покрыты;
- значительная часть API ответов подменяется, model tests также запускаются через Playwright;
- CLS `0` в локальном Lab-прогоне `/about` и fixture product detail не
  является production field p75;
- container entrypoint и production network не smoke-тестируются в CI;
- не выполнялись load, penetration, disaster recovery и юридический аудит.

## Порядок закрытия

1. Закрыть secret incident и прекратить показ 18+ контента без gate.
2. Удалить публичные заглушки и подтвердить backend-защиту внешних товаров.
3. Согласовать password/auth, private images, payment accounts и checkout idempotency с backend.
4. Исправить redirect, session teardown, log redaction, HTTPS/CSP и settings error states.
5. Развернуть release candidate на staging и пройти real-backend acceptance matrix.
6. Подключить observability, health checks, immutable deploy, post-deploy smoke и rollback.
7. Получить юридическое подтверждение документов и consent flow.
8. Выполнить accessibility и production performance/RUM проверку и только
   затем повторить go/no-go review.

Публичный запуск разрешается только после закрытия всех P0 и успешного повторного аудита.

## Границы аудита

Backend source code, production infrastructure, backups, registry, внешние secret stores и организационные процессы не были доступны. Связанные требования помечены как неподтверждённые, а не как доказанные свойства backend.
