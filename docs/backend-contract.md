# Backend: production-согласования

Документ не является подтверждённым API-контрактом. Он фиксирует текущую зависимость frontend и решения, которые нужно согласовать с backend до production.

## Текущая реализация

Источник истины — API-модули в `src/shared/api` и `src/entities/*/api`.

Auth сейчас использует bearer tokens:

| Запрос | Ожидание frontend |
| --- | --- |
| `POST /participant` | `{ mail, password, age }`, в ответе ID пользователя |
| `POST /auth/login` | access и refresh tokens |
| `POST /auth/verification/resend` | ID пользователя; cooldown обрабатывается по `429` |
| `POST /auth/verify-code` | access и refresh tokens |
| `POST /auth/refresh` | refresh token в `X-Refresh-Token`, новый access token в ответе |
| `POST /auth/password/reset` | email в query params |

Контракт корзины backend v1.28:

| Запрос | Ожидание frontend |
| --- | --- |
| `POST /basket/find` | каждая `ProductBasketDto` содержит `availableCount: number \| null` и `enoughStock: boolean` |
| `PUT /basket` | успешный ответ `200` без body; после него frontend повторяет `POST /basket/find` |

`availableCount` — текущий доступный остаток; `null` означает отсутствие ограниченного остатка. `enoughStock` — серверное решение о достаточности остатка для текущего количества в корзине и имеет приоритет над вычислениями frontend.

Zustand хранит оптимистичное количество для мгновенной синхронизации UI, но подтверждённые количество и остаток берутся из повторного ответа backend. Frontend не уменьшает количество автоматически: при ошибке изменения выполняет rollback, а при ошибке контрольного запроса требует retry. Недостаточный остаток, ожидающее подтверждения количество или непроверенные данные блокируют checkout только для выбранных позиций.

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

### Checkout

Backend должен гарантировать идемпотентность создания заказа. Краткое предложение: [backend-checkout-idempotency.md](./backend-checkout-idempotency.md).

Отдельно нужно согласовать:

- остаётся ли запрос по одной позиции или вводится атомарная группа продавца;
- как доставка применяется к группе;
- формат частичного успеха;
- стабильные business error codes;
- запрет покупки собственного товара на стороне backend.

Frontend-проверка собственного товара остаётся только UX-защитой и не заменяет серверную проверку.

### Согласие при регистрации

Frontend требует checkbox согласия, но текущий `POST /participant` не передаёт версию документа и время принятия. Поля и хранение факта согласия должны быть отдельно согласованы; до этого payload не расширяется.

### Статусы заказов

Frontend вызывает status endpoints из `src/entities/order/api/orderApi.ts`. Backend должен проверять роль и допустимость перехода и возвращать стабильные ошибки для запрещённого действия, конфликта состояния и отсутствующего заказа.

### Изображения

`GET /images?ids=...` не позволяет надёжно сопоставить batch-ответ, если элементы не содержат ID и порядок не гарантирован. Сейчас frontend запрашивает несколько изображений по одному.

Для безопасного batch frontend нужен один подтверждённый вариант:

- порядок ответа совпадает с порядком `ids`; или
- каждый элемент ответа содержит ID изображения.

### Ошибки и rate limits

Backend должен согласовать единый формат business errors и cooldown для чувствительных auth/order операций. Frontend не добавляет новые коды и статусы до подтверждения.

## Готовность к frontend-миграции

Миграция начинается, когда на test/staging подтверждены:

- auth cookies, refresh, logout, CSRF и CORS;
- server-side session check;
- идемпотентное создание заказа без дублей при retry и параллельных запросах;
- серверный запрет покупки собственного товара;
- согласованные error codes и response shapes.
