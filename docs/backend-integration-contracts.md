# Контракты обращений и розыгрышей: этапы 1–11

22.10.2026 выполнены реальные DEV API/browser-проверки на v1.36. Их результаты,
object-level доступ ORDER, серверные переходы/коды и CORS/logging-ограничения
перечислены в [отчёте этапа 12](./backend-plan/stage12-results.md).
CORS refresh и приватное HTTP-логирование отложены и переданы на сторону backend
решением владельца проекта: frontend-работы завершены, FAIL/BLOCKED сохранены,
заключительный VP выявил два P2; адресная проверка исправлений ожидается.
Повтор real-harness без interception: 36 PASS / 1 FAIL; исторические browser
PASS до P2-2 не подтверждали preflight. Подробнее — раздел 8 отчёта.
Диагностика 27.10.2026 подтвердила
BACKEND CORS BUG v1.36 на штатной цепочке frontend: 401 → OPTIONS refresh 403 →
завершение сессии. Контракт X-Refresh-Token не меняется. Два открытых требования
серверной приёмки и проверка после исправлений — в
[BACKEND_REQUIRED_FIXES.md](./backend-plan/BACKEND_REQUIRED_FIXES.md).
Ниже сохранены датированные источники контрактов этапов 1–11.

Источники: [backend-требования](./backend-plan/plan_2_formatted.md), окончательные
[ответы backend B1–B4/N1–N2](./backend-plan/FRONTEND_BACKEND_ANSWERS.md)
для master на 15.10.2026 и `GET http://localhost:8081/v3/api-docs`, прочитанный 15.10.2026
(`info.title=Your API`, `info.version=1.0`). Проверена схема, без изменяющих
запросов и без проверки серверных переходов или полномочий.

16.10.2026 повторно прочитаны параметры трёх POST создания обращений из работающей
OpenAPI: пути, обязательный query comment, необязательные imageIds для DISPUTE /
PAYMENT_APPEAL и отсутствие requestBody совпадают с таблицей ниже.
Также прочитан POST `/order/{orderId}/ASSEMBLING`: обязательные Authorization
и orderId, необязательные query imageId/comment, ответ integer int64, без body.
Правило добавления подтверждения к OPEN DISPUTE из AWAITING_PAYMENT с сохранением
DISPUTED взято из backend-требований. Реальные операции не выполнялись.
Для этапа 7 повторно сверены оба административных GET, PUT telegram-url и POST
resolve: параметры совпадают с таблицей ниже, version не передаётся. GET возвращают
summary[]/detail, PUT — integer int64; у resolve подтверждены ошибки 400/409,
success body для управления UI не используется. Реальных изменений не выполнялось.

Этап 1 добавляет модели и минимальную поддержку новых enum в существующем UI.
Этап 2 подключает пользовательский POST /order/{orderId}/CANCELLED и разделяет
пользовательскую и административную политику отмены. B4 подтверждает для ADMIN
только BOOKED → CANCELLED; отдельный endpoint сохранён. OpenAPI подтверждает
его параметры, бизнес-матрица взята из окончательного ответа backend.
Этап 4 подключает чтение истории обращений в деталях заказа; этап 5 — три
пользовательские формы создания по B1/B2 и обработку N1. Этап 7 подключает очередь,
Telegram и решения ADMIN на `/admin/order-cases`; этап 8 подключает только публичные
GET розыгрышей. Этап 9 подключает ADMIN history/detail/settings PUT; этап 10 —
создание собственного розыгрыша через POST /products. Этап 11 подключает преобразование
и повторное редактирование товара бота через существующий административный PUT.
Этап 6 добавляет подтверждение оплаты в открытый
спор через существующий ASSEMBLING POST; lifecycle и recovery описаны в
[api-and-auth.md](./api-and-auth.md#подтверждение-оплаты-в-споре-этап-6).
20.10.2026 повторно прочитаны оба `/giveaways` GET и GiveawayResponse работающей
OpenAPI: пути, productId int64, status и поля совпадают с таблицей ниже.
Правила 404, дат и статусов взяты из backend-требований и B3; реальные розыгрыши
не создавались и не изменялись. Публичный lifecycle описан в
[api-and-auth.md](./api-and-auth.md#публичные-розыгрыши-этап-8).
Для этапа 9 20.10.2026 повторно прочитаны ADMIN history/detail/PUT и
GiveawaySettingsRequest работающей OpenAPI: page=0/size=50, массив Product,
wrapper деталей и непосредственное тело PUT совпадают с таблицей ниже.
Реальных записей не выполнялось; validation/N1 взяты из подтверждённых требований.
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
| `OrderCaseDetail` | `orderCase`: OrderCase; `orderStatus`: OrderStatus; `buyerId`, `sellerId`, `productId`, `paymentProofImageId`: integer int64; `count`: integer int32; `totalPrice`, `prepaymentAmount`: number float; `currency`: Currency; `orderImages`, `caseImages`: integer int64[] |
| `OrderCaseSummary` | `caseId`, `orderId`, `openedBy`: integer int64; `kind`: string; `state`: `OPEN / RESOLVED`; `openingComment`: string; `createdAt`: date-time; `orderStatus`: OrderStatus |

В актуальной схеме `currency` — enum `USD/EUR/GBP/JPY/CNY/RUB/CREATE`;
по N2 это валюта товара на момент заказа (`productCurrency`), а не текущего товара.
Логинов участников и признака назначения каждого файла в деталях нет.
`paymentProofImageId`, `orderImages` и `caseImages` сохраняются раздельно.
В `FindOrderResponse` добавлено `paymentProofImageId`: integer int64, с описанием
null до заявления оплаты; поле есть в списках обеих пользовательских ролей и ADMIN.
Оба поля подключены в читаемых frontend DTO на этапе 4, optional/null для старых
ответов. Признака OPEN в списке нет, нужен `/cases`.

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
утверждение о минимальном валидном запросе; правила B3 ниже подтверждены отдельно.
Он подключён к POST /products только административной формой этапа 10.
`ProductCreateModel` и `EditableAvailability` допускают только
`PURCHASABLE | PREORDER`; runtime seller mapper отклоняет также `GIVEAWAY`.
`AdminProductInput` явно различает EXTERNAL_PRODUCT и GIVEAWAY с вложенными настройками.
Обычная seller-модель не расширена. Связи преобразованного товара читаются из полного
AdminGiveawayProductResponse, а не публичного /product/{id}.

20.10.2026 повторно проверены OpenAPI PUT /admin/actions/agents/{agentId}/products/{productId},
CreateOrUpdateProductRequest и AdminGiveawayProductResponse: существующий endpoint,
вложенный GiveawaySettingsRequest и N1 GIVEAWAY_WINDOW_OVERLAP. Success body по-прежнему
не используется. Реальные записи backend не выполнялись; контракт не изменялся.

OpenAPI включает техническое значение валюты `CREATE` в raw Product и
CreateOrUpdateProductRequest. Оно сохранено только в новых административных
wire-моделях розыгрыша; общий `Currency` и варианты seller-форм не расширены.
Назначение `CREATE` и влияние поля `used` backend-документ не объясняет:
новая бизнес-логика для них не добавлена.

## Только backend-документ: бизнес-правила

Эти ограничения не следуют из `required`, enum или validators OpenAPI.
Реализованные правила отмены этапа 2 описаны в
[api-and-auth.md](./api-and-auth.md#отмена-заказа-этап-2); остальные правила
ниже остаются требованиями последующих этапов, кроме работы с ORDER-изображениями
этапа 3, создания обращений этапа 5, подтверждения оплаты в споре этапа 6
и административного рассмотрения этапа 7, публичных розыгрышей этапа 8:

- Прямая пользовательская отмена только из BOOKED; используется `comment`.
  FAILED — итог спора покупателю. Для DISPUTED обычные действия блокируются;
  подтверждение оплаты из прежнего AWAITING_PAYMENT дополняет спор без выхода
  из DISPUTED. Старое пользовательское завершение спора в текущем src отсутствует.
- Одновременно одно открытое обращение; обязательный содержательный комментарий.
  Спор требует заявленной оплаты и подтверждения; payment appeal доступен
  только покупателю отменённого заказа. Подтверждённая матрица B1/B2 приведена ниже.
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
- В форме настроек этапа 9 проверяются даты с timezone, startAt < endAt,
  положительное число победителей, заполненные тексты и Telegram URL. Включённые периоды
  не пересекаются; повторное включение требует будущего endAt.

## Контракт images, повторная сверка 15.10.2026

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

## Окончательные ответы B1–B4 и N1–N2 (15.10.2026)

Все шесть вопросов документально закрыты указанным выше ответом backend.
Это снимает контрактные блокировки; чтение истории этапа 4 и создание обращений
этапа 5, подтверждение оплаты в споре этапа 6, рассмотрение ADMIN этапа 7 и публичные
розыгрыши этапа 8 подключены. Административные функции этапов 9–11 пока не реализованы.

### B1/B2: обращения и подтверждение оплаты

Матрица подключена в пользовательских формах этапа 5. Правила контрольного чтения,
upload/recovery и приватного guard описаны в
[api-and-auth.md](./api-and-auth.md#создание-обращений-этап-5).

Участник может создавать обращения только по своему заказу; одновременно не более
одного OPEN. Непустой comment обязателен. Дополнительно действуют условия:

| Действие | Роль и условия | Результат |
|---|---|---|
| CANCELLATION_REQUEST | Покупатель/продавец; AWAITING_PREPAYMENT без paymentProofImageId, либо AWAITING_PAYMENT без paymentProofImageId и prepaymentAmount null/0 | OPEN, статус заказа сохраняется; imageIds не принимает |
| DISPUTE | Покупатель/продавец; AWAITING_PREPAYMENT_APPROVAL, AWAITING_PAYMENT, ASSEMBLING или ON_THE_WAY и paymentProofImageId != null | OPEN, заказ DISPUTED; imageIds optional |
| PAYMENT_APPEAL | Только покупатель; CANCELLED, нет OPEN, ранее не было PAYMENT_APPEAL даже в RESOLVED | OPEN, заказ DISPUTED; imageIds optional |

`paymentProofImageId=null` означает отсутствие зарегистрированного чека в самом
заказе, но не отсутствие оплаты или доказательств в caseImages после appeal.
В AWAITING_PAYMENT ID может относиться к предоплате и не доказывает полную оплату.
Отсутствующее поле старого ответа не равно null. `images` не заменяет этот ID;
пустой `/cases` не мешает проверить наличие чека по FindOrderResponse.
После действий перечитываются заказ и `/cases`; одно actualStatus не выявляет OPEN.

### B3: создание GIVEAWAY (этап 10)

20.10.2026 повторно прочитаны POST /products и CreateOrUpdateProductRequest работающей
OpenAPI: обязательная Authorization, JSON с вложенным GiveawaySettingsRequest,
400 GIVEAWAY_WINDOW_OVERLAP. Успешный response body не описан и UI не извлекает из него ID.
Правила минимального payload ниже подтверждены B3; реальные записи не выполнялись.

ADMIN создаёт через POST /products с availability=GIVEAWAY и вложенным giveaway;
продавцу приходит 403 ACCESS_DENIED. Продавецкие реквизиты/соцсеть не требуются.

| Поля | Подтверждённое правило |
|---|---|
| price, currency | Можно опустить: сервер установит 0 и RUB |
| count | Можно опустить; сохраняется null. Переданные 0/отрицательное отклоняются до обнуления |
| prepaymentAmount | Не передавать; сохраняется null, переданное значение проходит общую проверку |
| categoryIds, imageIds, externalUrl | Связи optional, допустимы пустые массивы; externalUrl не требуется |
| name, description | Хранение допускает null; заполнить для видимой карточки |
| giveaway.enabled | При создании default true; при true endAt должен быть в будущем |
| telegramUrl | Обязательная HTTPS-ссылка на точный t.me/telegram.me с непустым путём |
| startAt, endAt | Обязательные ISO 8601 с timezone; startAt < endAt |
| winnersCount, rules, homeText | Положительное целое число; обязательные непустые тексты |

Периоды включённых розыгрышей не пересекаются; отключение скрывает выдачу,
но не отменяет проверку корректности настроек. Плановый статус AWAITING_GIVEAWAY,
начавшийся ACTIVE. Минимальный пример — в исходном ответе B3.

### B4: ADMIN CANCEL (реализованная часть этапа 2)

POST /admin/actions/agents/{agentId}/orders/{orderId}/CANCEL?comment=...
доступен только ADMIN для заказа указанного бота и только BOOKED → CANCELLED.
Сервер проверяет принадлежность боту и пишет административную историю.
Покупатель заказа бота сохраняет пользовательский POST /order/{orderId}/CANCELLED
из BOOKED; бот не управляет заказом через этот пользовательский endpoint.
CONFIRM, CONFIRM_PREPAYMENT и SHIP сохраняют прежние отдельные правила.
Frontend перед ADMIN CANCEL перечитывает заказ бота; ошибка чтения, смена
владельца/статуса, заказа или scope не разрешают POST. Итог читается с сервера.

### N1: ошибки новых операций

Коды создания пользовательских обращений обрабатываются на этапе 5.
Административное рассмотрение подключено на этапе 7; настройки розыгрышей — на этапе 9.

Формат ApiErrorResponse: `{ code, message, status, timestamp, details }`.
Классификация по code, message — текст пользователю; HTTP сам по себе недостаточен.
Актуальная OpenAPI также содержит descriptions 400/409 для создания обращений,
resolve и GIVEAWAY_WINDOW_OVERLAP для создания/настроек розыгрыша. Enum поля code
и полный перечень ошибок каждого endpoint в ней не заданы; Telegram описывает
только успешный ответ. Ниже используются окончательные ответы N1 целиком.

| HTTP | code | Ситуация |
|---|---|---|
| 409 | ORDER_CASE_ALREADY_OPEN | Уже есть OPEN; перечитать заказ и /cases |
| 409 | PAYMENT_APPEAL_ALREADY_EXISTS | Ранее был PAYMENT_APPEAL, в том числе завершённый |
| 409 | ORDER_CASE_ALREADY_RESOLVED | Повторное/конкурентное решение или Telegram-ссылка завершённого обращения |
| 400 | ORDER_CASE_INVALID_TRANSITION | Недопустимый статус/наличие чека/состояние, возможен конфликт версии |
| 400 | ORDER_CASE_INVALID_OUTCOME | Недопустимый исход для вида/previousOrderStatus; LEGACY запрещён |
| 400 | GIVEAWAY_WINDOW_OVERLAP | Пересечение включённых периодов; подсветить даты |
| 400 | BAD_REQUEST / INVALID_REQUEST | Пустой comment — BAD_REQUEST; часть общей валидации — INVALID_REQUEST |

Допустимые исходы решения сохраняются из бизнес-правил выше. N2 закрыт полем
currency в OrderCaseDetail; его отсутствие в старом ответе не разрешает угадывать валюту.

## Сверка используемого backend

15.10.2026 после запуска пользователем проверен работающий
`3d_print_market-backend-1`, образ `ready555/model_store:v1.36`, digest
`sha256:d2864829404d893ecd623e539c0b789abf93e688cf767772e780fa4c6a31b3bb`.
OpenAPI доступен, info.version=1.0 — версия схемы API, а не Docker-тег.
FindOrderResponse.paymentProofImageId и OrderCaseDetail.currency присутствуют.
Параметры ADMIN action, пользовательских обращений и giveaway соответствуют
документу. В JAR того же образа дополнительно проверены вызов closureOrder
из ADMIN CANCEL и ограничение BOOKED с результатом CANCELLED. Расхождения
образа с этими уточнениями не обнаружены; связь образа с конкретным Git SHA master
не опубликована в metadata, вся бизнес-логика реальными запросами не проверялась.

OpenAPI по-прежнему не задаёт бизнес-матрицы B1/B3/B4 и полный required/nullable;
описания кодов N1 частичны. У ряда новых POST/PUT указаны только 400/409 без
успешной схемы. Сохраняются широкие enum LEGACY в resolve, ORDER в DELETE images
и optional Authorization общего GET images; ограничения берутся из документов.
Техническое CREATE и назначение used отдельно не разъяснены. Реальных изменяющих
запросов к backend при сверке не выполнялось.
