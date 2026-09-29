# API и auth

Документ описывает текущую frontend-реализацию. Целевые production-изменения вынесены в [backend-contract.md](./backend-contract.md).

## HTTP

Основные файлы:

- `src/shared/api/axios/instances.ts` — Axios clients и interceptors;
- `src/shared/api/axios/authSessionAdapter.ts` — интерфейс связи HTTP-инфраструктуры с session;
- `src/shared/config/env.ts` — выбор API URL;
- `app/api/config/route.ts` — runtime URL для браузера;
- `src/shared/lib/errorHandler.ts` — нормализация ошибок.

Используются два клиента:

- **`publicClient`** — публичные запросы и auth endpoints.
- **`authClient`** — защищённые запросы, bearer token и refresh при `401`.

Новый HTTP client без отдельного архитектурного решения не создаётся. Доменные API находятся в `src/entities/<entity>/api` и используют готовые clients.

Auth API, store, `useAuth`, инициализация и refresh lifecycle принадлежат
`entities/session`. Axios не импортирует эту entity: `AuthProvider` в app layer
регистрирует `AuthSessionAdapter` с операциями refresh и обработки истёкшей
сессии. `features/auth` содержит только сценарный UI, guards и auth-действия.

## Base URL

Сервер выбирает URL в порядке:

1. `API_BASE_URL`;
2. `CLIENT_API_BASE_URL`;
3. `NEXT_PUBLIC_API_URL`;
4. local fallback только вне production.

Браузер получает `CLIENT_API_BASE_URL` через `GET /api/config`. Local URL в production разрешается только при `ALLOW_LOCAL_API_URL=true`.

Текущая валидация принимает `http:` и `https:`. Требование HTTPS для публичного browser API пока зафиксировано только в `.env.example`, но не обеспечено кодом. Root-relative URL допустим для browser same-origin proxy, однако server-side `API_BASE_URL` должен быть абсолютным.

## Текущий auth flow

- `AuthProvider` регистрирует session adapter и запускает инициализацию auth;
- `access_token`, `refresh_token` и `token_created_at` хранятся через `js-cookie`;
- `authClient` добавляет `Authorization: Bearer <access_token>`;
- при `401` interceptor вызывает refresh через adapter, а параллельные запросы ожидают один refresh;
- `POST /auth/refresh` получает refresh token в `X-Refresh-Token`;
- после успешного refresh исходный запрос повторяется;
- при ошибке токены очищаются и пользователь направляется на `/auth/login`;
- logout сейчас очищает токены только на клиенте;
- `middleware.ts` и dashboard layout проверяют наличие auth cookies, а не валидность backend-сессии.

Это действующая реализация, но не целевая production-модель: токены доступны JavaScript. Риски, требования к backend и критерии миграции описаны в [auth-security-requirements.md](./auth-security-requirements.md).

Login/register сохраняют `redirect` при переключении форм, после входа и
подтверждения почты на всех размерах экрана. Public API `entities/session`
экспортирует `getPostAuthRedirectPath` и `getAuthSwitchPath`: общий sanitizer
принимает локальный путь с query/hash, проверяет origin и нормализованный путь,
отклоняет внешние адреса, обратные слеши, управляющие символы и переходы на auth.
Некорректный адрес заменяется `/`. Auth routes используют `Suspense` для чтения
query-параметров через `useSearchParams`.

Дополнительные открытые ограничения:

- автоматический logout через interceptor/token manager не гарантирует централизованную очистку auth-bound TanStack Query cache, Zustand и user-scoped browser data;
- product draft хранится в `localStorage` под общим ключом и не очищается при logout;
- очередь запросов во время refresh имеет 10-секундный client timeout, но не удаляет subscriber; поздний refresh способен повторить исходный запрос после уже показанной ошибки;
- server guards определяют auth только по наличию cookie и не подтверждают backend session.

## Поиск товаров и сессия

`POST /products/find` не получает `includeAdult`: возрастной доступ определяет
backend по пользовательскому bearer token. Браузерный поиск авторизованного
пользователя идёт через `authClient`; гостевой поиск, SSR и sitemap — через
`publicClient`. Недействительный токен может дать успешную выдачу без 18+;
пустой результат не преобразуется фронтендом в ошибку доступа. Локальный
age gate категории остаётся предупреждением, а не подтверждением возраста серверу.

`useAuth` отдаёт неперсистентный `sessionKey`: `null` для гостя, номер ревизии
для инициализированной сессии. Композиция передаёт его в `useProductsInfinite`
и ожидает инициализацию auth перед запросом. Ключи каталога разделены по
сессиям; вход, выход и успешное обновление токена переключают выдачу. Токены
и персональные данные в query keys не помещаются. SSR initial data используются
только в гостевом кэше, поэтому не подавляют авторизованную загрузку.

Публичные товарные DTO поддерживают `EXTERNAL_PRODUCT`, `count: number | null`
и `externalUrl: string | null`. `count=null` означает неограниченный остаток;
публичный backend скрывает внешнюю ссылку значением `null`, покупатель её не видит.
Внешний товар участвует в обычных операциях корзины и создании заказа.
Это не даёт обычному продавцу права редактировать товар бота.
Количество внутри snapshot товара в заказе остаётся числом заказанных единиц.

## Суммы и этапы заказа

В `ListOrdersModel` / `ListOrdersDto` поле `prepaymentAmount` хранит готовую
предоплату за всё заказанное количество, `totalPrice` — готовый остаток к оплате.
`getOrderPaymentBreakdown` читает эти суммы без умножения на количество и без
пересчёта из `product.price` / `product.prepaymentAmount`. Полная стоимость товаров
для отображения — сумма этих двух компонентов; доставка показывается отдельно.
Признак `hasPrepayment` определяется как `order.prepaymentAmount > 0`, включая
`EXTERNAL_PRODUCT`; он управляет финансовой разбивкой, этапами и подсказками.

Первичное подтверждение обычного продавца по-прежнему вызывает
`POST /order/{id}/AWAITING_PREPAYMENT`. Несмотря на название endpoint, frontend
не устанавливает статус локально: после действия перечитывает заказ. Backend
возвращает `AWAITING_PREPAYMENT` при наличии предоплаты и `AWAITING_PAYMENT`
без неё. Действия покупателя доступны по фактическому `actualStatus`.

До создания заказа корзина располагает только ценой и предоплатой за единицу
товара. Её разбивка помечена как предварительный расчёт, включая внешние товары;
после создания во всех диалогах используются суммы из ответа заказа.

## Ошибки и типы

- Axios errors преобразуются в `ApiError`, кроме запросов с `_skipErrorTransform`;
- UI не должен зависеть от сырого `AxiosError` после interceptor;
- ошибки нельзя превращать в пустой результат без осознанного UX и логирования;
- password, token, authorization headers, cookies, request body и чувствительные query params нельзя писать в browser/server logs и error tracking;
- request/response и query params должны быть типизированы;
- DTO mapping хранится рядом с доменом;
- неподтверждённые поля и статусы не добавляются.

При чтении собственных настроек доменные ответы `404 + ACCOUNT_NOT_FOUND`
для `GET /accounts`, `404 + SOCIAL_NETWORK_NOT_FOUND` для
`GET /social-networks` и `404 + TRANSFER_NOT_FOUND` для `GET /transfer`
означают отсутствие записей и преобразуются в `[]` внутри соответствующего
API-модуля. Формы позволяют добавить первую запись. Другие `404`, ошибки
авторизации, сервера и сети остаются ошибками с возможностью повторной загрузки.
Это правило не применяется к чтению реквизитов другого участника
через `GET /accounts/participant/{id}` и к операциям записи.

Доменные DTO находятся в `model` соответствующих entities.
`entities/image` владеет `ImageMetadata`, `ImageResponse`, `ImageTag`, image API,
query hooks и `attachImages`. В `src/shared/model` остаётся только нейтральный
тип `Currency`.

Сейчас redaction не централизован: часть login/refresh ошибок логируется как raw error. До подключения production error tracking требуется безопасная нормализация и удаление секретов.

## Server и client state

TanStack Query хранит backend data, loading/error state, cache и invalidation. Query keys находятся рядом с сущностью.

Zustand используется для session state в `entities/session` и другого локального client state. Исключение — `cartQuantityStore`: он хранит optimistic projection количества, revisions и последнее подтверждённое значение, синхронизируясь с cart query. Это не второй источник истины о корзине; подтверждённые данные и остатки по-прежнему приходят с backend.

Auth-bound cache и persisted client state должны очищаться единым session teardown независимо от причины logout. В текущей реализации очистка query cache выполняется UI-кнопками logout, но не является частью `authStore.logout()`.

## Адрес доставки в checkout

Новый адрес можно добавить в checkout через существующую `AddressForm` и
`POST /address`: он сохраняется в аккаунте, а заказ по-прежнему получает
`addressId`. Пока форма открыта, адрес сохраняется или ожидается обновление
списка, отправка заказа заблокирована. Отмена до сохранения оставляет прежний
выбор адреса и остальные данные checkout.

Клиент `addressApi.create` не возвращает созданный адрес. После успешного
сохранения checkout перечитывает `GET /address` и автоматически выбирает
только единственный новый `ACTIVE` адрес, совпавший по всем полям ввода.
Порядок списка и максимальный ID не используются. При неоднозначности
прежний выбор сбрасывается и требуется ручной выбор.

Ошибка создания оставляет форму и введённые данные. Если создание подтверждено,
но перечитывание списка не удалось, действие «Повторить загрузку» выполняет
только чтение, без повторного `POST`. Список остаётся в TanStack Query; checkout
хранит выбранный ID и состояние локального сценария, а не копию адреса.

## Товары и доставка в checkout

Товары объединены по продавцам. Выбор доставки хранится независимо для каждого
продавца: единственный активный способ выбирается автоматически, несколько
способов открываются из компактной строки в диалоге (на мобильных — нижняя
панель). Изменение применяется кнопкой; отмена сохраняет прежний выбор.
Загрузка, ошибка с повтором и отсутствие способов отображаются внутри группы.

Доставка учитывается один раз на выбранного продавца, а не на каждую позицию.
Снятие выбора со всех его товаров исключает доставку из итога, сохраняя ещё
доступный способ для повторного выбора. Пока способ не определён хотя бы у
одного выбранного продавца, общая доставка помечается как нерассчитанная.
Существующие блокировки оформления и `transferId` в payload не изменены.

При недостаточном остатке карточка предлагает явно уменьшить количество до
доступного через существующий механизм синхронизации корзины. Нулевой остаток
позволяет исключить товар из заказа без удаления из корзины; автоматического
уменьшения количества нет.

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
