# Testing

Документ описывает только реальные проверки и команды из `package.json`.

## Инструменты

В проекте используются:

- ESLint для статической проверки `app` и `src`;
- TypeScript и `next typegen` для typecheck;
- Steiger для проверки FSD-архитектуры;
- Next production build;
- `node:test` для HTTP smoke-тестов;
- Playwright для e2e и browser-level проверок.

## Команды

```bash
npm run dev
npm run build
npm run start
npm run start:standalone
npm run lint
npm run typecheck
npm run architecture:check
npm run test:smoke
npm run test:e2e
npm run test:e2e:ui
npm run test:standalone
```

Ключевые проверки: `lint`, `typecheck`, `architecture:check`, `build`, `test:smoke`, `test:e2e`.

## Минимум для code changes

Для большинства code changes запускать:

```bash
npm run lint
npm run typecheck
npm run architecture:check
```

## User-facing изменения

Если изменение влияет на UI, routes, forms, auth, checkout, каталог, личный кабинет или production behavior, дополнительно рассмотреть:

```bash
npm run build
npm run test:smoke
```

Для production-like проверки сначала собрать и запустить standalone-артефакт. Команда сама копирует `public` и `.next/static` в структуру, которую ожидает standalone runtime:

```bash
npm run build
npm run start:standalone
npm run test:smoke
```

`build` нужен, когда изменение может затронуть:

- Next.js route compilation;
- server/client component boundaries;
- metadata или route handlers;
- production bundle;
- env/runtime config.

## Smoke-тесты

Smoke-тесты находятся в `tests/smoke`.

`npm run test:smoke` не запускает dev server сам. Перед ним нужно поднять приложение:

```bash
npm run dev
npm run test:smoke
```

По умолчанию smoke использует:

```txt
http://localhost:3000
```

Для другого адреса задать `TEST_BASE_URL`:

```powershell
$env:TEST_BASE_URL="http://localhost:3001"
npm run test:smoke
```

Smoke быстро проверяет HTML-ответы, публичные страницы, dashboard redirect для анонима и `/api/config`.

## E2E

Playwright-конфиг находится в `playwright.config.ts`. Тесты находятся в `tests/e2e`.

Если `TEST_BASE_URL` не задан, Playwright сам запускает web server:

- по умолчанию `npx next dev --turbopack -p 3000`;
- команду можно переопределить через `PLAYWRIGHT_WEB_SERVER_COMMAND`.

Для production-like проверки нужен актуальный build:

```bash
npm run build
npm run test:standalone
```

`test:standalone` поднимает standalone-артефакт на порту из `PLAYWRIGHT_PORT`, ждёт готовности `/api/config`, запускает smoke и e2e через `TEST_BASE_URL`, затем останавливает сервер. В CI используется тот же standalone-формат, что и в Docker image.

Если `TEST_BASE_URL` задан, Playwright проверяет уже запущенный стенд.

```powershell
$env:TEST_BASE_URL="https://test.example.com"
npm run test:e2e
```

E2E нужен для изменений в auth, protected routes, checkout, формах, browser-only поведении, redirects и runtime config.

## Backend и env

Некоторые тесты зависят от API URL или моков.

В Playwright web server env используются fallback значения `CLIENT_API_BASE_URL`, `API_BASE_URL`, `ALLOW_LOCAL_API_URL`.

Если тест требует реальный backend или test-стенд:

- указать `TEST_BASE_URL`;
- задать нужные env variables;
- не печатать секреты из `.env.local`;
- явно написать в итоговом ответе, что проверка зависит от внешнего backend/env.

## Документационные изменения

Documentation-only изменения обычно не требуют:

- `npm run lint`;
- `npm run typecheck`;
- `npm run architecture:check`;
- `npm run build`;
- smoke/e2e.

Достаточно проверить diff, Markdown-содержание и соответствие фактам из кода. Если проверки не запускались, нужно прямо указать причину.

## Как сообщать результат

В финальном ответе указывать:

- какие команды запускались;
- статус каждой команды;
- если команда не запускалась — почему;
- если тест зависит от backend/env — что именно помешало;
- если остался риск — какой сценарий стоит проверить отдельно.
