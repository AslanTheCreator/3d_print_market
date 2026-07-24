# Backend: production-согласования

Документ не является подтверждённым API-контрактом. Он фиксирует текущую зависимость frontend и решения, которые нужно согласовать с backend до production.

## Текущая реализация

Источник истины — API-модули в `src/shared/api` и `src/entities/*/api`.

Auth сейчас использует bearer tokens:

- **`POST /participant`** — `{ mail, password, age }`, в ответе ID пользователя.
- **`POST /auth/login`** — access и refresh tokens.
- **`POST /auth/verification/resend`** — ID пользователя; cooldown обрабатывается по `429`.
- **`POST /auth/verify-code`** — access и refresh tokens.
- **`POST /auth/refresh`** — refresh token в `X-Refresh-Token`, новый access token в ответе.
- **`POST /auth/password/reset`** — email в query params.

Контракт корзины backend v1.28:

- **`POST /basket/find`** — каждая `ProductBasketDto` содержит `availableCount: number | null` и `enoughStock: boolean`.
- **`PUT /basket`** — успешный ответ `200` без body; после него frontend повторяет `POST /basket/find`.

`availableCount` — текущий доступный остаток; `null` означает отсутствие ограниченного остатка. `enoughStock` — серверное решение о достаточности остатка для текущего количества в корзине и имеет приоритет над вычислениями frontend.

Zustand хранит оптимистичное количество для мгновенной синхронизации UI, но подтверждённые количество и остаток берутся из повторного ответа backend. Frontend не уменьшает количество автоматически: при ошибке изменения выполняет rollback, а при ошибке контрольного запроса требует retry. Недостаточный остаток, ожидающее подтверждения количество или непроверенные данные блокируют checkout только для выбранных позиций.

Контракт товаров backend v1.29:

- **`POST /products/find`, `POST /products/my`** — каждый `ProductDto` содержит `externalUrl: string`; для обычного товара допустима пустая строка.
- **`FindProductRequest`, `FindMyProductRequest`** — поле `imageId` отсутствует и frontend его не отправляет.
- **Добавление в корзину или заказ `EXTERNAL_ONLY`** — backend отклоняет операцию с кодом `PRODUCT_NOT_PURCHASABLE`.

`availability: EXTERNAL_ONLY` означает покупку вне marketplace. Frontend не добавляет такой товар в корзину и не включает его в создание заказа, а валидный абсолютный HTTP/HTTPS `externalUrl` открывает только после подтверждения пользователя. Нулевые и истёкшие товары исключает из публичного каталога backend; в `POST /products/my` товар с нулевым остатком ожидаем и отображается продавцу.

Frontend рассматривает `EXTERNAL_ONLY` как read-only тип внешнего источника. Create/update model допускает только `PURCHASABLE` и `PREORDER`; edit, delete и extend для внешнего товара в UI недоступны. Это не заменяет backend authorization и проверку происхождения записи.

Checkout вызывает `POST /order/BOOKED` отдельно для каждой позиции и ожидает массив ID заказов. `Idempotency-Key` пока не отправляется.

## Обязательные согласования

### Auth

Целевое production-решение — HttpOnly cookies, но оно внедряется только после подтверждения backend.

Нужно согласовать:

- login, verify, refresh и logout;
- cookie names, scope, `Secure` и `SameSite`;
- CSRF-защиту;
- CORS и credentials для local/test/production;
- способ server-side проверки сессии для protected routes;
- миграционное окно для bearer-схемы.

После готовности backend frontend должен убрать JS-readable tokens, `Authorization` interceptor и `X-Refresh-Token`, включить credentials и добавить server logout.

Также требуется согласовать:

- `PUT /participant/password` с паролями в JSON body, а не в query string;
- password reset без account enumeration: единый публичный ответ, rate limit, single-use, expiry и отзыв активных сессий;
- централизованный session teardown для явного logout, refresh failure и server-side invalidation;
- TTL access token через подтверждённый `exp`/`expires_in`, а не разные frontend constants;
- redaction password, tokens, cookies и authorization headers в proxy/backend logs.

### Checkout

Backend должен гарантировать идемпотентность создания заказа. Краткое предложение: [backend-checkout-idempotency.md](./backend-checkout-idempotency.md).

Отдельно нужно согласовать:

- остаётся ли запрос по одной позиции или вводится атомарная группа продавца;
- как доставка применяется к группе;
- формат частичного успеха;
- стабильные business error codes;
- запрет покупки собственного товара на стороне backend.

Frontend-проверка собственного товара остаётся только UX-защитой и не заменяет серверную проверку.

Комментарии заказа, tracking/delivery URL и другие пользовательские значения сейчас передаются частью endpoints через query params. Целевой контракт должен переносить чувствительные и длинные значения в JSON body и ограничивать их размер/формат.

### Согласие при регистрации

Frontend требует checkbox согласия, но текущий `POST /participant` не передаёт версию документа и время принятия. Поля и хранение факта согласия должны быть отдельно согласованы; до этого payload не расширяется.

### Статусы заказов

Frontend вызывает status endpoints из `src/entities/order/api/orderApi.ts`. Backend должен проверять роль и допустимость перехода и возвращать стабильные ошибки для запрещённого действия, конфликта состояния и отсутствующего заказа.

### Изображения

`GET /images?ids=...` не позволяет надёжно сопоставить batch-ответ, если элементы не содержат ID и порядок не гарантирован. Сейчас frontend запрашивает несколько изображений по одному.

Для безопасного batch frontend нужен один подтверждённый вариант:

- порядок ответа совпадает с порядком `ids`; или
- каждый элемент ответа содержит ID изображения.

Изображения с tag `ORDER` являются подтверждениями оплаты и не могут использовать общий публичный read contract. Нужно подтвердить:

- object-level authorization: читать может только допустимый участник конкретного заказа;
- private bucket/object ACL либо короткоживущий signed access;
- отсутствие доступа перебором image ID;
- server-side проверку content type, сигнатуры, размера и безопасного декодирования;
- удаление orphan uploads и retention policy.

Frontend upload выполняется через `authClient`, но чтение сейчас использует общий `publicClient`; миграция read path обязательна после готовности контракта.

### Платёжные реквизиты

Frontend получает `entityValue` продавца по `participantId`. До production backend должен выбрать и подтвердить один вариант:

- реквизиты доступны только стороне конкретного заказа через order-scoped endpoint; или
- отдельно определённый набор реквизитов является публичным, а чувствительные поля никогда не входят в него.

Одна проверка авторизации без object-level связи пользователя, заказа и продавца недостаточна.

### Adult content

Backend и frontend должны использовать один подтверждённый признак adult category/product. Требуется определить:

- публичные list/search/seller/related responses исключают adult products по умолчанию;
- `includeAdult` принимается только от подходящей авторизованной сессии;
- detail endpoint возвращает достаточно данных для единообразного gate и не раскрывает media до подтверждения;
- sitemap/feed endpoints не включают adult products, если они не должны индексироваться;
- правила применяются также к favorites и старым позициям cart.

Сейчас frontend gate существует только в category flow, поэтому одним backend-фильтром category list проблема direct detail не закрывается.

### Внешняя покупка

`externalUrl` сейчас считается допустимым для любого абсолютного HTTP/HTTPS URL, хотя UI называет переход Telegram. Нужно согласовать либо allowlist допустимых Telegram-hosts, либо нейтральную модель внешней ссылки с отображением hostname и правилами модерации.

### Управление товарами внешнего источника

Публичные frontend endpoints не должны управлять товарами, которые поступают из доверенного import/sync-контура. Backend должен:

- отклонять создание товара с `availability: EXTERNAL_ONLY`;
- запрещать преобразование обычного товара в `EXTERNAL_ONLY` через публичный create/update contract;
- отклонять update существующего внешнего товара независимо от `availability` в новом payload;
- отклонять delete и extend внешнего товара;
- принимать изменения таких записей только из доверенного import/sync-контура;
- возвращать согласованный стабильный business error без раскрытия внутренних данных интеграции.

Update-проверка должна использовать сохранённое происхождение товара. Одной проверки входящего `availability` недостаточно: клиент способен подставить `PURCHASABLE` и попытаться обойти ограничение. Если `availability` не является надёжным неизменяемым признаком происхождения, backend должен хранить отдельный server-controlled признак; его точное имя и формат требуют согласования.

### Ошибки и rate limits

Backend должен согласовать единый формат business errors и cooldown для чувствительных auth/order операций. Frontend не добавляет новые коды и статусы до подтверждения.

## Готовность к frontend-миграции

Миграция начинается, когда на test/staging подтверждены:

- auth cookies, refresh, logout, CSRF и CORS;
- server-side session check;
- идемпотентное создание заказа без дублей при retry и параллельных запросах;
- серверный запрет покупки собственного товара;
- серверный запрет create/update/delete/extend для товаров внешнего источника;
- согласованные error codes и response shapes.
