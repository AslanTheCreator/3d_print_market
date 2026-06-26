# Deployment

Документ описывает текущий запуск и сборку frontend. Он не описывает инфраструктуру backend как контракт.

## Требования

- Node.js `24.15.0`
- npm `11`
- зависимости ставятся через `npm ci`

Версия Node зафиксирована в `.nvmrc`, `package.json` и Dockerfile.

## Env

Основные переменные из `.env.example`:

```txt
CLIENT_API_BASE_URL
NEXT_PUBLIC_API_URL
API_BASE_URL
ALLOW_LOCAL_API_URL
```

Назначение:

- `CLIENT_API_BASE_URL` — runtime API URL для браузера, возвращается через `/api/config`;
- `NEXT_PUBLIC_API_URL` — build-time fallback;
- `API_BASE_URL` — server-side API URL для Next.js;
- `ALLOW_LOCAL_API_URL` — разрешает local API URL в production-like запуске.

В production local API URL запрещен, если `ALLOW_LOCAL_API_URL` не равен `true`.

## Локальная разработка

```bash
npm ci
npm run dev
```

Локальный адрес по умолчанию:

```txt
http://localhost:3000
```

Для локального запуска нужен `.env.local`, созданный по `.env.example`.

## Production build

```bash
npm run build
npm run start
```

`next.config.mjs` использует:

- `output: "standalone"`;
- security headers;
- remote image patterns;
- отключенный `poweredByHeader`.

Важно: при standalone output runtime-образ должен содержать:

- `public`;
- `.next/standalone`;
- `.next/static`.

Dockerfile уже копирует эти директории в runner stage.

## Docker image

Сборка:

```bash
docker build -f Dockerfile -t figurzilla-frontend:latest .
```

Запуск:

```bash
docker run --rm -p 3000:3000 --env-file .env.local figurzilla-frontend:latest
```

Dockerfile:

- использует `node:24.15.0-alpine`;
- собирает приложение через `npm run build`;
- запускает standalone server через `node server.js`;
- запускает runtime от пользователя `node`;
- слушает порт `3000`.

Build args:

```txt
NEXT_PUBLIC_API_URL
CLIENT_API_BASE_URL
API_BASE_URL
```

Runtime env можно переопределять при запуске контейнера.

## Docker Compose

Локальный full stack:

```bash
docker compose up -d
```

Compose поднимает:

- PostgreSQL;
- MinIO;
- backend image;
- frontend image.

Frontend service использует:

```txt
FRONTEND_IMAGE
FRONTEND_CONTAINER_NAME
FRONTEND_PORT
CLIENT_API_BASE_URL
API_BASE_URL
NEXT_PUBLIC_API_URL
ALLOW_LOCAL_API_URL
```

Локальные значения по умолчанию указывают browser API на `http://localhost:8081`, а server-side API на `http://backend:8081`.

Compose ожидает внешние папки рядом с репозиторием:

- `../init-scripts`;
- `../data`.

## CI

GitHub Actions workflow: `.github/workflows/frontend-ci.yml`.

CI запускается на `push` в `master`/`main` и на `pull_request`.

Проверки:

- `npm ci`;
- `npm audit --omit=dev --audit-level=high`;
- `npm run typecheck`;
- `npm run lint`;
- `npm run architecture:check`;
- `npm run build`;
- `npm run test:smoke`;
- `npm run test:e2e`;
- Docker image build;
- `docker compose -f docker-compose.yml config`.

Smoke в CI стартует `npx next start -p 3010` и проверяет `/api/config`.

E2E в CI использует:

```txt
PLAYWRIGHT_USE_PRODUCTION_SERVER=true
PLAYWRIGHT_PORT=3011
CLIENT_API_BASE_URL=http://127.0.0.1:9
API_BASE_URL=http://127.0.0.1:9
ALLOW_LOCAL_API_URL=true
```

## Перед релизом frontend

Минимальный набор:

```bash
npm run lint
npm run typecheck
npm run architecture:check
npm run build
npm run test:smoke
```

Для изменений в auth, checkout, формах, dashboard или пользовательских сценариях также запускать:

```bash
npm run test:e2e
```

## Не фиксировать в этом документе

- неописанные backend endpoint contracts;
- секреты из `.env.local` или compose overrides;
- production credentials;
- ручные действия на сервере, если они не отражены в репозитории;
- планы миграций, которые еще не реализованы.
