# Аудит frontend: API layer и server state

Дата: 01.10.2026. Проект: Figurzilla, версия package.json — 1.27.0.
Проверенная ревизия: `8377939`. До начала работы в `docs/frontend-audit/`
уже находился незакоммиченный отчёт `01-architecture.md`; он не изменялся.

## 1. Результат

Найдены 13 проблем, исправимых на frontend: 4 High, 7 Medium и 2 Low.
Critical-проблем не подтверждено. Наиболее важны изоляция приватного кэша,
жизненный цикл refresh и неопределённый результат создания заказа.

| ID | Severity | Проблема | Effort |
| --- | --- | --- | --- |
| S1 | High | Приватный кэш не изолирован между аккаунтами и не очищается при всех способах завершения сессии | Medium |
| S2 | High | Поздний refresh восстанавливает завершённую сессию; refresh не объединён между инициаторами | Medium |
| S3 | High | Запрос из очереди refresh повторяется после уже показанного таймаута | Medium |
| S4 | High | Потеря ответа на создание заказа трактуется как отказ и разрешает повторный POST | Medium |
| S5 | Medium | Rollback избранного перезаписывает результаты других мутаций | Medium |
| S6 | Medium | Ошибка удаления изображения скрывает успешное сохранение товара или профиля | Medium |
| S7 | Medium | Удаление и продление товара оставляют публичную выдачу свежей в кэше | Small |
| S8 | Medium | Ошибки операций избранного и удаления из корзины не отображаются пользователю | Small |
| S9 | Medium | Логирование API errors раскрывает исходную конфигурацию с секретами | Small |
| S10 | Medium | Повтор после 401 удваивает префикс root-relative API URL | Small |
| S11 | Medium | Успешное чтение профиля становится ошибкой из-за недоступного аватара | Medium |
| S12 | Low | Optimistic add в избранное читает InfiniteData как Product[] | Small |
| S13 | Low | Большинство обычных queries не передают AbortSignal в HTTP-запросы | Medium |

Оценки описывают последствия клиентской реализации. Факт эксплуатации,
реальные дубли заказов и инциденты с данными production не проверялись.
Backend-код, полнота API и необходимость новых endpoint/полей не оценивались.
S1 и товарная часть S6 пересекаются с A1/A2 предыдущего отчёта; здесь
рассмотрены конкретные последствия для кэша и результатов запросов.

## 2. Discovery и scope

### Правила, стек и конфигурация

Изучены `AGENTS.md`, релевантные разделы `docs/architecture.md`,
`docs/api-and-auth.md`, `docs/testing.md`, `package.json`, `tsconfig.json`,
`next.config.mjs`, `playwright.config.ts`, HTTP/env-конфигурация и providers.
Дополнительных `AGENTS.md` в дереве проекта вне зависимостей не найдено.

Стек: Next.js App Router 15, React 19, TypeScript strict, MUI, TanStack Query 5,
Zustand 5, React Hook Form, Axios и npm. Локально проверены Node.js 24.15.0,
`@tanstack/query-core` 5.90.20 и Axios 1.18.1. Диапазоны зависимостей в
package.json не трактовались как точные установленные версии.

Сначала выполнен поиск clients, query hooks, keys, mutations и операций
с кэшем. Затем прослежены связи API → entity hook → feature/widget/route.
Глубокий анализ ограничен обнаруженными цепочками и их session lifecycle;
остальной UI и backend не читались последовательно.

### Карта API и server state

| Область | Файлы и связи |
| --- | --- |
| HTTP | `src/shared/api/axios/instances.ts`: только `publicClient` и `authClient`, timeout 30 секунд; URL, bearer token, refresh и преобразование ошибок |
| Runtime URL | `src/shared/config/env.ts`, `app/api/config/route.ts`; браузер читает `/api/config`, сервер использует env |
| Сессия | `entities/session/api/authApi.ts`, `model/authStore.ts`, `model/useTokenRefresh.ts`, `shared/lib/token/tokenRefreshManager.ts`; app связывает HTTP и session через `authSessionAdapter` |
| QueryClient | `src/app/providers/QueryProvider.tsx`: один экземпляр на provider, staleTime 30 секунд, gcTime 5 минут, `shouldRetryQuery`, focus refetch выключен, reconnect включён; mutations без retry |
| Каталог | `product/api/productApi.ts`, `model/queryKeys.ts`, `useProductQueries.ts`, `useInfiniteProducts.ts`, `useProductMutations.ts`; потребители — product-catalog, seller page, product-details, user-products, create-product-form |
| Корзина | `cart/api/cartApi.ts`, `useCartQueries.ts`, `useCartMutations.ts`, `useCartQuantity.ts`, `cartQuantityStore.ts`; add-to-cart и checkout |
| Избранное | `favorite/api/favoritesApi.ts`, `useFavoritesQueries.ts`, `useFavoritesMutations.ts`, `useFavoritesChecks.ts`; toggle-favorite, ProductCatalog и `/favorites` |
| Заказы | `order/api/orderApi.ts`, `model/queryKeys.ts`, `useOrderQueries.ts`, `useOrderMutations.ts`; checkout delivery, order-create, order actions, orders и header pending actions |
| Пользователь | `user/api/userApi.ts`, `useUserQueries.ts`, `useUserMutations.ts`, `useSessionProfile.ts`; dashboard, профиль, проверка владельца при покупке, checkout |
| Настройки | `address`, `account`, `transfer`, `social-network`: доменные API/keys/query/mutation hooks; dashboard-settings и checkout. Формы используют `useSettingsDraft` и перечитывание результатов |
| Изображения | `imageApi.ts`, `adminImageApi.ts`, `attachImages.ts`, `useImageQueries.ts`; metadata в доменных списках, аватары и подтверждения оплаты |
| Справочники | `category/api/categoryApi.ts`, `useCategories.ts`; `dictionaryApi.ts`, `useDictionaryQueries.ts`; каталог и формы |
| Отзывы | `review/api/reviewsApi.ts`, `useCreateReview.ts`; `widgets/orders/model/useLeaveReview.ts` выполняет междоменную invalidation |
| Админка | `agent`, `product`, `order` admin APIs/queries, административные CRUD рядом с entities; consumers в admin widgets/features; `AdminCacheBoundary` удаляет предыдущий session-scoped кэш |
| SSR | Главная, категории, product detail и sitemap вызывают существующие API; product detail использует React `cache` для общей загрузки страницы и metadata, клиент получает initialData/fetchedAt |

### Ключи и политика кэша

- Каталог: `["products", "list", { sessionKey }, size, filters, sortBy]`.
  Размер, фильтры и сортировка включены; SSR initialData используются только
  для гостевой сессии. Свежие объекты filters сами по себе не создают новый
  query: ключ сравнивается структурно.
- Собственные товары: `["products", "user", "list", size, filters, sortBy]`;
  renewal check — отдельный `["products", "user", "renewal-check"]`.
- Корзина: `["cart"]`; избранное: `["favorites", "list"]`.
- Пользователь: `["users", "current"]`, `["users", "profile"]`,
  `["users", "byId", id]`.
- Заказы: `["orders", "seller"]`, `["orders", "customer"]`,
  `["orders", "data", productId]`.
- Настройки: `["addresses", "list"]`, `["accounts", "me", "list"]`,
  `["transfers", "list"]`, `["social-networks", "list"]`.
  Реквизиты продавца дополнительно имеют participantId в ключе.
- Изображения: `["images", ...ids]` и `["imageMetadata", ...ids]`;
  справочники — `["dictionary", type]`, категории — `["categories", ...]`.
- Админка: `["admin", accountRevision, ...]`, с ID сущности/бота и фильтрами.
  Refresh того же аккаунта сохраняет accountRevision.

Доменные staleTime обычно составляют 2–10 минут; gcTime — 5–30 минут.
Сами эти значения не признаны дефектом. Существенны неполная invalidation
и отсутствие изоляции аккаунтов, а не требование уменьшить все TTL.
Некоторые hooks переопределяют глобальную retry-политику числом `1`/`2`;
это допускает повтор терминальных ошибок. Отдельная серьёзная проблема
только на основании такого переопределения не заявляется.

## 3. Подтверждённые проблемы

### S1. Приватный кэш переживает завершение сессии и смену аккаунта

**Severity:** High. **Effort:** Medium.

**Файлы и место:** `src/entities/session/model/authStore.ts:71–80,159–174`;
`src/app/providers/AuthProvider.tsx:39–43`;
`src/app/providers/AdminCacheBoundary.tsx:8–13`;
`src/entities/cart/model/useCartQueries.ts:16–22`;
`src/entities/user/model/useUserQueries.ts:6–25`;
query keys избранного, заказов и настроек;
`src/entities/cart/model/useCartMutations.ts:51–58`.

**Проблема и почему:** обычные приватные queries используют общие ключи без
аккаунта. `logout()` очищает токены/store, но не QueryClient. Очистка queries
выполняется отдельными UI-кнопками выхода; автоматический logout менеджера
токенов её не выполняет. AuthProvider очищает только quantities, а
AdminCacheBoundary защищает только ключи `admin`. `enabled: false` не удаляет
ранее полученные данные. Поздний ручной refresh корзины также может выполнить
`setQueryData` после очистки: его callback не проверяет актуальность аккаунта.

**Сценарий и последствия:** A загрузил корзину/профиль/заказы; сессия завершилась
проактивным refresh; B вошёл в том же приложении. Общие ключи позволяют
использовать ещё свежие данные A вместо запроса B. Возможны показ чужих
адресов/заказов, неверная проверка владельца товара и ошибочные checkout selections.
Это проблема изоляции клиентских данных, а не утверждение о доступе B к API A.
Полный document redirect interceptor обычно уничтожает in-memory QueryClient,
но не устраняет другие способы смены сессии.

**Исправление на frontend:** добавить app-level границу для всех приватных
queries: отменять и удалять данные предыдущего аккаунта при любой смене
accountRevision/auth state. Передавать account scope в ключи из композиции,
по уже используемому паттерну админки. Привязать ручные обновления и callbacks
мутаций к захваченной ревизии аккаунта, чтобы поздний ответ не заполнял новый
кэш. Refresh того же аккаунта не должен считаться сменой владельца данных.

### S2. Refresh может восстановить завершённую или заменить новую сессию

**Severity:** High. **Effort:** Medium.

**Файлы и место:** `src/entities/session/api/authApi.ts:131–149`;
`src/entities/session/model/authStore.ts:159–174`;
`src/shared/lib/token/tokenRefreshManager.ts:136–164,261–270`;
`src/shared/api/axios/instances.ts:244–289`.

**Проблема и почему:** refresh захватывает refresh token, ожидает ответ и
без проверки поколения сессии сохраняет токены. Store безусловно устанавливает
`isAuthenticated: true`. Logout останавливает таймер, но не выполняющийся
refresh. Mutex в Axios защищает только refresh, инициированный этим
interceptor; проактивный менеджер и initialization вызывают тот же store
напрямую, без общего pending promise.

**Доказательство и последствия:** локально запущены два store refresh с
задержанным ответом, затем logout. После logout токены отсутствовали и auth
был false; после ответов восстановились токены A и auth стал true. Выполнено
два refresh-вызова. При промежуточном входе B поздний ответ A способен
перезаписать B; ошибка старого refresh также может изменить auth state новой
сессии. Это независимо от серверной ротации refresh token.

**Исправление на frontend:** единый session-scoped refresh coordinator для
initialization, таймера и Axios; один pending promise на поколение аккаунта.
Проверять ревизию до сохранения токенов и изменения store. Logout/новый login
инвалидируют поколение и отменяют refresh через AbortController; даже если
отмена опоздала, устаревший ответ не применяется. Не сохранять токены внутри
API-функции до проверки актуальности владельцем session lifecycle.

### S3. Refresh-очередь выполняет запрос после его таймаута

**Severity:** High. **Effort:** Medium.

**Файлы и место:** `src/shared/api/axios/instances.ts:71–88,248–271,300–302`.

**Проблема и почему:** ожидание refresh отклоняет promise через 10 секунд,
но не удаляет success/failure subscribers. Поздний `onRefreshSuccess`
всё равно вызывает `instance(originalRequest)`. Завершившийся promise
не мешает побочному эффекту, вычисляемому внутри `resolve(...)`.

**Доказательство и последствия:** настоящие Axios interceptors с локальным
adapter вернули ожидающему POST `REFRESH_TIMEOUT`. После завершения refresh
тот же POST был повторно передан adapter с `_retry: true`. Для создания заказа
и других записей UI уже показывает ошибку, но операция ещё может выполниться;
ручной повтор может наложиться на скрытый replay. Timeout Axios 30 секунд
позволяет refresh закончиться позже 10-секундного ожидания.

**Исправление на frontend:** очередь должна поддерживать unsubscribe,
очистку timer и флаг завершённости. По timeout, abort или смене аккаунта
удалять запись; перед replay проверять signal, состояние ожидания и поколение
сессии. После сообщения об истечении ожидания запрос не должен отправляться.
Отдельно сохранять состояние неизвестного результата для уже отправленных
записей, а не трактовать transport timeout как подтверждённый отказ.

### S4. Checkout разрешает повтор записи с неизвестным результатом

**Severity:** High. **Effort:** Medium.

**Файлы и место:**
`src/features/order-create/model/useOrderCreateSubmit.ts:143–185,256–295`;
`src/features/order-create/model/orderCreatePayload.ts:29–40`;
`src/widgets/checkout/ui/CheckoutResultDialog.tsx:62–64,86–102`.

**Проблема и почему:** все ошибки создания, кроме
`PRODUCT_NOT_PURCHASABLE`, превращаются в `status: "error"` без запрета retry.
При TIMEOUT/NETWORK_ERROR потеря ответа не доказывает, что сервер не принял
POST. `getFailedOrders` включает такой заказ в повторную отправку, а диалог
утверждает «Заказы не были оформлены». Проверка текущей корзины/остатка перед
retry не подтверждает результат предыдущего POST.

**Доказательство и последствия:** в локальной проверке API stub зафиксировал
создание, затем имитировал потерю ответа. Frontend сообщил 0 успешных заказов
и оставил заказ retry-eligible. Возможны повторная покупка и неверная
информация о результате. Реальная серверная идемпотентность не исследовалась
и не предполагалась.

**Исправление на frontend:** выделить клиентское состояние «результат неизвестен»
для потери ответа и запретить слепой повтор. Предложить перечитать существующие
`/order/customer` и корзину, показать пользователю подтверждённые данные.
Если нельзя однозначно сопоставить результат с отправкой, сохранить
неопределённость и блокировку повторного POST; отсутствие совпадения не
объявлять доказательством отказа. Новые endpoint, idempotency fields или
изменения backend для этого защитного поведения не нужны. В админских order
actions уже есть близкий паттерн блокировки и проверки результата.

### S5. Rollback избранного восстанавливает весь устаревший snapshot

**Severity:** Medium. **Effort:** Medium.

**Файлы и место:** `src/entities/favorite/model/useFavoritesMutations.ts:13–43,53–76`;
`src/features/toggle-favorite/model/useToggleFavorite.ts:9–25`.

**Проблема и почему:** каждая мутация сохраняет полный список и при ошибке
восстанавливает его целиком. Разные карточки используют разные mutation
instances и могут работать параллельно. Invalidation выполняется только
в `onSuccess`; поздний rollback не перечитывает подтверждённый результат.

**Доказательство и последствия:** список `[A,B]`; удаление A ожидает ответ,
удаление B успешно, refetch возвращает `[A]`; затем A получает ошибку.
Его rollback возвращает `[A,B]`, причём `isInvalidated` остаётся false.
Успешно удалённый B снова считается избранным, а UI может выбрать неверное
следующее действие. Локально последовательность воспроизведена с настоящим
QueryClient и callbacks текущего hook.

**Исправление на frontend:** откатывать только изменение конкретного productId
с учётом более новых операций, либо сериализовать записи общего списка.
Выполнять итоговую invalidation в `onSettled`, согласовав её с количеством
ещё выполняющихся мутаций. Не заменять общий список старым snapshot после
того, как другая операция уже подтверждена.

### S6. Сохранение и cleanup изображения ошибочно считаются одной операцией

**Severity:** Medium. **Effort:** Medium.

**Файлы и место:** `src/entities/product/model/useProductMutations.ts:21–39`;
`src/entities/user/model/useUserMutations.ts:20–30,72–85`;
`src/widgets/create-product-form/model/productFormSubmit.ts:93–108`;
`src/widgets/dashboard-home/ui/ProfileForm.tsx`, обработчик `onSubmit`.

**Проблема и почему:** после успешного PUT выполняется отдельный DELETE
изображений. Если DELETE завершается ошибкой, mutation получает общий status
error, хотя основная запись сохранена. Для товара не выполняется `onSuccess`
и invalidation; для профиля срабатывает optimistic rollback, затем refetch
в `onSettled`, но UI всё равно сообщает об ошибке сохранения.

**Доказательство и последствия:** текущая товарная mutation с успешным PUT
и отказом image cleanup получила status error; detail query не invalidated.
Пользователь видит старый товар и может снова отправить сохранённый payload;
ошибка cleanup неотличима от отказа основной записи. Профиль может визуально
откатываться, а затем возвращаться к уже сохранённым данным.

**Исправление на frontend:** разделить подтверждение сохранения и cleanup.
После PUT синхронизировать основной query cache независимо от DELETE;
ошибку удаления показывать отдельно. Повтор cleanup должен отправлять только
DELETE, без повторного PUT и без rollback уже подтверждённой записи.

### S7. После удаления/продления товара публичный каталог не invalidated

**Severity:** Medium. **Effort:** Small.

**Файлы и место:** `src/entities/product/model/useProductMutations.ts:44–68`;
`src/entities/product/model/useProductQueries.ts:66–81`;
`src/entities/product/model/useInfiniteProducts.ts:46,53,83`;
`src/widgets/user-products/ui/UserProductsList.tsx:83–89`.

**Проблема и почему:** delete и extend invalidated собственные товары и detail,
но не `productKeys.lists()`. Ключ публичной выдачи находится в другой ветке.
Запись меняет наличие/актуальность товара в каталоге, однако его прежние
страницы остаются fresh до пяти минут.

**Доказательство и последствия:** после исполнения текущей delete mutation
catalog query с этим товаром сохранил `isInvalidated: false`. При клиентском
возврате в недавно открытый каталог продавец видит удалённую карточку;
после продления прежняя выдача может не показать вновь актуальный товар.
Обновление собственного списка не исправляет публичный кэш.

**Исправление на frontend:** после подтверждённой записи invalidated
`productKeys.lists()` вместе с текущими целями. Для удаления можно также
адресно убрать карточку из известных infinite pages и затем перепроверить
выдачу. Не требуется менять запросы или формат ответа backend.

### S8. Ошибки toggle favorite и удаления из корзины скрыты от UI

**Severity:** Medium. **Effort:** Small.

**Файлы и место:** `src/features/toggle-favorite/model/useToggleFavorite.ts:13–25`;
`src/features/toggle-favorite/ui/FavoriteButton.tsx`, `handleClick`;
`src/entities/cart/model/useCartItemRemoval.ts:8–16`;
`src/entities/cart/model/useCartMutations.ts:132–142`;
`src/widgets/checkout/ui/CheckoutCartSection.tsx:32`.

**Проблема и почему:** favorite feature возвращает только действие и pending,
не error; его mutate вызывается без локального `onError`. Удаление корзины
подключает лишь `onSettled`. Entity rollback выполняется, но сообщение
пользователю не передаётся. QueryProvider не содержит глобальной MutationCache
обработки для уведомлений; dev console HTTP interceptor её не заменяет.

**Сценарий и последствия:** DELETE/POST возвращает ошибку, затем GET списка
успешен. Карточка возвращается в корзину/избранное или остаётся неизменной,
без объяснения и доступного повторного действия с контекстом ошибки.
Query error state страницы не сообщает об этом: ошибка была у mutation.

**Исправление на frontend:** передавать нормализованную ошибку в feature/UI
и показывать уведомление либо локальное error state. Pending, rollback и
ошибка refetch должны различаться. Использовать существующий NotificationProvider;
не создавать ещё один глобальный механизм и не показывать уведомление для
обычного AbortSignal cancellation.

### S9. API errors логируются вместе с токенами и параметрами запросов

**Severity:** Medium. **Effort:** Small.

**Файлы и место:** `src/shared/lib/errorHandler.ts:176–188,243–267`;
`src/entities/session/model/authStore.ts:171–173`;
`src/entities/session/api/authApi.ts:139–145`;
`src/entities/user/api/userApi.ts:43–49`.

**Проблема и почему:** ApiError сохраняет original AxiosError, а dev logger
печатает его целиком. Config содержит `Authorization`/`X-Refresh-Token`, body
и query params. Кроме того, store пишет refresh error в console.error без
проверки NODE_ENV; его originalError содержит refresh header. Пароли в query
существующего changePassword контракта также попадают в исходную config.
Проблема здесь — логирование на frontend, а не требование изменить контракт.

**Доказательство и последствия:** тест с искусственным refresh header
подтвердил, что этот header доступен объекту `Original`, переданному logger.
Настоящие секреты не читались и не выводились. При ошибках секреты доступны
в консоли, при копировании диагностик и подключении сборщика console errors;
последнее является возможным последствием, существующий сборщик не предполагается.

**Исправление на frontend:** централизованно логировать allowlist безопасных
полей: status, code, безопасное сообщение и путь без чувствительных параметров.
Не передавать raw error/config/request в console, включая refresh store catch.
Удалять secrets из details/messages при необходимости. Исходную ошибку можно
сохранить для внутренней обработки, но не публиковать автоматически в логах.

### S10. Root-relative API URL ломается при повторе запроса

**Severity:** Medium. **Effort:** Small.

**Файлы и место:** `src/shared/api/axios/instances.ts:175–187,254–255,300–302`;
`src/shared/config/env.ts:15–16,48–49`; `.env.example:2–3`.

**Условие:** CLIENT_API_BASE_URL — поддерживаемый путь same-origin proxy,
например `/proxy`. Наличие такой конфигурации на production не проверялось.

**Проблема и почему:** URL interceptor мутирует `config.url`, добавляя префикс.
Только `http://`/`https://` считаются уже полными URL. После 401 повтор использует
тот же config, поэтому `/proxy/participant` снова получает `/proxy`.

**Доказательство и последствия:** через фактические Axios interceptors и
локальный adapter получена последовательность
`/proxy/participant` → `/proxy/proxy/participant`.
Успешный refresh не восстанавливает исходный запрос; пользователь получает
ошибку маршрута вместо данных. При абсолютном API URL этот конкретный дефект
не воспроизводится.

**Исправление на frontend:** задавать `config.baseURL`, сохраняя относительный
endpoint в `config.url`, либо сделать преобразование идемпотентным и хранить
исходный URL. Проверить и leader request, и queued replay, и повторные
request interceptors без изменения backend proxy.

### S11. Необязательный аватар блокирует уже загруженные данные профиля

**Severity:** Medium. **Effort:** Medium.

**Файлы и место:** `src/entities/user/api/userApi.ts:15–20,28–33`;
`src/entities/user/model/useUserQueries.ts:6–25`;
`src/features/add-to-cart/model/useAddToCartFeature.ts:30–49`;
`src/widgets/checkout/ui/Checkout.tsx:44–48`.

**Проблема и почему:** queryFn получает пользователя/профиль, затем обязательно
ожидает metadata аватара. Отказ metadata отклоняет query целиком, хотя ID,
права и остальные пользовательские данные уже доступны. Проверка владельца
при добавлении в корзину получает `isOwnerCheckError` и блокирует действие.

**Доказательство и последствия:** с успешным основным ответом и ошибкой metadata
обе текущие функции `getUser`/`getProfileUser` завершились rejected.
Временная недоступность изображения превращается в недоступность кабинета,
проверки владельца и использующих профиль покупательских сценариев.
Для административной проверки доступа уже применяется отдельный профиль
без загрузки аватара (`useSessionProfile`).

**Исправление на frontend:** отделить основной профиль от optional enrichment
и читать аватар отдельным image query с собственными loading/error/fallback.
Core query остаётся успешным; ошибка metadata явно отображается локально,
а не скрывается произвольным возвратом пустого результата. Для покупки
использовать уже подтверждённый ID, сохранив запрет при ошибке самого профиля.

### S12. Optimistic добавление в избранное не понимает infinite cache

**Severity:** Low. **Effort:** Small.

**Файлы и место:** `src/entities/favorite/model/useFavoritesMutations.ts:19–28`;
`src/entities/product/model/useInfiniteProducts.ts:52–85`;
`src/widgets/product-catalog/ui/SearchProducts.tsx:45`.

**Проблема и почему:** lookup выполняет
`query.state.data as Product[]`, затем flatMap/find по `product.id`.
Действующая выдача хранит `InfiniteData` с `pages`/`pageParams`. Cast не меняет
runtime shape: find получает объект страниц вместо товаров, productData
остаётся undefined и optimistic append не выполняется.

**Доказательство и последствия:** в кэш помещены страницы с товаром ID 1 и
пустое избранное; вызов текущего `onMutate(1)` оставил избранное `[]`.
API-запись не сломана, но переключение интерфейса полностью ждёт refetch;
после окончания mutation прежняя иконка может оставаться до завершения GET.
Severity Low отражает ограниченный эффект, а не нарушение server contract.

**Исправление на frontend:** типизированно читать
`InfiniteData<Product[]>` и искать товар в `pages.flat()`, либо передавать
доступную карточку в optimistic context. Не обходить произвольные shapes
через unchecked cast и не добавлять отдельный Zustand cache товаров.

### S13. Обычные read-запросы продолжаются после смены страницы/фильтра

**Severity:** Low. **Effort:** Medium.

**Файлы и место:** `src/entities/product/model/useInfiniteProducts.ts:54–64`;
`src/entities/product/model/useProductQueries.ts:34,51`;
`src/entities/product/api/productApi.ts:17–38,53–81`;
`src/entities/cart/model/useCartQueries.ts:18`;
`src/entities/order/model/useOrderQueries.ts:12,22,35`;
`src/entities/image/lib/attachImages.ts:4–13`;
query/API hooks user, address, account, transfer, social-network, category,
dictionary и `widgets/checkout/model/useCheckoutDelivery.ts:53–58`.

**Проблема и почему:** queryFn не читает context.signal, доменные read APIs
обычно его не принимают. Отмена query не отменяет фактический Axios request;
после ответа основной загрузки может начаться дополнительное чтение metadata
уже ненужной выдачи. Admin queries и admin APIs сигнал передают корректно;
`imageApi.getImageMetadata` также уже умеет его принимать.

**Доказательство и последствия:** локальный QueryObserver использовал текущую
product queryFn; после unsubscribe запрос завершился и записал success.
Fetch params не содержали signal. Быстрая смена поиска/фильтров или переход
создают ненужный трафик и конкуренцию за соединения. Стабильные ключи сохраняют
изоляцию разных фильтров: перезапись нового результата старым здесь не заявляется.

**Исправление на frontend:** передавать signal из query context через
fetchFunction/API и `attachImages` во все HTTP stages одной загрузки.
Останавливать enrichment после abort. Сохранить cancellation как cancellation,
не превращая её в пользовательскую backend error. Не отменять автоматически
записи с уже возможным серверным эффектом: их результат обрабатывается отдельно.

## 4. Что проверено без серьёзных замечаний

- **Общая организация API:** двух существующих clients достаточно; доменные
  модули используют их, третьего HTTP client не найдено. Защищённые операции
  идут через authClient; guest/SSR поиск — через publicClient.
- **Стабильность параметров ключей:** фильтры, сортировка, page size, ID
  продавца и admin pagination/filter находятся в соответствующих ключах.
  Токены в query keys не помещаются. Проблема S1 относится к владельцу
  приватных данных, а не к сериализации filters.
- **Административный кэш:** session-scoped keys и AdminCacheBoundary,
  отмена через signal, guard до дочерних запросов. Серьёзного отдельного
  дефекта изоляции admin query cache не подтверждено. Ручные write flows
  используют локальные busy/lock, перечитывание и обработку неизвестного
  результата; перенос их в useMutation только ради единообразия не предлагается.
- **Корзина и optimistic quantity:** store хранит проекцию ввода/revisions,
  а не независимый полный DTO-cache; есть per-product mutation scope,
  debounce, acknowledge/validation/rollback и запрет checkout при несверенном
  количестве. Само это документированное исключение не является дефектом.
  Изоляция session и поздние callbacks остаются предметом S1/S2.
- **Настройки:** `useSettingsDraft` выполняет операции последовательно,
  сохраняет неуспешный ввод и перечитывает baseline; подтверждённый write
  с ошибкой последующего GET повторяет только чтение. Копия данных в RHF
  и baseline здесь нужна для редактирования и не признана дублирующим cache.
- **Checkout:** адрес хранится по ID и выводится из актуального списка;
  выбор delivery согласуется с доступными ACTIVE transfers. Доставка читается
  по одному товару на продавца, а не по каждому товару корзины. При имеющемся
  API такая группировка не является устранимым N+1-дефектом.
- **Обогащение списков изображениями:** `attachImages` дедуплицирует ID и
  выполняет один metadata request на список, без N отдельных thumbnail calls.
  Последовательность «получить DTO → прочитать его image IDs» сама по себе
  закономерна. Зависимость всего user query от аватара выделена в S11.
- **Чтение binary proofs:** `getImages` читает несколько ID отдельно,
  сохраняя соответствие порядку. `ImageResponse` не содержит ID, поэтому
  замена на произвольный batch с предположением о порядке не рекомендуется
  без подтверждённого контракта. OrderPaymentProof проверяет contentType,
  base64 и обрабатывает loading/error/empty.
- **Invalidation заказов/отзывов:** большинство действий заказа перечитывает
  оба списка; checkout — корзину и покупки; отзыв — detail/list товаров
  и customer orders. Отсутствие invalidation в чистом review API не является
  дефектом: её выполняет потребляющий сценарий.
- **Ошибка vs empty:** accounts/social-network/transfer нормализуют только
  документированные 404 с соответствующим доменным code. Другие ошибки
  сохраняются. Каталог, заказы, настройки и favorites page имеют основные
  загрузочные, ошибочные и пустые состояния; ошибки action отдельно покрыты S8.
- **HTTP статусы:** подтверждены обработка 401 refresh, 403 WAITING_VERIFY,
  доменных 404; fixtures упражняют 409, 422 и 500. Общая нормализация сохраняет
  status/code и fallback messages. Наличие fallback для статуса не считалось
  доказательством, что каждый endpoint реально его возвращает.
- **DTO/nullable fields:** доменные типы и enrichment находятся в entities;
  поддерживаются `count: null`, nullable image IDs, отсутствие image metadata,
  explicit error при пустом orderData. Массовый DTO → frontend model mapping
  ради переименования полей не обоснован. Несоответствие shape infinite cache
  рассмотрено отдельно в S12.

## 5. Проверки и ограничения доказательств

Статический анализ дополнен локальными Node-проверками через
`typescript.transpileModule` и `vm`: исполнялись текущие TS-функции,
React hooks подменялись получением их options/callbacks, API — контролируемыми
stubs; QueryClient/MutationCache/QueryObserver и Axios были настоящими
установленными библиотеками. Внешние запросы и production mutations не выполнялись.

| Проверка | Наблюдаемый результат |
| --- | --- |
| Concurrent refresh → logout → поздний ответ | Auth восстановился, токены A снова сохранены, два refresh-вызова |
| Refresh waiter timeout → поздний success | Caller получил REFRESH_TIMEOUT, но POST повторно отправлен adapter |
| Retry с API URL `/proxy` | Второй URL: `/proxy/proxy/participant` |
| Создание с потерей ответа после условной записи | UI-result: 0 success, error и retry-eligible |
| Concurrent favorite removals → поздний rollback | Вместо подтверждённого `[A]` получено `[A,B]`, cache не invalidated |
| PUT товара успешен, cleanup неуспешен | Mutation status error, detail cache не invalidated |
| Delete mutation → состояние catalog cache | `isInvalidated: false` |
| Infinite product cache → optimistic favorite add | Товар найденной страницы в избранное не добавлен |
| Profile 200 → avatar metadata error | getUser и getProfileUser завершились rejected |
| Искусственный refresh header → API logger | Header присутствовал в объекте Original, переданном logger |
| Unsubscribe product query без signal | Ненужная загрузка завершилась с query status success |

Это проверки frontend-поведений и моделируемых сетевых условий, а не
browser E2E и не проверка реального backend. Существующие session-lifecycle,
admin-session-model, product-search-session, cart quantity, settings,
checkout и order tests просмотрены в релевантной части; наличие тестов не
принималось за доказательство отсутствия race conditions.

Production build, полный lint/typecheck/architecture suite, HTTP smoke
и Playwright не запускались: изменён только этот Markdown-отчёт; для найденных
проблем достаточно исходного кода и целевых воспроизведений без сборки.
Зависимости, тесты, конфигурация и production-код не изменялись.

## 6. Рекомендуемый порядок исправления и документация

1. S1–S3: единое поколение сессии, refresh coordinator, очистка приватного
   кэша и отмена записей refresh-очереди. Проверить смену аккаунта и поздние
   responses, а не только успешные конкурентные 401.
2. S4: неизвестный результат checkout write и запрет слепого retry.
3. S5–S8: согласованность optimistic updates/invalidation, частичный успех
   сохранения и видимые ошибки действий.
4. S9–S11: безопасные логи, идемпотентный URL interceptor и независимый аватар.
5. S12–S13: корректный InfiniteData lookup и transport cancellation.

Документация обновлена добавлением `docs/frontend-audit/02-server-state.md`.
`AGENTS.md`, `docs/architecture.md`, `docs/testing.md` и `docs/api-and-auth.md`
не изменялись: аудит не меняет текущую реализацию, правила, контракты или
workflow. Рекомендации выше являются предлагаемыми исправлениями, а не
описанием уже внедрённого поведения.
