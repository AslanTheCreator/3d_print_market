# Backend contract для production frontend

Документ описывает, что frontend ожидает от backend для безопасного production-запуска. Текущая frontend-реализация уже работает с bearer-токенами, но целевое production-состояние должно перейти на HttpOnly cookies и идемпотентные операции заказа.

## 1. Окружения и базовый URL

Frontend работает с одним базовым API URL:

- local: `http://localhost:8081`
- test: `http://185.155.17.98:8080/internal-api`
- production: `https://figurzilla.ru/internal-api/v1`

Для production предпочтительно отдавать frontend и API с одного origin через reverse proxy:

- frontend: `https://figurzilla.ru`
- browser API path: `/internal-api/v1`
- internal backend upstream: `http://backend:8081/internal-api/v1`

Backend должен корректно работать за reverse proxy и учитывать заголовки:

- `X-Forwarded-Proto`
- `X-Forwarded-Host`
- `X-Forwarded-Port`

## 2. Формат ошибок

Все JSON-ошибки должны иметь стабильный формат:

```json
{
  "code": "ERROR_CODE",
  "message": "Человекочитаемое сообщение",
  "details": {}
}
```

`details` опционален. `code` обязателен для бизнес-ошибок.

Обязательные HTTP-статусы:

- `400` - неверное тело запроса или параметры.
- `401` - пользователь не авторизован или access session истекла.
- `403` - пользователь авторизован, но действие запрещено.
- `404` - сущность не найдена.
- `409` - конфликт состояния или идемпотентности.
- `422` - бизнес-валидация.
- `429` - rate limit или cooldown.
- `500` - непредвиденная ошибка.

## 3. Auth: целевой production-контракт

### 3.1. Cookies

Backend должен сам устанавливать и удалять auth cookies. Frontend не должен читать access или refresh token через JavaScript.

Требования к cookies:

- `HttpOnly`
- `Secure` в production
- `SameSite=Lax`, если frontend и API на одном site.
- `SameSite=None; Secure`, если frontend и API на разных site.
- `Path=/internal-api/v1` или более узкий API path.

Рекомендуемые cookie names:

- `access_token`
- `refresh_token`

Имена можно изменить, если frontend не должен их читать. Главное - cookies должны автоматически отправляться браузером.

### 3.2. Login

Endpoint:

```http
POST /auth/login
Content-Type: application/json
```

Request:

```json
{
  "mail": "user@example.com",
  "password": "password"
}
```

Success:

- HTTP `200`
- backend устанавливает `access_token` и `refresh_token` HttpOnly cookies.
- response body:

```json
{
  "success": true
}
```

Если email не подтвержден:

- HTTP `403`
- response body:

```json
{
  "code": "WAITING_VERIFY",
  "next": "VERIFY_EMAIL",
  "message": "Необходимо подтвердить email"
}
```

### 3.3. Register

Endpoint:

```http
POST /participant
Content-Type: application/json
```

Request:

```json
{
  "mail": "user@example.com",
  "password": "password"
}
```

Success:

- HTTP `200` или `201`
- response body:

```json
{
  "userId": 123
}
```

Если пользователь уже существует:

- HTTP `409`
- response body:

```json
{
  "code": "PARTICIPANT_ALREADY_EXISTS",
  "message": "Пользователь уже существует"
}
```

Согласие на обработку персональных данных сейчас является временной
frontend-проверкой: регистрационная форма не отправляет запрос, пока
пользователь явно не установит отдельный checkbox. Текущий request не содержит
данные о согласии, поэтому такая проверка не позволяет доказуемо хранить факт
его получения.

Для production backend должен сохранять:

- связь согласия с зарегистрированным пользователем;
- серверное время принятия согласия;
- версию документа, с которой согласился пользователь.

Конкретные поля request и формат хранения должны быть отдельно согласованы с
backend-разработчиком. До согласования frontend не добавляет новые поля в
`POST /participant`.

### 3.4. Verify email code

Endpoint:

```http
POST /auth/verify-code
Content-Type: application/json
```

Request:

```json
{
  "userId": 123,
  "code": "123456"
}
```

Success:

- HTTP `200`
- backend устанавливает `access_token` и `refresh_token` HttpOnly cookies.
- response body:

```json
{
  "success": true
}
```

Invalid code:

- HTTP `422`
- response body:

```json
{
  "code": "VERIFICATION_CODE_INVALID",
  "message": "Неверный код подтверждения"
}
```

### 3.5. Resend verification code

Endpoint:

```http
POST /auth/verification/resend?email=user@example.com
```

Success:

- HTTP `200`
- response body:

```json
{
  "userId": 123
}
```

Cooldown:

- HTTP `429`
- response body:

```json
{
  "code": "VERIFICATION_COOLDOWN",
  "retryAfterSec": 60,
  "message": "Код уже был отправлен"
}
```

### 3.6. Refresh

Endpoint:

```http
POST /auth/refresh
```

Request:

- refresh token берется backend из HttpOnly cookie.
- frontend не отправляет `X-Refresh-Token`.

Success:

- HTTP `200`
- backend обновляет `access_token` cookie.
- при rotation refresh token backend также обновляет `refresh_token` cookie.
- response body:

```json
{
  "success": true
}
```

Failure:

- HTTP `401`
- backend удаляет auth cookies.
- response body:

```json
{
  "code": "SESSION_EXPIRED",
  "message": "Сессия истекла"
}
```

### 3.7. Logout

Endpoint:

```http
POST /auth/logout
```

Success:

- HTTP `204` или `200`
- backend удаляет `access_token` и `refresh_token` cookies.
- если refresh token хранится server-side, backend инвалидирует его.

Frontend должен считать logout успешным даже при `401`.

### 3.8. Auth check/profile

Endpoint:

```http
GET /auth/profile
```

Success:

- HTTP `200`
- response body должен оставаться совместимым с текущим `UserProfileModel`.

Not authenticated:

- HTTP `401`
- response body:

```json
{
  "code": "UNAUTHORIZED",
  "message": "Необходима авторизация"
}
```

## 4. Frontend-совместимость на время миграции auth

До перехода frontend на HttpOnly cookies backend может временно поддерживать текущую схему:

- `POST /auth/login` возвращает `{ "access_token": "...", "refresh_token": "..." }`
- `POST /auth/verify-code` возвращает `{ "access_token": "...", "refresh_token": "..." }`
- `POST /auth/refresh` принимает refresh token из `X-Refresh-Token`
- защищенные endpoints принимают `Authorization: Bearer <access_token>`

После готовности cookie-контракта frontend нужно будет изменить:

- включить `withCredentials: true` для axios.
- убрать чтение и запись auth tokens из JavaScript.
- убрать `Authorization: Bearer`.
- заменить token refresh на вызов `POST /auth/refresh` с cookies.
- добавить `POST /auth/logout`.

## 5. CORS и credentials

Если frontend и backend на разных origin, backend должен разрешить credentials:

- `Access-Control-Allow-Origin` не должен быть `*`.
- Для local разрешить `http://localhost:3000`.
- Для production разрешить `https://figurzilla.ru`.
- `Access-Control-Allow-Credentials: true`.
- Разрешить методы `GET, POST, PUT, PATCH, DELETE, OPTIONS`.
- Разрешить заголовки `Content-Type`, `Authorization`, `X-Refresh-Token`, `Idempotency-Key`.

После полного перехода на HttpOnly cookies `Authorization` и `X-Refresh-Token` можно оставить только для обратной совместимости или удалить после миграционного окна.

## 6. CSRF

Если используется cookie-auth, backend должен защитить state-changing endpoints от CSRF.

Минимальный вариант при same-site production:

- `SameSite=Lax`
- проверка `Origin` и `Referer` для `POST`, `PUT`, `PATCH`, `DELETE`
- разрешенный production origin: `https://figurzilla.ru`

Более строгий вариант:

- endpoint `GET /auth/csrf`
- backend ставит readable csrf cookie или возвращает csrf token.
- frontend отправляет token в `X-CSRF-Token`.
- backend проверяет token на всех state-changing requests.

## 7. Orders: идемпотентное создание заказа

Текущий frontend создает заказы через:

```http
POST /order/BOOKED
Content-Type: application/json
```

Request:

```json
[
  {
    "productId": 10,
    "count": 2,
    "addressId": 5,
    "transferId": 7,
    "comment": "Комментарий"
  }
]
```

Current success response:

```json
[1001]
```

Production problem: при повторном клике, retry, сетевом таймауте или обновлении страницы можно создать дубликаты заказов.

Backend должен поддержать идемпотентность:

```http
Idempotency-Key: uuid-v4
```

Правила:

- Ключ уникален в рамках пользователя.
- Один и тот же `Idempotency-Key` с тем же body возвращает тот же результат без создания новых заказов.
- Один и тот же `Idempotency-Key` с другим body возвращает `409`.
- TTL ключа: минимум 24 часа.
- Ключ сохраняется атомарно вместе с результатом создания заказа.
- При параллельных одинаковых запросах только один создает заказ, остальные получают сохраненный результат.

Success:

- HTTP `200` или `201`
- response body остается совместимым:

```json
[1001]
```

Conflict:

```json
{
  "code": "IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_PAYLOAD",
  "message": "Idempotency-Key уже использован с другим телом запроса"
}
```

После готовности backend frontend добавит генерацию `Idempotency-Key` для checkout submit и retry failed orders.

### Целевой checkout-контракт по продавцу

Текущий frontend продолжает создавать отдельный заказ на каждый товар до
реализации этого контракта. Новый endpoint должен создавать одну атомарную
группу заказов для одного продавца и учитывать стоимость доставки один раз на
всю группу.

```http
POST /order/checkout
Content-Type: application/json
Idempotency-Key: uuid-v4
```

Request:

```json
{
  "sellerId": 12,
  "addressId": 5,
  "transferId": 7,
  "comment": "Комментарий",
  "items": [
    {
      "productId": 10,
      "count": 2
    },
    {
      "productId": 11,
      "count": 1
    }
  ]
}
```

Success:

```json
{
  "sellerId": 12,
  "transferId": 7,
  "orders": [
    {
      "productId": 10,
      "orderId": 1001
    },
    {
      "productId": 11,
      "orderId": 1002
    }
  ]
}
```

Правила:

- все товары должны принадлежать `sellerId`;
- `transferId` должен быть активным способом доставки этого продавца;
- стоимость доставки применяется один раз к группе продавца;
- создание заказов и сохранение результата идемпотентности выполняются в одной транзакции;
- группа создается полностью или не создается вообще;
- повтор с тем же `Idempotency-Key` и body возвращает тот же response;
- повтор ключа с другим body возвращает `409`;
- response всегда содержит явное соответствие `productId` и `orderId`.

Checkout с несколькими продавцами отправляет по одному независимому запросу на
каждого продавца. Частичный успех обрабатывается только на уровне группы
продавца.

## 8. Order state transitions

Все переходы заказа должны быть проверены backend по роли пользователя и текущему статусу.

Текущие frontend-вызовы:

- `POST /order/{orderId}/AWAITING_PREPAYMENT?accountId=&comment=`
- `POST /order/{orderId}/AWAITING_PAYMENT?comment=`
- `POST /order/{orderId}/AWAITING_PREPAYMENT_APPROVAL?imageId=&comment=`
- `POST /order/{orderId}/ASSEMBLING?imageId=&comment=`
- `POST /order/{orderId}/ON_THE_WAY?deliveryUrl=&comment=`
- `POST /order/{orderId}/COMPLETED?comment=`
- `POST /order/{orderId}/FAILED`

Backend должен возвращать:

- `403`, если пользователь не имеет права выполнить переход.
- `409`, если заказ уже в статусе, из которого переход невозможен.
- `404`, если заказ не найден.

Рекомендуемый error code для невозможного перехода:

```json
{
  "code": "ORDER_STATUS_TRANSITION_NOT_ALLOWED",
  "message": "Переход заказа в указанный статус невозможен"
}
```

## 9. Rate limits

Обязательные лимиты:

- `POST /auth/login`: ограничение по IP и email.
- `POST /participant`: ограничение по IP и email.
- `POST /auth/verification/resend`: cooldown с `retryAfterSec`.
- `POST /auth/password/reset`: cooldown с `retryAfterSec`.
- `POST /order/BOOKED`: ограничение по пользователю.

При лимите:

```json
{
  "code": "RATE_LIMITED",
  "retryAfterSec": 60,
  "message": "Слишком много запросов"
}
```

## 10. Acceptance criteria для backend

Auth считается готовым для frontend-миграции, когда:

- login ставит HttpOnly cookies.
- verify-code ставит HttpOnly cookies.
- refresh читает refresh token из HttpOnly cookie.
- logout удаляет cookies и инвалидирует refresh token.
- protected endpoints работают без `Authorization` header.
- `GET /auth/profile` возвращает `401`, если cookies отсутствуют или невалидны.
- local и production CORS работают с credentials.
- state-changing requests защищены от CSRF.

Orders считаются готовыми, когда:

- `POST /order/BOOKED` принимает `Idempotency-Key`.
- повтор одного и того же ключа не создает дубль.
- повтор ключа с другим body возвращает `409`.
- параллельные одинаковые запросы не создают дубль.
- невозможные status transitions возвращают стабильный `409` с code.

## 11. Images endpoint

Текущий endpoint:

```http
GET /images?ids=1&ids=2&ids=3
```

Сейчас backend может возвращать изображения не в порядке переданных `ids`, а `ImageResponse` не содержит `id`. Из-за этого frontend не может безопасно сопоставить batch-ответ с исходными товарами.

Для production-оптимизации backend должен выполнить одно из требований:

- возвращать изображения строго в порядке переданных `ids`;
- или добавить `id` в каждый элемент ответа.

Предпочтительный вариант:

```json
[
  {
    "id": 1,
    "filename": "image.webp",
    "contentType": "image/webp",
    "imageData": "base64..."
  }
]
```

Пока этого нет, frontend обязан загружать несколько изображений одиночными запросами, чтобы не показывать неправильные картинки у товаров.

## 12. Что frontend сделает после backend-готовности

После подтверждения backend contract frontend нужно изменить отдельным шагом:

- перевести axios на `withCredentials: true`.
- убрать JS-readable token storage.
- убрать bearer auth interceptor.
- заменить refresh flow на cookie refresh.
- добавить logout API call.
- добавить `Idempotency-Key` в checkout submit.
- обновить обработку `401`, `403`, `409`, `429`.
- прогнать локальную проверку через Docker backend и production build.
