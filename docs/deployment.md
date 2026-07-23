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

## Релизы

Версия приложения хранится в `package.json` и следует Semantic Versioning. Git-тег и Docker-тег используют формат `v<version>`, например `v1.25.0`. История значимых изменений ведётся в корневом `CHANGELOG.md`; новые записи сначала добавляются в раздел `Unreleased`.

Docker-образ `atupenov/frontend_app:v1.24` считается исторической версией `1.24.0` и исходной точкой changelog. Старый двухкомпонентный формат тега сохранён только для этой уже опубликованной версии.

Порядок подготовки релиза:

1. убедиться, что release-ветка синхронизирована и рабочее дерево чистое;
2. перенести готовые записи из `Unreleased` в датированный раздел новой версии;
3. синхронно обновить `version` в `package.json` и `package-lock.json`;
4. выполнить `npm run lint`, `npm run typecheck`, `npm run architecture:check`, `npm run build` и `npm run test:standalone`;
5. создать аннотированный Git-тег `v<version>` на проверенном release-коммите;
6. собрать и опубликовать Docker-образ с той же версией;
7. создать GitHub Release из соответствующего раздела `CHANGELOG.md` и записать digest опубликованного образа.

Release-образ должен содержать OCI-метки версии и Git-ревизии:

```bash
VERSION=$(node -p "require('./package.json').version")
REVISION=$(git rev-parse HEAD)

docker build \
  --build-arg APP_VERSION="$VERSION" \
  --build-arg VCS_REF="$REVISION" \
  --build-arg NEXT_PUBLIC_API_URL="$NEXT_PUBLIC_API_URL" \
  --build-arg CLIENT_API_BASE_URL="$CLIENT_API_BASE_URL" \
  --build-arg API_BASE_URL="$API_BASE_URL" \
  -t "atupenov/frontend_app:v$VERSION" .
```

Git-тег, GitHub Release и Docker-образ должны ссылаться на одну проверенную ревизию. Тег `latest`, если он используется в deployment, обновляется только после успешной проверки versioned-образа.

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
