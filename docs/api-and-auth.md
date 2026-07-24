# API и auth

Документ описывает текущую frontend-реализацию. Целевые production-изменения вынесены в [backend-contract.md](./backend-contract.md).

## HTTP

Основные файлы:

- `src/shared/api/axios/instances.ts` — Axios clients и interceptors;
- `src/shared/config/env.ts` — выбор API URL;
- `app/api/config/route.ts` — runtime URL для браузера;
- `src/shared/lib/errorHandler.ts` — нормализация ошибок.

Используются два клиента:

- **`publicClient`** — публичные запросы и auth endpoints.
- **`authClient`** — защищённые запросы, bearer token и refresh при `401`.

Новый HTTP client без отдельного архитектурного решения не создаётся. Доменные API находятся в `src/entities/<entity>/api` и используют готовые clients.

## Base URL

Сервер выбирает URL в порядке:

1. `API_BASE_URL`;
2. `CLIENT_API_BASE_URL`;
3. `NEXT_PUBLIC_API_URL`;
4. local fallback только вне production.

Браузер получает `CLIENT_API_BASE_URL` через `GET /api/config`. Local URL в production разрешается только при `ALLOW_LOCAL_API_URL=true`.

Текущая валидация принимает `http:` и `https:`. Требование HTTPS для публичного browser API пока зафиксировано только в `.env.example`, но не обеспечено кодом. Root-relative URL допустим для browser same-origin proxy, однако server-side `API_BASE_URL` должен быть абсолютным.

## Текущий auth flow

- `access_token`, `refresh_token` и `token_created_at` хранятся через `js-cookie`;
- `authClient` добавляет `Authorization: Bearer <access_token>`;
- при `401` параллельные запросы ожидают один refresh;
- `POST /auth/refresh` получает refresh token в `X-Refresh-Token`;
- после успешного refresh исходный запрос повторяется;
- при ошибке токены очищаются и пользователь направляется на `/auth/login`;
- logout сейчас очищает токены только на клиенте;
- `middleware.ts` и dashboard layout проверяют наличие auth cookies, а не валидность backend-сессии.

Это действующая реализация, но не целевая production-модель: токены доступны JavaScript. Риски, требования к backend и критерии миграции описаны в [auth-security-requirements.md](./auth-security-requirements.md).

Дополнительные открытые ограничения:

- автоматический logout через interceptor/token manager не гарантирует централизованную очистку auth-bound TanStack Query cache, Zustand и user-scoped browser data;
- product draft хранится в `localStorage` под общим ключом и не очищается при logout;
- очередь запросов во время refresh имеет 10-секундный client timeout, но не удаляет subscriber; поздний refresh способен повторить исходный запрос после уже показанной ошибки;
- server guards определяют auth только по наличию cookie и не подтверждают backend session;
- redirect после login/register не использует origin-based проверку и допускает backslash-вариант внешнего URL.

## Ошибки и типы

- Axios errors преобразуются в `ApiError`, кроме запросов с `_skipErrorTransform`;
- UI не должен зависеть от сырого `AxiosError` после interceptor;
- ошибки нельзя превращать в пустой результат без осознанного UX и логирования;
- password, token, authorization headers, cookies, request body и чувствительные query params нельзя писать в browser/server logs и error tracking;
- request/response и query params должны быть типизированы;
- DTO mapping хранится рядом с доменом;
- неподтверждённые поля и статусы не добавляются.

Сейчас redaction не централизован: часть login/refresh ошибок логируется как raw error. До подключения production error tracking требуется безопасная нормализация и удаление секретов.

## Server и client state

TanStack Query хранит backend data, loading/error state, cache и invalidation. Query keys находятся рядом с сущностью.

Zustand используется для auth и локального client state. Исключение — `cartQuantityStore`: он хранит optimistic projection количества, revisions и последнее подтверждённое значение, синхронизируясь с cart query. Это не второй источник истины о корзине; подтверждённые данные и остатки по-прежнему приходят с backend.

Auth-bound cache и persisted client state должны очищаться единым session teardown независимо от причины logout. В текущей реализации очистка query cache выполняется UI-кнопками logout, но не является частью `authStore.logout()`.

## Чувствительные операции

- `PUT /participant/password` сейчас отправляет `oldPassword` и `newPassword` в query string. Для production нужен подтверждённый body-контракт и redaction на proxy/backend.
- `POST /auth/password/reset` отправляет email в query, а UI может показывать backend message. Backend должен исключать account enumeration и определить rate limit, single-use, expiry и session revocation.
- Комментарии к заказу и delivery URL в части order endpoints также передаются через query. Чувствительные пользовательские значения должны переноситься в body после согласования контракта.
- Изображения `ORDER` загружаются авторизованно, но читаются через общий `publicClient`. До production требуется подтверждённый private access по участнику заказа.
- Платёжные реквизиты продавца запрашиваются по `participantId`; backend должен подтверждать object-level доступ в контексте заказа.

## Env

Актуальный список переменных находится в `.env.example`:

```txt
CLIENT_API_BASE_URL
NEXT_PUBLIC_API_URL
API_BASE_URL
ALLOW_LOCAL_API_URL
```
