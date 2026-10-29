# Deployment

## Две стадии доставки

Текущий публичный стенд используется как **тестовый, без реальных пользователей**.
Для него нужен короткий повторяемый релиз frontend: версия, changelog, release
commit, успешный CI, Git-тег, Docker-образ из проверенного SHA, smoke, digest и
возможность отката. Backend разворачивается отдельно.

Полноценный production с реальными пользователями — следующий этап проекта.
Его дополнительные требования перечислены ниже и не являются автоматическими
блокерами публикации frontend на текущий тестовый стенд. Успешный тестовый релиз
не закрывает известные риски и не подтверждает production readiness.

## Требования и env

- Node.js `24.15.0` (`.nvmrc`, Dockerfile), npm `11`, зависимости через `npm ci`.
- Docker Engine/Buildx с поддержкой `linux/amd64`.
- Версия — `package.json` и обе корневые записи `package-lock.json`.
- Git- и Docker-теги — `v<version>`; image — `atupenov/frontend_app`.

| Переменная | Когда действует | Назначение |
| --- | --- | --- |
| `NEXT_PUBLIC_API_URL` | При `next build` | Fallback, встроенный в браузерный bundle; `docker run -e` его не заменяет |
| `CLIENT_API_BASE_URL` | Build и runtime | Browser API через динамический `GET /api/config` |
| `API_BASE_URL` | Build и runtime | Абсолютный server-side API URL |
| `ALLOW_LOCAL_API_URL` | Build и runtime | Только явный opt-in для локальной production-like проверки; на стенде `false` |

Текущий адрес из Dockerfile/CI: `https://figurzilla.ru/internal-api/v1`.
29.10.2026 `https://figurzilla.ru/api/config` подтвердил тот же `apiUrl`.
Для сборки и запуска стенда явно передавать этот адрес во все три API-параметра.
Внутренний адрес SSR допустим только после подтверждения DevOps.

Runtime `CLIENT_API_BASE_URL` имеет приоритет над build-time fallback;
`API_BASE_URL` — над ним для SSR. В runner значения по умолчанию пустые, поэтому
при запуске следует явно задавать `CLIENT_API_BASE_URL` и `API_BASE_URL`.
`/api/config` возвращает публичный адрес, а не проксирует API или refresh.
Настройки CSP/Next Image из `next.config.mjs` фиксируются сборкой; смена runtime
URL не меняет их. Подробнее — [API и auth](./api-and-auth.md#base-url)
и [Next.js env](https://nextjs.org/docs/app/guides/environment-variables).

Local API URL в production-like режиме запрещён без `ALLOW_LOCAL_API_URL=true`.
Публичный browser API должен использовать HTTPS или same-origin proxy.
Код пока принимает публичный HTTP; ужесточение validation остаётся production
задачей. Root-relative browser URL допустим, server-side URL должен быть абсолютным.

Локально: `npm ci`, затем `npm run dev`. Для standalone: `npm run build`, затем
`npm run start:standalone`; скрипт подготавливает `public` и `.next/static`.
Не использовать локальную `.env.local` с localhost для запуска образа стенда.

## Процедура тестового релиза

1. Выполнить `git status`, `git fetch origin --prune`, проверить актуальность
   `master`. Сохранить локальные изменения; создать отдельную release-ветку от
   актуального `origin/master`, без destructive reset.
2. Проверить Git-тег локально (`git tag --list v<version>`) и в remote
   (`git ls-remote --tags origin refs/tags/v<version>`), Docker Hub tag API и
   `docker manifest inspect atupenov/frontend_app:v<version>`. Занятый тег не
   перезаписывать. Отсутствие подтверждается ответом registry `manifest unknown` /
   `no such manifest` или Docker Hub `404` при доступном репозитории; ошибка сети,
   rate limit или авторизации означает **неизвестный результат**, а не свободный тег.
3. Синхронно обновить package files и краткий `CHANGELOG.md`, создать отдельный
   Conventional Commit с русским описанием, выполнить обычный push и открыть PR
   в `master`. Для изменённых Docker/env проверить сборку и контейнер.
4. Дождаться успешного GitHub CI: `checks`, все четыре E2E shard и итоговый gate
   `Typecheck, lint, build`. Не сливать PR при незавершённом/неуспешном CI.
   Прошедший CI без последующих изменений кода не требует повторения всего
   локального E2E-набора; container smoke всё равно обязателен.
5. После разрешённого merge получить **финальный SHA `master`**, дождаться
   успешного CI именно этой ревизии. Если merge изменил код, прежний CI PR не
   заменяет проверку финальной ревизии. Только затем создать аннотированный
   Git-тег на этом SHA; RC из release-ветки не является финальным образом.
6. Собрать `linux/amd64` из того же точного SHA, проверить OCI labels, файлы,
   runtime config и минимальный HTTP smoke. Сборка из Git-контекста исключает
   незакоммиченные/локальные файлы. Нельзя использовать `-dirty` как release SHA.
7. После отдельного разрешения на публикацию повторно проверить доступность
   versioned-тега, выполнить push, проверить manifest и pull образа, сохранить
   registry digest. Не назначать `latest` автоматически.
8. Передать DevOps image с digest, Git SHA/tag, runtime env, результат smoke и
   предыдущий образ для отката. После обновления проверить HTTP и `/api/config`;
   при регрессии вернуть предыдущий digest.

Подробный GitHub Release необязателен. Массовое обновление документации не нужно:
меняются только затронутые инструкции. Открытые backend-дефекты и production
hardening учитываются как известные ограничения, без автоматического запрета
тестового frontend-релиза.

## Сборка и проверка Docker

Dockerfile использует `node:24.15.0-alpine`, закреплённый OCI index digest
`sha256:d1b3b4da11eefd5941e7f0b9cf17783fc99d9c6fc34884a665f40a06dbdfc94f`.
`npm ci` использует lockfile. Runner содержит `public`, `.next/standalone`
(включая `server.js`, package files и runtime dependencies) и `.next/static`;
запуск — `node server.js`, пользователь `node`, порт `3000`.
Это фиксирует исходники, зависимости и базовый образ; побайтовая идентичность
повторных Next.js builds не гарантируется.

Команды ниже — Bash из чистого checkout **после merge и успешного CI финального
SHA**. Для следующего релиза версия читается из package.json:

```bash
set -euo pipefail
VERSION="$(node -p "require('./package.json').version")"
REVISION="$(git rev-parse HEAD)"
IMAGE="atupenov/frontend_app:v${VERSION}"
API_URL="https://figurzilla.ru/internal-api/v1"
test -z "$(git status --porcelain)"
test "$REVISION" = "$(git rev-parse origin/master)"

# Только после проверки отсутствия тега и CI финального SHA:
git tag -a "v${VERSION}" "$REVISION" -m "Релиз frontend ${VERSION}"
git push origin "refs/tags/v${VERSION}"

docker buildx build --platform linux/amd64 --load \
  --build-arg APP_VERSION="$VERSION" \
  --build-arg VCS_REF="$REVISION" \
  --build-arg NEXT_PUBLIC_API_URL="$API_URL" \
  --build-arg CLIENT_API_BASE_URL="$API_URL" \
  --build-arg API_BASE_URL="$API_URL" \
  -t "$IMAGE" \
  "https://github.com/AslanTheCreator/3d_print_market.git#${REVISION}"

docker image inspect "$IMAGE" --format '{{.Os}}/{{.Architecture}} {{.Config.User}} {{json .Config.Labels}}'
docker run --rm --entrypoint sh "$IMAGE" -c \
  'test -s server.js && test -d node_modules && test -d public && test -d .next/static && node -p "require(\"./package.json\").version"'

docker run -d --name figurzilla-release-smoke \
  -p 127.0.0.1:3028:3000 \
  -e CLIENT_API_BASE_URL="$API_URL" -e API_BASE_URL="$API_URL" \
  -e NEXT_PUBLIC_API_URL="$API_URL" -e ALLOW_LOCAL_API_URL=false "$IMAGE"
# Дождаться готовности; проверить, что apiUrl совпадает с API_URL.
curl --fail --retry 15 --retry-connrefused --retry-delay 2 \
  http://127.0.0.1:3028/api/config
curl --fail http://127.0.0.1:3028/ -o /dev/null
# Дополнительно проверить HTTP 200 любого /_next/static/... из HTML.
docker stop figurzilla-release-smoke
docker rm figurzilla-release-smoke
```

В inspect должны совпасть версия package.json, OCI
`org.opencontainers.image.version` и полный 40-символьный
`org.opencontainers.image.revision`. Проверить отсутствие `.env.local`, `.git`,
`.npmrc`, приватных ключей и credentials в финальном image и его layers/history.
`.dockerignore` исключает локальные env, credentials и служебные каталоги.
Build args содержат только публичные API URL и metadata; секреты через ARG/ENV
не передавать ([Docker build secrets](https://docs.docker.com/build/building/secrets/)).
Секреты не нужны для установки текущих публичных npm-зависимостей.

Публикация — **только после разрешения**, повторной проверки незанятого тега и
проверки локального образа выше:

```bash
docker login  # интерактивно/credential helper; не передавать пароль в командной строке
docker push "$IMAGE"
docker buildx imagetools inspect "$IMAGE"
# Сохранить Digest из registry inspect/push, затем подставить его без изменений:
docker pull --platform linux/amd64 'atupenov/frontend_app@sha256:<registry-digest>'
docker image inspect 'atupenov/frontend_app@sha256:<registry-digest>' \
  --format '{{json .Config.Labels}}'
```

Digest локального image ID не заменяет registry manifest/index digest.
После pull по digest повторить container smoke для этой ссылки. Запись о выпуске
хранится в PR/журнале доставки: версия, SHA/tag, CI URL, image@digest, API env,
smoke, предыдущий image@digest. Отдельный GitHub Release для этого не требуется.

## Откат и предыдущие публикации

Перед обновлением DevOps сохраняет фактически запущенный image@digest и runtime
конфигурацию. Откат: вернуть этот digest в конфигурации deployment, пересоздать
frontend тем же штатным способом, проверить `/`, static и `/api/config`.
Backend обновляется отдельно; откат frontend не откатывает backend или данные.
Совместимость предыдущего frontend с текущим backend нужно учитывать отдельно.

Проверенные публикации `atupenov/frontend_app`, `linux/amd64`, от 18.09.2026:

- `v1.26.0`: ревизия `cca45978f0413f61e4d966bd7b42ac918578559d`, digest
  `sha256:8d2b877e75062d68166da50412c8644301e481d6e46654946198a38c36a6c131`.
- `v1.27.0`: OCI version `1.27.0`, ревизия
  `7f8382d5a087ba255842a847146366528cc9e599-dirty`, registry index digest
  `sha256:b726288c921b1285006723e1646e4b7d8b4bc16ac1d7c1fac967e5b4cee40e59`.
  Доступность тега и digest повторно подтверждена 29.10.2026. Это исходный
  вариант отката для v1.28.0, если DevOps подтвердит, что он сейчас развёрнут.

`v1.27.0` включал незакоммиченные версию, changelog и отступ мобильного поиска.
Git-коммит/тег и GitHub Release не создавались; build и 15 HTTP smoke прошли,
полный standalone E2E и staging acceptance не выполнялись. Новый процесс устраняет
неопределённость исходников; исторический тег не изменять.
`v1.24` — исторический Docker-тег версии `1.24.0`; двухкомпонентный формат
сохранён только для той публикации.

## CI

`.github/workflows/frontend-ci.yml` запускается для PR и push в `master`/`main`:

1. `checks`: `npm ci`, runtime audit, typecheck, lint, architecture check,
   production build, upload standalone artifact, Docker build с OCI version/SHA.
2. Четыре `E2E shard N/4`: скачивают одну standalone-сборку, выполняют HTTP smoke
   и `npm run test:standalone -- --shard=N/4` для обоих Playwright-проектов.
3. Итоговый `Typecheck, lint, build` (`ci-result`) требует успеха `checks` и
   всех shard. Проверки не отключаются.

Standalone artifact хранится 1 день; Playwright reports и test-results каждого
shard — 7 дней. CI собирает Docker, но не публикует и не запускает image.
Container smoke выполняется отдельно. Real-backend acceptance, CD,
post-deploy checks и rollback CI не подтверждает. Подробности — [testing.md](./testing.md#ci-sharding).

## Известные риски и будущий production

Сохраняются **OPEN**:

- **BE-12-01:** backend CORS не разрешает `X-Refresh-Token`; успешный cross-origin
  browser refresh/retry заблокирован на проверенном DEV backend.
- **BE-12-02:** backend HTTP-диагностика требует redaction чувствительных данных.
- Ранее tracked Compose содержал plaintext SMTP credential. Удаление файла из
  frontend не отзывает секрет и не удаляет историю; ротация/отзыв, очистка истории
  и secret scan остаются необходимыми действиями владельца/DevOps.

Воспроизведение и границы доказательств —
[BACKEND_REQUIRED_FIXES.md](./backend-plan/BACKEND_REQUIRED_FIXES.md),
[результаты этапа 12](./backend-plan/stage12-results.md).
Проверки другого backend image не подтверждены. Тестовый frontend-релиз не
объявляет эти дефекты исправленными.

До полноценного production с реальными пользователями отложены:

- security hardening, HTTPS/fail-fast env validation, закрытие backend-дефектов;
- secret storage, подтверждённая ротация раскрытых credentials и secret scanning;
- deployment health/readiness с различением живого процесса и готовности API;
- error tracking с redaction, structured logs, release correlation, uptime,
  observability, alerting, SLO и ответственный за инциденты;
- staging acceptance с реальным совместимым backend, расширенная browser-матрица
  из [testing.md](./testing.md#release-acceptance-на-staging);
- расширенные release gates, rollout/canary, post-deploy smoke и проверенный
  автоматический либо документированный rollback;
- backup/restore и disaster recovery зависимых backend/storage систем;
- юридическое подтверждение документов и analytics consent flow.

Историческая оценка production readiness —
[production-readiness-audit-2026-06-17.md](./production-readiness-audit-2026-06-17.md).
Она относится к полноценному production, а не к go/no-go текущего тестового релиза.
Внешние deployment/runbooks при появлении связываются с точной версией документации.

## Локальный Docker Compose

Основной Compose находится в родительской папке `3D_print_market`, вне frontend:
`docker compose -f ../docker-compose.yml up -d` из корня frontend. Он запускает
PostgreSQL, MinIO и backend; frontend запускается отдельно. `init-scripts/`,
`data/`, `keys/` и `.env` принадлежат родительской папке; отдельный clone frontend
их не содержит. Это локальная инфраструктура, CI её не проверяет. Проверка
конфигурации: `docker compose -f ../docker-compose.yml config --quiet`.
Локальные hardcoded credentials нельзя переносить на стенд.

Backend image tag сам по себе не подтверждает совместимость. Интеграционный
`docker-compose.integration.yml` остаётся во frontend; применение описано в
[testing.md](./testing.md).
