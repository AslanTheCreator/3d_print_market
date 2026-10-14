# Контракты обращений и розыгрышей: этапы 1–3

Источники: [backend-требования](./backend-plan/plan_2_formatted.md) и
`GET http://localhost:8081/v3/api-docs`, прочитанный 14.10.2026
(`info.title=Your API`, `info.version=1.0`). Проверена схема, без изменяющих
запросов и без проверки серверных переходов или полномочий.

Этап 1 добавляет модели и минимальную поддержку новых enum в существующем UI.
Этап 2 подключает пользовательский POST /order/{orderId}/CANCELLED и разделяет
пользовательскую и временную административную политику отмены. Контракт этих
двух endpoints повторно проверен по OpenAPI 14.10.2026; матрицы ADMIN в нём нет.
API обращений, их формы, новые маршруты и розыгрыши пока не подключены.
Этап 3 подключает защищённое чтение изображений заказа и ORDER-upload с entityId,
исключает DELETE ORDER и отделяет локальный выбор чека от отправки.
Порядок дальнейшей реализации и вопросы B1–B4/N1–N2 находятся в
[плане интеграции](./plans/backend-integration.md#backend-questions).

## Подтверждено OpenAPI

`OrderStatus` включает `CANCELLED`; `FAILED` остаётся отдельным значением.
`ProductAvailabilityType`: `PURCHASABLE`, `PREORDER`, `EXTERNAL_PRODUCT`, `GIVEAWAY`.
`ProductStatus`: `ACTIVE`, `AWAITING_GIVEAWAY`, `TIME_EXPIRED`, `BLOCKED`, `DELETED`.

В перечисленных ниже новых object-схемах нет `required`. Поэтому новые DTO
не требуют заполнения всех полей, включая вложенный `product`, связи и
`orderCase`. Ответы дополнительно допускают `null` как защитную политику чтения:
OpenAPI не уточняет nullable, и эта терпимость не утверждает серверную гарантию.
Отсутствие поля не преобразуется в пустой массив, ноль или `false`.
Существующие DTO и обязательность полей seller-формы не ослаблены.

### Обращения (`entities/order`)

| Схема | Поля и wire-типы (все optional) |
|---|---|
| `OrderCase` | `id`, `version`, `orderId`, `openedBy`, `resolvedBy`: integer int64; `kind`: string; `state`: `OPEN / RESOLVED`; `openingComment`, `telegramUrl`, `resolutionComment`: string; `previousOrderStatus`: OrderStatus; `outcome`: `BUYER / SELLER / CANCELLED / REJECTED / LEGACY`; `createdAt`, `resolvedAt`: date-time |
| `OrderCaseDetail` | `orderCase`: OrderCase; `orderStatus`: OrderStatus; `buyerId`, `sellerId`, `productId`, `paymentProofImageId`: integer int64; `count`: integer int32; `totalPrice`, `prepaymentAmount`: number float; `orderImages`, `caseImages`: integer int64[] |
| `OrderCaseSummary` | `caseId`, `orderId`, `openedBy`: integer int64; `kind`: string; `state`: `OPEN / RESOLVED`; `openingComment`: string; `createdAt`: date-time; `orderStatus`: OrderStatus |

В деталях нет валюты, логинов участников и признака назначения каждого файла.
`paymentProofImageId`, `orderImages` и `caseImages` сохраняются раздельно.

| Запрос | Подтверждённая структура |
|---|---|
| `GET /order/{orderId}/cases` | OrderCaseDetail[] |
| `GET /admin/actions/order-cases` | OrderCaseSummary[]; query `state` (default OPEN), `limit` (default 50), `offset` (default 0) |
| `GET /admin/actions/order-cases/{caseId}` | OrderCaseDetail |
| `POST /order/{orderId}/cancellation-request` | Обязательный query `comment`; без `imageIds` |
| `POST /order/orders/{orderId}/DISPUTED` | Обязательный query `comment`, optional query `imageIds`: integer int64[] |
| `POST /order/{orderId}/payment-appeal` | Обязательный query `comment`, optional query `imageIds`: integer int64[] |
| `PUT /admin/actions/order-cases/{caseId}/telegram-url` | Обязательный query `url` |
| `POST /admin/actions/order-cases/{caseId}/resolve` | Обязательные query `outcome`, `comment`; caseId передаётся в path, не в body |
| `POST /order/{orderId}/CANCELLED` | JSON CloseOrderRequest: `closureReason`, `comment`; orderId только в path |

В OpenAPI параметр `resolve.outcome` включает `LEGACY`. Документ требований
явно запрещает новое решение с ним: `OrderCaseOutcome` допускает чтение
`LEGACY`, а `OrderCaseResolutionOutcome` и `ResolveOrderCaseRequest` исключают его.
`kind` в схеме — произвольная строка; закрытый frontend union
`CANCELLATION_REQUEST | DISPUTE | PAYMENT_APPEAL` взят из backend-документа.

### Розыгрыши (`entities/product`)

| Схема | Поля и wire-типы (все optional) |
|---|---|
| `GiveawaySettingsRequest` | `enabled`: boolean; `telegramUrl`, `rules`, `homeText`: string; `startAt`, `endAt`: date-time; `winnersCount`: integer int32 |
| `GiveawayResponse` | `productId`: integer int64; `name`, `description`, `telegramUrl`, `rules`, `homeText`: string; `imageIds`: integer int64[]; `startAt`, `endAt`: date-time; `winnersCount`: integer int32; `status`: ProductStatus |
| `AdminGiveawayProductResponse` | `product`: raw Product; `imageIds`: integer int64[]; `categories`: CategoryDto[] с `id`, `name` (без обязательного дерева `childs`) |

Raw Product содержит существующие товарные поля, `used` и
`giveawayEnabled`, `giveawayTelegramUrl`, `giveawayStartAt`, `giveawayEndAt`,
`giveawayWinnersCount`, `giveawayRules`, `giveawayHomeText`. Последние имеют
соответственно boolean, string, date-time, date-time, integer int32, string,
string. `giveawayEnabled` не выводится из `status`.

| Запрос | Подтверждённая структура |
|---|---|
| `GET /giveaways/active`, `GET /giveaways/products/{productId}` | GiveawayResponse |
| `GET /admin/actions/giveaways/history` | Product[]; query `page` (default 0), `size` (default 50) |
| `GET /admin/actions/giveaways/{productId}` | AdminGiveawayProductResponse |
| `PUT /admin/actions/giveaways/{productId}` | JSON GiveawaySettingsRequest непосредственно, без `{ giveaway: ... }` |
| `POST /products`, `PUT /admin/actions/agents/{agentId}/products/{productId}` | JSON CreateOrUpdateProductRequest: `name`, `description`, `price`, `prepaymentAmount`, `categoryIds`, `count`, `currency`, `originality`, `availability`, `used`, `externalUrl`, `giveaway`, `imageIds`; `giveaway` ссылается на GiveawaySettingsRequest |

`AdminGiveawayProductRequest` — отдельный структурный вариант последней схемы
с `availability=GIVEAWAY`. Остальные поля optional согласно OpenAPI: это не
утверждение о минимальном валидном запросе (B3). Он пока не подключён к записи.
`ProductCreateModel` и `EditableAvailability` допускают только
`PURCHASABLE | PREORDER`; runtime seller mapper отклоняет также `GIVEAWAY`.
Действующий `AdminProductInput` и mapper по-прежнему формируют EXTERNAL_PRODUCT;
переключение административного редактора относится к этапу 11.

OpenAPI включает техническое значение валюты `CREATE` в raw Product и
CreateOrUpdateProductRequest. Оно сохранено только в новых административных
wire-моделях розыгрыша; общий `Currency` и варианты seller-форм не расширены.
Назначение `CREATE` и влияние поля `used` backend-документ не объясняет:
новая бизнес-логика для них не добавлена.

## Только backend-документ: бизнес-правила

Эти ограничения не следуют из `required`, enum или validators OpenAPI.
Реализованные правила отмены этапа 2 описаны в
[api-and-auth.md](./api-and-auth.md#отмена-заказа-этап-2); остальные правила
ниже остаются требованиями последующих этапов, кроме уже реализованной работы
с ORDER-изображениями этапа 3:

- Прямая пользовательская отмена только из BOOKED; используется `comment`.
  FAILED — итог спора покупателю. Для DISPUTED обычные действия блокируются;
  подтверждение оплаты из прежнего AWAITING_PAYMENT дополняет спор без выхода
  из DISPUTED. Старое пользовательское завершение спора в текущем src отсутствует.
- Одновременно одно открытое обращение; обязательный содержательный комментарий.
  Спор требует заявленной оплаты и подтверждения; payment appeal доступен
  только покупателю отменённого заказа. Точная матрица первого обращения — B1/B2.
  Доказательства сначала загружаются через `POST /images?tag=ORDER&entityId={orderId}`;
  полученные ID передаются как imageIds. После создания или решения перечитываются
  заказ и обращения.
- Решения cancellation request: CANCELLED/REJECTED; dispute: BUYER либо SELLER
  только при previousOrderStatus=ON_THE_WAY; payment appeal: BUYER/SELLER,
  оба возвращают заказ в CANCELLED. LEGACY предназначен только для чтения.
- Для очереди обращений limit от 1 до 100. Ссылки обсуждения — HTTPS t.me или
  telegram.me. Возврат средств проводится вручную; API возврата нет.
- ORDER-изображения читаются авторизованно, metadata их не возвращает,
  удаление загруженных ORDER-файлов запрещено. Реализация этапа 3 описана в
  [api-and-auth.md](./api-and-auth.md#изображения-заказа-этап-3).
- Розыгрыш создаёт ADMIN; обычный `/product/{id}` не возвращает GIVEAWAY.
  `/giveaways/active` может вернуть ближайший запланированный розыгрыш;
  отсутствие, отключение или окончание дают 404. API участия и выбора победителя нет.
  Данные перечитываются при открытии и на границах startAt/endAt, без частого polling.
- Даты с timezone, startAt < endAt, положительное число победителей, заполненные
  тексты и Telegram URL проверяются в последующих этапах. Включённые периоды
  не пересекаются; повторное включение требует будущего endAt.

## Контракт images, повторная сверка 14.10.2026

OpenAPI подтверждает `GET /images` с required query `ids`: integer int64[];
Authorization помечен optional для общего endpoint. Для ORDER обязательную
авторизацию требует backend-документ. Ответ ImageResponse содержит только
`fileName`, `contentType`, `imageData` (byte), без идентификатора.
`POST /images` требует Authorization, query tag и multipart `files` (binary[]);
query entityId имеет тип integer int64 и помечен optional для общего endpoint.
Для ORDER связь с заказом обязательна по backend-документу, поэтому отдельный
frontend API требует orderId. DELETE-схема всё ещё перечисляет ORDER среди tag,
но документ явно запрещает такое удаление: frontend исключает его из типов
и отклоняет попытку до запроса. Успешных изменяющих запросов на реальный backend
при этой сверке не выполнялось.

## Неподтверждённые данные

B1–B4 остаются открытыми: матрица открытия обращений, подтверждение оплаты до
первого обращения, минимальный товарный payload GIVEAWAY и административная
матрица CANCEL. OpenAPI их не уточняет. Для ADMIN сохранена только прежняя
frontend-политика, явно отмеченная как временная до B4; окончательная матрица
и её acceptance пока не подтверждены.
Контракт ошибок новых операций (N1) и валюта деталей обращения (N2) отсутствуют.
Эти вопросы не блокируют типовую основу этапа 1.
