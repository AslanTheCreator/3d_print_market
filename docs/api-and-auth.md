# API и auth

Документ фиксирует текущую frontend-реализацию HTTP, auth, query и state management. Он не заменяет backend contract и не вводит новые backend endpoints.

## Где находится HTTP-инфраструктура

Основные файлы:

- `src/shared/api/axios/instances.ts`;
- `src/shared/api/index.ts`;
- `src/shared/config/env.ts`;
- `app/api/config/route.ts`.

Доменные API-модули находятся рядом с сущностями: `src/entities/<entity>/api`. Общий инфраструктурный API живет в `shared/api`.

## Axios clients

В проекте есть два клиента:

- `publicClient`;
- `authClient`.

Оба создаются в `src/shared/api/axios/instances.ts`.

`publicClient`:

- подставляет base URL;
- трансформирует ошибки в `ApiError`;
- используется для публичных запросов.

`authClient`:

- подставляет base URL;
- добавляет `Authorization: Bearer <access_token>`, если access token есть;
- обрабатывает 401 через refresh flow;
- трансформирует ошибки в `ApiError`;
- используется для защищенных запросов.

Нельзя создавать третий Axios client без отдельного архитектурного решения.

## Base URL

Base URL определяется через `src/shared/config/env.ts`.

Фактические env variables из `.env.example`: `CLIENT_API_BASE_URL`, `NEXT_PUBLIC_API_URL`, `API_BASE_URL`, `ALLOW_LOCAL_API_URL`.

Серверная сторона использует `getServerApiBaseUrl()`:

1. `API_BASE_URL`;
2. `CLIENT_API_BASE_URL`;
3. `NEXT_PUBLIC_API_URL`;
4. local fallback только не в production.

Браузер использует `getClientApiBaseUrl()` через `GET /api/config`, который возвращает `apiUrl`.

В production local API URL запрещен, если `ALLOW_LOCAL_API_URL` не равен `true`.

## Ошибки API

Ошибки нормализуются в `src/shared/lib/errorHandler.ts` через `ApiError`, `BackendErrorResponse`, `transformToApiError` и `logApiError`.

Interceptor преобразует Axios errors в `ApiError`, кроме запросов с `_skipErrorTransform`. UI и hooks не должны зависеть от сырого `AxiosError`, если ошибка уже прошла interceptor.

Ошибку нельзя проглатывать без user-visible состояния или осознанной обработки.

## Auth и token helpers

Текущие auth/token зоны:

- `src/shared/api/authApi.ts`;
- `src/shared/lib/auth/authStore.ts`;
- `src/shared/lib/token/tokenStorage.ts`;
- `src/shared/lib/token/tokenRefreshManager.ts`;
- `src/app/providers/AuthProvider.tsx`;
- `middleware.ts`.

`tokenStorage` использует `js-cookie` и хранит `access_token`, `refresh_token`, `token_created_at`.

`middleware.ts` защищает dashboard routes по наличию `access_token` или `refresh_token` cookie и редиректит анонима на `/auth/login`.

## Refresh flow

Текущий flow виден из кода:

1. `authClient` получает 401 и проверяет наличие refresh token.
2. При параллельном refresh новые запросы становятся в очередь.
3. Иначе вызывается `useAuthStore.getState().refreshToken()`.
4. `authApi.refreshAccessToken()` отправляет `POST /auth/refresh` через `publicClient`.
5. Refresh token передается в header `X-Refresh-Token`.
6. Новый access token сохраняется в `tokenStorage`.
7. Исходный запрос повторяется с новым `Authorization` header.
8. При неудаче выполняется logout и redirect на `/auth/login`.

Также есть proactive refresh через `tokenRefreshManager`, который инициализируется в `AuthProvider` через `useTokenRefresh()`.

## Правила для API-модулей

- Использовать `publicClient` для публичных запросов.
- Использовать `authClient` для защищенных запросов.
- Не создавать новый HTTP client.
- Не собирать base URL вручную в доменных API.
- Не придумывать backend endpoint, payload, status или response shape.
- Типизировать request/response.
- Query params собирать явно и безопасно.
- API-модуль не должен содержать UI-логику.
- Shared API допустим только для действительно общих операций.

## DTO и mapping

Правила:

- DTO и domain types держать в существующих `model/types.ts` или `shared/model`, если тип уже общий.
- Mapping держать рядом с доменом или API-модулем.
- Использовать существующие helpers вроде `attachImages`, `buildProductRequest` и product form mappers.
- Списки заказов нормализуют товар из DTO в domain model в `entities/order/api`: `product.image` подгружается по `product.imageId`.
- Не менять frontend type под предположение о backend.

Если backend shape неясен, сначала найти существующий API usage или подтвержденный документ. Если подтверждения нет, запросить уточнение.

## TanStack Query

`QueryProvider` находится в `src/app/providers/QueryProvider.tsx`.

Текущие default options:

- `staleTime: 30_000`;
- `gcTime: 5 * 60_000`;
- query retry максимум один раз и зависит от `ApiError`;
- mutations не retry;
- `refetchOnWindowFocus: false`;
- `refetchOnReconnect: true`.

Conventions:

- query keys держать рядом с entity в `model/queryKeys.ts`;
- query hooks для доменных данных держать в `entities`;
- feature hooks могут вызывать mutations и invalidation;
- server state не переносить в Zustand;
- loading/error/empty states брать из query state.

## Zustand

Zustand используется для client state.

Текущие примеры:

- auth store в `src/shared/lib/auth/authStore.ts`;
- cart quantity store в `src/entities/cart/model/cartQuantityStore.ts`.

Правила:

- не хранить backend data в Zustand вместо TanStack Query;
- не создавать global store для локального состояния одного компонента;
- persist использовать только если состояние должно переживать reload;
- не дублировать query cache в store.

## Формы и backend validation

Для нетривиальных форм используется React Hook Form.

Правила: не добавлять backend validation assumptions, учитывать loading/error states при submit и не менять payload shape без подтвержденного API usage.

## Env

Документированные env variables: `CLIENT_API_BASE_URL`, `NEXT_PUBLIC_API_URL`, `API_BASE_URL`, `ALLOW_LOCAL_API_URL`.

Секреты из `.env.local` нельзя печатать в ответах, логах или документации.

## Нельзя

- Создавать второй HTTP client.
- Выполнять защищенные запросы через `publicClient`.
- Придумывать backend fields, endpoints, statuses или validation rules.
- Переносить server state в Zustand.
- Хранить API-ошибки только в console без UI-состояния.
- Менять auth flow без проверки связанных мест: `authApi`, `authStore`, token helpers, `AuthProvider`, `middleware`, protected UI.
