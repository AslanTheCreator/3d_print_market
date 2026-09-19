# Deployment

## Требования и env

- Node.js `24.15.0` (`.nvmrc`, Dockerfile);
- npm `11` (`package.json`);
- установка зависимостей: `npm ci`.

Переменные из `.env.example`:

- **`CLIENT_API_BASE_URL`** — runtime API URL для браузера через `/api/config`.
- **`NEXT_PUBLIC_API_URL`** — build-time fallback.
- **`API_BASE_URL`** — server-side API URL.
- **`ALLOW_LOCAL_API_URL`** — разрешение local API URL в production-like среде.

В production local API URL запрещён, если `ALLOW_LOCAL_API_URL` не равен `true`.

Публичный browser API должен использовать HTTPS или same-origin proxy. Это пока эксплуатационное требование: `env.ts` принимает и `http:`, и `https:` и программно блокирует только local hosts. До production validation должна отклонять публичный HTTP URL. Root-relative URL подходит browser proxy, но `API_BASE_URL` для server-side запросов должен быть абсолютным.

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

Перед публикацией проверять, свободен ли выбранный Docker-тег: `docker manifest inspect atupenov/frontend_app:v<version>`. Если манифест существует, для новой сборки выбрать следующую версию и синхронно обновить package files и changelog. Ошибка авторизации или сети не подтверждает, что тег свободен. Повторный `docker push` под существующим тегом заменяет его назначение; это допустимо только при явно согласованном восстановлении. После публикации сохранять digest для точного выбора образа и отката.

### Публикация 2026-09-18

В Docker Hub проверены образы `atupenov/frontend_app` для `linux/amd64`:

- `v1.26.0` восстановлен на сборку от 2026-08-06, ревизия `cca45978f0413f61e4d966bd7b42ac918578559d`, digest `sha256:8d2b877e75062d68166da50412c8644301e481d6e46654946198a38c36a6c131`.
- `v1.27.0` опубликован с версией приложения и OCI-меткой `1.27.0`, ревизия `7f8382d5a087ba255842a847146366528cc9e599-dirty`, digest `sha256:b726288c921b1285006723e1646e4b7d8b4bc16ac1d7c1fac967e5b4cee40e59`.

`v1.27.0` включает незакоммиченные изменения: обновление версии, changelog и отступ мобильного поиска. Git-коммит, Git-тег и GitHub Release для этой публикации не создавались. Production build и 15 HTTP smoke-тестов контейнера прошли; полный `test:standalone` и staging acceptance не выполнялись. Эта публикация не подтверждает прохождение полного release gate.

## Docker Compose

```bash
docker compose up -d
```

`docker-compose.yml` предназначен только для локального full stack: PostgreSQL, MinIO, backend и frontend. Он ожидает `../init-scripts` и `../data` и не является production-шаблоном.

Tracked compose уже содержит plaintext SMTP credential. Это открытый security incident: требуется удалить значение из дерева и истории Git, ротировать его и проверить историю secret scanner'ом. Локальные hardcoded credentials нельзя переносить в публичную среду.

Compose defaults используют исторические frontend/backend image tags и не подтверждают совместимость с текущим frontend `1.25.0`. Для проверки release candidate нужно явно задавать оба совместимых image tags/digests.

## CI

`.github/workflows/frontend-ci.yml` запускает:

1. `npm ci` и audit runtime dependencies;
2. typecheck, lint и architecture check;
3. production build;
4. `npm run test:standalone` для smoke и e2e;
5. Docker image build;
6. `docker compose config`.

CI использует тот же standalone-формат, что и Docker image.

CI не является CD:

- image собирается, но не публикуется и не запускается в workflow;
- нет container smoke, production target и post-deploy smoke;
- нет health/readiness проверки frontend и backend dependency;
- нет подтверждённого rollback;
- Playwright artifacts не загружаются;
- staging acceptance с реальным backend отсутствует.

## Production gate

До публичного deployment должны быть определены и проверены:

1. secret storage и завершённая ротация раскрытых credentials;
2. fail-fast validation обязательных env;
3. liveness и readiness, включая различие «процесс жив» и «API-зависимость готова»;
4. immutable image digest, Git revision и release metadata;
5. container smoke именно собранного image;
6. staging real-backend acceptance из [testing.md](./testing.md);
7. deployment target, canary/rollout, post-deploy smoke и автоматический либо документированный rollback;
8. error tracking с redaction, structured logs, release correlation, uptime, alerts, SLO и incident owner;
9. backup/restore и disaster recovery для зависимых backend/storage систем;
10. юридическое подтверждение документов и analytics consent flow.

Если deployment и runbooks находятся в другом репозитории, здесь должна быть ссылка на точную версию внешней документации. До этого состояние оценивается как неподтверждённое.

Текущий go/no-go status находится в [production-readiness-audit-2026-06-17.md](./production-readiness-audit-2026-06-17.md).
