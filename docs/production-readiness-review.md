# Production Readiness Review

Дата анализа: 2026-05-12

Проект: marketplace frontend на Next.js, TypeScript, Zustand, MUI, FSD.

## Краткий вердикт

Проект уже находится в хорошем состоянии для staging или closed beta: сборка проходит, Node 24 закреплен, CI настроен, базовые production-практики в Docker и Next.js применены, публичные ключевые страницы частично переведены на SSR.

Для полноценного production-релиза публичного e-commerce проекта есть несколько обязательных блокеров. Главные риски сейчас не в UI, а в безопасности авторизации, надежности order flow, отсутствии e2e-тестов, мониторинге и финализации backend-контрактов.

## Проверки

На момент анализа локально проходят:

- `npm audit --omit=dev --audit-level=high`
- `npm run typecheck`
- `npm run lint`
- `npm run architecture:check`
- `npm run build`

Это хороший базовый уровень, но он не заменяет поведенческие тесты пользовательских сценариев.

## Что уже хорошо

### Инфраструктура и DX

- Node 24 закреплен в `package.json`, Docker и GitHub Actions.
- CI проверяет audit, типы, lint, архитектуру и production build.
- Dockerfile использует standalone build и запуск от non-root пользователя.
- `.dockerignore` исключает лишние и чувствительные файлы.
- Production localhost API блокируется env-валидацией.

### Архитектура

- FSD-проверка проходит.
- Основные доменные области разнесены по слоям и слайсам.
- Есть отдельные shared API helpers, query retry policy, error normalization.
- Глобальное состояние через Zustand используется точечно, не для всего подряд.

### SSR и SEO-база

- Главная, категория и карточка товара уже используют SSR/Server Components.
- Публичные страницы теперь могут отдавать не пустой HTML.
- Для части страниц настроены metadata и robots.
- Есть sitemap и robots.

### Безопасность на уровне UI

- Dashboard защищен middleware, server layout и client guard.
- Favorites и checkout не SSR-ят приватные данные и показывают unauthorized state.
- 18+ категория имеет отдельный UI-гейт подтверждения.
- Backend остается финальным источником прав, что правильно для marketplace.

### Изображения

- Продуктовые изображения переведены на metadata URL вместо base64-запросов по каждому товару.
- Это правильнее для производительности, кэширования и CDN.
- Local MinIO image domains разрешены только в development.

## Критично сделать до production

### 1. Перевести auth на HttpOnly cookies

Сейчас access/refresh token хранятся в JS-readable cookies. Это означает, что при XSS злоумышленник может прочитать токены.

Для production лучше:

- backend выставляет `HttpOnly Secure SameSite` cookies;
- frontend не читает токены через JS;
- API-запросы идут с `withCredentials`;
- refresh flow работает через backend cookie session;
- logout очищает cookie на backend.

Текущая схема приемлема для разработки и staging, но для публичного marketplace это высокий security risk.

### 2. Добавить idempotency для создания заказов

Order creation должен быть идемпотентным. Без этого возможны дубли заказов из-за:

- двойного клика;
- повторной отправки формы;
- network retry;
- таймаута при успешном создании заказа на backend.

Нужен контракт:

- frontend генерирует `Idempotency-Key`;
- backend сохраняет результат первого успешного запроса;
- повтор с тем же ключом возвращает тот же заказ, а не создает новый.

Это критично именно для e-commerce.

### 3. Добавить e2e smoke-тесты

Сейчас CI проверяет только статическое качество и сборку. Перед production нужны минимальные e2e-тесты.

Обязательные сценарии:

- главная страница открывается;
- каталог и категория открываются;
- карточка товара открывается;
- dashboard редиректит анонима на login;
- авторизация работает;
- создание товара работает;
- корзина и checkout работают;
- заказ создается один раз;
- 18+ категория требует подтверждение;
- изображения товаров отображаются через metadata URL.

Без этого любое изменение backend-контракта или frontend flow может попасть в production незамеченным.

### 4. Подключить runtime monitoring

Сейчас frontend ошибки в основном видны только в console. Для production нужен Sentry или аналог.

Минимально нужно отслеживать:

- client runtime errors;
- server rendering errors;
- hydration errors;
- failed API requests;
- failed image loading patterns;
- critical checkout/order failures.

Без мониторинга production-проблемы будут обнаруживаться только пользователями.

### 5. Зафиксировать production env и backend contract

Перед релизом нужно явно зафиксировать:

- `NEXT_PUBLIC_API_URL`;
- `API_BASE_URL`;
- cookie domain;
- CORS policy;
- CDN image host;
- MinIO bucket public policy;
- HTTPS;
- reverse proxy rules;
- backend route prefix;
- payload contracts для products, categories, images, orders, auth.

Особенно важно: backend должен отдавать environment-specific image URLs.

Пример:

- local: `http://localhost:9000/product-bucket/...`
- production: `https://cdn.figurzilla.ru/product-bucket/...`

Frontend не должен вручную переписывать production CDN URL в local URL.

### 6. Ужать security headers

CSP уже есть, это хорошо. Но для production нужно усилить:

- `connect-src` не должен разрешать весь `http: https: ws: wss:`;
- `script-src 'unsafe-inline'` ослабляет защиту;
- для Яндекс Метрики лучше отдельно решить nonce/hash/допустимые endpoints;
- production CSP должен разрешать только реальные API/CDN/analytics domains.

Текущий CSP лучше, чем отсутствие CSP, но пока он слишком широкий.

### 7. Проверить backend enforcement для прав

Frontend guard не является защитой сам по себе. Backend должен проверять:

- seller/admin permissions;
- ownership товара;
- ownership заказа;
- доступ к dashboard API;
- возраст пользователя для 18+;
- допустимость order status transition;
- права на просмотр proof/payment images.

Frontend должен быть удобным UI-слоем, но не security boundary.

## Важно, но можно делать после первого production-релиза

### 1. SEO-доводка

Нужно постепенно улучшить:

- OpenGraph image для карточки товара;
- корректный `404` через `notFound()` для отсутствующего товара;
- исключение 18+ товаров из sitemap, если backend может вернуть их в общем списке;
- canonical URLs;
- более полные metadata для категорий и товара.

Если SEO-трафик важен с первого дня, часть этого становится pre-release задачей.

### 2. Производительность

Текущий First Load JS для ключевых страниц примерно в районе 300-350 kB. Это терпимо для MVP, но тяжеловато.

Дальше можно:

- lazy-load тяжелые виджеты;
- уменьшать количество client components;
- проверить bundle analyzer;
- выносить модалки и secondary UI в dynamic chunks;
- аккуратно использовать caching/ISR там, где бизнес допускает.

### 3. Cleanup загруженных изображений

Сейчас изображения загружаются сразу при выборе файла. Если пользователь загрузил файл и ушел со страницы, может остаться неиспользуемый объект в хранилище.

Нужно решить на backend или совместно:

- временные upload objects;
- cleanup job;
- привязка изображения к товару только после submit;
- удаление orphan images.

Это не обязательно блокирует MVP, но важно для стоимости хранения и порядка данных.

### 4. Улучшить fallback для изображений

Нужны стабильные fallback-состояния:

- изображение не найдено;
- CDN недоступен;
- metadata пришла без URL;
- URL есть, но объект не открывается;
- private image недоступна пользователю.

### 5. Release checklist

Стоит завести отдельный checklist:

- env переменные проверены;
- backend migrations применены;
- CDN/MinIO доступны;
- домены и HTTPS работают;
- robots/sitemap проверены;
- smoke e2e проходит;
- rollback plan есть;
- monitoring активен;
- production build совпадает с образом, который деплоится.

## Отдельные наблюдения по страницам

### Главная и каталог

SSR внедрен правильно и дает полезный HTML. Это плюс для SEO и первичной загрузки.

Дальше стоит следить, чтобы client-side prefetch и query refetch не дублировали без необходимости серверные запросы.

### Карточка товара

SSR есть, но нужно улучшить production-поведение:

- настоящий 404 для отсутствующего товара;
- OpenGraph image;
- стабильный fallback для изображений;
- проверка related products на лишние запросы.

### Dashboard

Защита на frontend уровне есть. Для production важно, чтобы backend не полагался на frontend route guard.

### Checkout и Favorites

Оставлять UI без middleware-защиты допустимо, если:

- страница не SSR-ит приватные данные;
- API-запросы не выполняются до понимания auth-состояния;
- backend защищает данные.

Текущий подход нормальный для UX, потому что пользователь видит штатный unauthorized state.

### 18+

UI-гейт нужен как дополнительный UX/legal слой, но не должен быть единственной проверкой.

Правильная модель:

- пользователь подтверждает намерение открыть 18+ в текущей сессии;
- frontend показывает соответствующий UI;
- backend проверяет реальный возраст по профилю;
- underage пользователь не получает товары даже при обходе frontend.

## Главные риски релиза

1. XSS impact высокий из-за JS-readable tokens.
2. Возможны дубли заказов без idempotency.
3. Нет e2e-проверки критичных flows.
4. Нет production monitoring.
5. Backend-контракты недавно менялись и могут снова сломать frontend.
6. CDN/MinIO local/prod конфигурация требует строгой договоренности.
7. CSP пока слишком широкий.

## Рекомендованный порядок работ

1. Закоммитить текущие изменения.
2. Добавить e2e smoke tests.
3. Согласовать с backend HttpOnly cookie auth.
4. Согласовать idempotency для order creation.
5. Подключить monitoring.
6. Ужать production CSP и env.
7. Пройти staging release checklist.
8. После этого выпускать production MVP.

## Итог

Проект близок к production-ready MVP по frontend-архитектуре, сборке и базовому SSR. Но для реального публичного e-commerce релиза критично закрыть security, order reliability, e2e coverage, monitoring и backend contract stability.

После закрытия этих пунктов остальные задачи можно делать итерационно уже по ходу развития проекта.
