# Deployment

## Требования и env

- Node.js `24.15.0` (`.nvmrc`, Dockerfile);
- npm `11` (`package.json`);
- установка зависимостей: `npm ci`.

Переменные из `.env.example`:

| Переменная | Назначение |
| --- | --- |
| `CLIENT_API_BASE_URL` | runtime API URL для браузера через `/api/config` |
| `NEXT_PUBLIC_API_URL` | build-time fallback |
| `API_BASE_URL` | server-side API URL |
| `ALLOW_LOCAL_API_URL` | разрешение local API URL в production-like среде |

В production local API URL запрещён, если `ALLOW_LOCAL_API_URL` не равен `true`.

## Локальный запуск

```bash
npm ci
npm run dev
```

Для production-like standalone:

```bash
npm run build
npm run start:standalone
```

`start:standalone` подготавливает `public` и `.next/static`, затем запускает `.next/standalone/server.js`.

## Docker

```bash
docker build -f Dockerfile -t figurzilla-frontend:latest .
docker run --rm -p 3000:3000 --env-file .env.local figurzilla-frontend:latest
```

Dockerfile:

- использует `node:24.15.0-alpine`;
- собирает Next.js с `output: "standalone"`;
- копирует `public`, `.next/standalone` и `.next/static`;
- запускает runtime от пользователя `node` на порту `3000`.

Build args: `NEXT_PUBLIC_API_URL`, `CLIENT_API_BASE_URL`, `API_BASE_URL`. Runtime env можно переопределить при запуске.

## Docker Compose

```bash
docker compose up -d
```

`docker-compose.yml` предназначен только для локального full stack: PostgreSQL, MinIO, backend и frontend. Он ожидает `../init-scripts` и `../data` и не является production-шаблоном.

Перед публикацией compose необходимо убрать реальные credentials, использовать secret storage и отдельно определить health checks и эксплуатационные настройки.

## CI

`.github/workflows/frontend-ci.yml` запускает:

1. `npm ci` и audit runtime dependencies;
2. typecheck, lint и architecture check;
3. production build;
4. `npm run test:standalone` для smoke и e2e;
5. Docker image build;
6. `docker compose config`.

CI использует тот же standalone-формат, что и Docker image.
