# Безопасность auth и требования к backend

Актуально на 2026-07-23. Документ объясняет риск текущего хранения токенов и фиксирует требования для production-миграции. Это не подтверждённый backend-контракт: конкретные endpoint, cookie names, TTL и формат ответов должны быть согласованы отдельно в [backend-contract.md](./backend-contract.md).

## Текущее состояние

- `access_token`, `refresh_token` и `token_created_at` сохраняются через `js-cookie`;
- `authClient` читает access token и добавляет `Authorization: Bearer <access_token>`;
- refresh token передаётся из JavaScript в `X-Refresh-Token`;
- logout удаляет cookies на клиенте, но не завершает подтверждённую серверную сессию;
- route guards проверяют наличие cookie, а не валидность и права backend-сессии.

Проблема не в библиотеке `js-cookie`, а в модели хранения. Cookie, созданную из JavaScript, невозможно сделать `HttpOnly`, поэтому её значение доступно любому скрипту, выполняющемуся в контексте приложения.

## Почему это небезопасно

### XSS и цепочка поставки

При XSS-уязвимости вредоносный код может прочитать `document.cookie`, извлечь оба токена и отправить их за пределы приложения. Такой же доступ получает скомпрометированный frontend dependency или сторонний скрипт, выполняющийся на странице.

`Secure` запрещает отправку cookie по обычному HTTP, а `SameSite` ограничивает часть межсайтовых запросов, но эти атрибуты не запрещают JavaScript читать cookie. От чтения защищает именно `HttpOnly`.

### Кража refresh token

Короткий TTL access token не ограничивает ущерб, если злоумышленник получил refresh token. Без server-side rotation, reuse detection и отзыва сессии он может выпускать новые access tokens после закрытия браузера или клиентского logout.

### Клиентский logout

Удаление cookie в текущем браузере не отзывает уже скопированный токен. Logout считается завершённым только после инвалидирования соответствующей сессии на backend.

### Логи и диагностика

Токены вручную добавляются в request headers. Raw Axios errors могут включать request config и заголовки, поэтому без централизованной redaction секреты способны попасть в browser telemetry, proxy, APM или server logs.

### Route guards

Наличие cookie не доказывает, что токен валиден, не истёк, не отозван и принадлежит пользователю с нужными правами. Frontend guard улучшает UX, но не является границей безопасности. Авторизация и object-level access всегда выполняются на backend.

## Целевая production-модель

Рекомендуемая модель — серверная auth-сессия с токенами в cookies, которые backend устанавливает через `Set-Cookie`. JavaScript не должен получать значения access и refresh tokens.

Если backend должен сохранить Bearer API, между браузером и API нужен BFF-слой на Next.js: браузер работает с `HttpOnly` session cookie, BFF хранит или обновляет backend tokens и формирует `Authorization` на сервере. Refresh token нельзя оставлять в JavaScript-доступном хранилище.

## Требования к backend

### Cookies и транспорт

- устанавливать auth cookies только через `Set-Cookie`;
- использовать `HttpOnly`, `Secure`, подходящий `SameSite`, ограниченные `Path` и `Domain`, явный срок жизни;
- использовать HTTPS на всём production-маршруте;
- не передавать токены в URL, response body, доступный JavaScript, или пользовательские redirect-параметры;
- согласовать поведение cookies для local, test, staging и production без ослабления production-настроек.

Если frontend и API работают cross-origin, backend должен разрешать credentials только для точного allowlist origins. Сочетание credentials и wildcard origin недопустимо.

### Жизненный цикл сессии

- access session должна быть короткоживущей;
- refresh token должен ротироваться при каждом успешном refresh;
- rotation должна быть атомарной и учитывать параллельные запросы и несколько вкладок;
- повторное использование уже заменённого refresh token должно обнаруживаться и отзывать затронутую session family;
- logout должен инвалидировать серверную сессию и очищать cookies;
- должны поддерживаться отзыв текущей сессии и отзыв всех сессий пользователя;
- смена и сброс пароля должны отзывать ранее активные сессии;
- истёкшая, отозванная или некорректная сессия не должна восстанавливаться только по наличию cookie.

Backend может хранить не исходные refresh tokens, а их безопасные хеши или непрозрачные session identifiers. Конкретная реализация остаётся ответственностью backend, но отзыв и reuse detection должны быть проверяемыми.

### Авторизация данных

- каждый защищённый endpoint проверяет валидную сессию и роль пользователя;
- object-level authorization проверяет связь пользователя с конкретным заказом, товаром, продавцом или файлом;
- `participantId`, `sellerId`, `orderId` и другие client-controlled identifiers не считаются доказательством доступа;
- подтверждения оплаты и приватные изображения доступны только разрешённым участникам заказа;
- платёжные реквизиты не должны становиться публичными через общий participant lookup.

### CSRF

После перехода на cookie auth state-changing запросы должны быть защищены от CSRF:

- подходящим `SameSite`;
- проверкой `Origin` и при необходимости `Referer`;
- CSRF token, если выбранная topology не может надёжно опираться на SameSite и origin checks;
- запретом state-changing операций через `GET`.

`HttpOnly` защищает секрет от чтения, но не заменяет CSRF-защиту.

### Пароли и чувствительные данные

- пароли передаются только в JSON body HTTPS-запроса, никогда в query string;
- password reset не должен раскрывать существование аккаунта;
- login, refresh, password reset и verification должны иметь rate limiting и защиту от перебора;
- cookies, пароли, токены и authorization headers должны удаляться из application, proxy и APM logs;
- error responses не должны возвращать секреты или внутренние session identifiers.

### Контракт ошибок

Нужно однозначно согласовать:

- `401` для отсутствующей, истёкшей или отозванной сессии;
- `403` для валидной сессии без права на операцию или объект;
- поведение refresh при истечении, отзыве, повторном использовании и параллельных запросах;
- способ server-side проверки сессии для защищённых Next.js routes;
- правила logout и очистки cookies при частично недоступном backend.

## Изменения frontend после готовности backend

- удалить чтение и запись auth tokens через `js-cookie`;
- удалить ручное добавление `Authorization` и `X-Refresh-Token` в браузере;
- использовать запросы с credentials;
- централизовать обработку истечения и отзыва сессии;
- при любом logout очищать auth-bound TanStack Query cache, Zustand state и пользовательские persisted drafts;
- не считать middleware или dashboard layout заменой backend authorization;
- добавить real-backend tests для login, refresh, logout, password change/reset и session expiry.

Миграция должна выполняться одним согласованным изменением frontend и backend либо через ограниченное совместимое окно. Нельзя отключать текущую схему до появления рабочего server-side session flow.

## Критерии приёмки

Production auth считается готовым, когда на staging подтверждено:

1. JavaScript не может прочитать access или refresh token.
2. Защищённые endpoint отклоняют запрос без валидной сессии.
3. Пользователь не может получить объект другого пользователя подстановкой identifier.
4. Refresh ротирует token, а повторное использование старого значения обнаруживается.
5. Logout инвалидирует сессию на backend, включая ранее скопированное состояние клиента.
6. Смена и сброс пароля отзывают ранее активные сессии.
7. Cross-site state-changing запрос блокируется CSRF-защитой.
8. Недопустимый CORS origin не получает credentialed access.
9. Пароли и токены отсутствуют в URL, browser telemetry, proxy и backend logs.
10. Параллельные запросы и несколько вкладок не создают бесконечный refresh loop и не восстанавливают отозванную сессию.
