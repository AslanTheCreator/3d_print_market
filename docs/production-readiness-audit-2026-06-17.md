# Готовность MVP и production

Первичный аудит: 2026-06-17. Актуальная сверка frontend `1.25.0`: 2026-07-23.

## Решение

- **Локальная демонстрация или закрытый staging** — `УСЛОВНО ГОТОВ`.
  - Условия: только тестовые данные, без реальных платежей и с ограниченным набором товаров.
- **Публичный MVP** — **NO-GO**.
  - Причина: открыты риски показа 18+ контента, целостности товара, секретов, auth и приватных данных.
- **Публичный production** — **NO-GO**.
  - Причина: дополнительно не подтверждены real-backend acceptance, observability, deploy/rollback и юридическая готовность.

Проект имеет сильную инженерную основу: production build, standalone runtime, Docker image и текущие автоматические проверки проходят. Зелёные quality gates не компенсируют продуктовые, security и эксплуатационные блокеры.

## Сводка

### Готово

- **Build и качество кода** — lint, strict TypeScript, Steiger, runtime dependency audit и build проходят.

### Частично готово

- **Основные buyer/seller flows** — каталог, auth UI, корзина, checkout, товары и заказы реализованы; реальные end-to-end сценарии с backend не проверены.
- **CI и тесты** — 15 smoke и 68 Playwright tests проходят, но CI работает без реального backend и только в Desktop Chromium.
- **SEO, performance, accessibility** — metadata/security headers есть; остаются soft 404, устаревший performance baseline и отсутствие mobile/a11y gate.

### Блокеры

- **Контент и защита 18+** — age gate действует только в category flow; главная и detail route его обходят.
- **Целостность данных товара** — edit mapper теряет `externalUrl`, `originality` и преобразует `EXTERNAL_ONLY`.
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

### Редактирование товара

`mapProductDetailToFormData` не переносит `externalUrl` и `originality`, а `mapFormDataToCreateModel` всегда отправляет `originality: "ORIGINAL"`, пустой `externalUrl` и вычисляет только `PREORDER`/`PURCHASABLE`. Редактирование `EXTERNAL_ONLY` или товара с другим признаком оригинальности способно незаметно изменить данные.

До запуска create/edit должны сохранять все подтверждённые контрактом поля или явно запрещать неподдерживаемое редактирование.

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
- **Accessibility implementation** — найдены auth inputs без label, icon buttons без accessible name, keyboard-недоступный avatar upload и touch targets меньше 44 px.
- **Mobile rendering** — нет mobile browser project; разные desktop/mobile trees выбираются через `useMediaQuery` без подтверждённой SSR match strategy и CLS-замера.
- **Performance** — нет актуального mobile/production Core Web Vitals и CI budget.
- **Споры и support** — dispute status отображается, но действия открытия/закрытия спора и подтверждённый support runbook отсутствуют.
- **Docker/CI** — собранный image не запускается в CI; compose defaults используют исторические frontend/backend tags.
- **Архитектурные правила** — Steiger проходит, но документация не отражала cart projection и известные widget/shared deviations.

## Подтверждённые проверки

Проверки выполнены 2026-07-23 на clean worktree:

- **`npm run lint`** — пройдено, warnings `0`.
- **`npm run typecheck`** — пройдено.
- **`npm run architecture:check`** — пройдено, Steiger problems `0`.
- **`npm audit --omit=dev --audit-level=high`** — `0 vulnerabilities`.
- **`npm run build`** — production build пройден.
- **`npm run test:standalone`** — 15 smoke и 68 Playwright tests пройдены.
- **`docker compose config --quiet`** — конфигурация валидна.
- **`docker build -f Dockerfile -t figurzilla-frontend:audit .`** — image собран.

Ограничения этих результатов:

- Playwright запускается только в Desktop Chromium;
- значительная часть API ответов подменяется, model tests также запускаются через Playwright;
- container entrypoint и production network не smoke-тестируются в CI;
- не выполнялись load, penetration, disaster recovery и юридический аудит.

## Порядок закрытия

1. Закрыть secret incident и прекратить показ 18+ контента без gate.
2. Исправить destructive product edit и удалить публичные заглушки.
3. Согласовать password/auth, private images, payment accounts и checkout idempotency с backend.
4. Исправить redirect, session teardown, log redaction, HTTPS/CSP и settings error states.
5. Развернуть release candidate на staging и пройти real-backend acceptance matrix.
6. Подключить observability, health checks, immutable deploy, post-deploy smoke и rollback.
7. Получить юридическое подтверждение документов и consent flow.
8. Выполнить mobile/accessibility/performance проверку и только затем повторить go/no-go review.

Публичный запуск разрешается только после закрытия всех P0 и успешного повторного аудита.

## Границы аудита

Backend source code, production infrastructure, backups, registry, внешние secret stores и организационные процессы не были доступны. Связанные требования помечены как неподтверждённые, а не как доказанные свойства backend.
