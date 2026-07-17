# API и auth

Документ описывает текущую frontend-реализацию. Целевые production-изменения вынесены в [backend-contract.md](./backend-contract.md).

## HTTP

Основные файлы:

- `src/shared/api/axios/instances.ts` — Axios clients и interceptors;
- `src/shared/config/env.ts` — выбор API URL;
- `app/api/config/route.ts` — runtime URL для браузера;
- `src/shared/lib/errorHandler.ts` — нормализация ошибок.

Используются два клиента:

| Клиент | Назначение |
| --- | --- |
| `publicClient` | публичные запросы и auth endpoints |
| `authClient` | защищённые запросы, bearer token и refresh при `401` |

Новый HTTP client без отдельного архитектурного решения не создаётся. Доменные API находятся в `src/entities/<entity>/api` и используют готовые clients.

## Base URL

Сервер выбирает URL в порядке:

1. `API_BASE_URL`;
2. `CLIENT_API_BASE_URL`;
3. `NEXT_PUBLIC_API_URL`;
4. local fallback только вне production.

Браузер получает `CLIENT_API_BASE_URL` через `GET /api/config`. Local URL в production разрешается только при `ALLOW_LOCAL_API_URL=true`.

## Текущий auth flow

- `access_token`, `refresh_token` и `token_created_at` хранятся через `js-cookie`;
- `authClient` добавляет `Authorization: Bearer <access_token>`;
- при `401` параллельные запросы ожидают один refresh;
- `POST /auth/refresh` получает refresh token в `X-Refresh-Token`;
- после успешного refresh исходный запрос повторяется;
- при ошибке токены очищаются и пользователь направляется на `/auth/login`;
- logout сейчас очищает токены только на клиенте;
- `middleware.ts` и dashboard layout проверяют наличие auth cookies, а не валидность backend-сессии.

Это действующая реализация, но не целевая production-модель: токены доступны JavaScript. Переход на HttpOnly cookies требует согласованного backend-контракта.

## Ошибки и типы

- Axios errors преобразуются в `ApiError`, кроме запросов с `_skipErrorTransform`;
- UI не должен зависеть от сырого `AxiosError` после interceptor;
- ошибки нельзя превращать в пустой результат без осознанного UX и логирования;
- request/response и query params должны быть типизированы;
- DTO mapping хранится рядом с доменом;
- неподтверждённые поля и статусы не добавляются.

## Server и client state

TanStack Query хранит backend data, loading/error state, cache и invalidation. Query keys находятся рядом с сущностью.

Zustand используется для auth и локального client state. Данные TanStack Query в Zustand не копируются.

## Env

Актуальный список переменных находится в `.env.example`:

```txt
CLIENT_API_BASE_URL
NEXT_PUBLIC_API_URL
API_BASE_URL
ALLOW_LOCAL_API_URL
```
