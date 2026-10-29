# Этап 12, VP P2-2: настоящий browser CORS без interception

27.10.2026. База: `ad9715218e5a894c8e501f3cb1c987ac93826315`, ветка
`feature/backend-integration`. Изменение real-harness выделено в отдельный
Conventional Commit P2-2 после P2-1 по разрешению владельца проекта.
Backend и его конфигурация не менялись.

## Причина и исправление

Даже узкий `context.route()` для Метрики включал Playwright interception.
Браузерные OPTIONS могли получать автоматический 204 вместо ответа backend.
Отсутствие API-specific routes не доказывало настоящую CORS-проверку. Поэтому
исторические browser PASS из набора 32 PASS / 1 FAIL не подтверждают совместимость
preflight. Прямые Node API-проверки и их последующие серверные GET этим механизмом
не подменялись. Исторический контрактный CORS FAIL также получен Node fetch.

`blockExternalTelemetry` теперь принимает Page и до её первой навигации включает
CDP `Network.setBlockedURLs` для `*://mc.yandex.ru/*`. Используется Network domain,
без `Fetch.enable`, Playwright routes, HAR, fulfill и подмены backend-ответов.
Настройка ожидается для каждой страницы, включая отдельную ADMIN-страницу.
Метод рассчитан на Chromium из `playwright.real.config.ts`.

`browser-cors.spec.ts` наблюдает реальные backend-запросы/OPTIONS через CDP,
сохраняя только path без query, method, status, Origin и названия запрошенных
headers. Токены, Authorization, request/response body, комментарии и evidence
в attachments не попадают. Остальные real-сценарии сохраняют свои assertions.

## Перепроверенные сценарии

На свежем production standalone с настоящим `http://localhost:8081`, разрешённым
origin `http://localhost:3000`, backend `ready555/model_store:v1.36`, digest
`sha256:d2864829404d893ecd623e539c0b789abf93e688cf767772e780fa4c6a31b3bb`:

- Desktop и mobile с touch/isMobile: настоящий UI login, затем browser
  POST/GET/PUT/DELETE собственного маркированного товара. Независимый Node GET
  подтверждает создание, изменение price и 404 после удаления. OPTIONS login,
  создания и изменения возвращают фактический 200; искусственных 204 нет.
- Desktop и mobile: успешный UI login, сохранённый действительный refresh token,
  недействительный access только в отдельном тестовом контексте. Открытие истории
  собственного заказа даёт защищённый GET 401; Chrome отправляет OPTIONS refresh
  с Origin localhost:3000, POST и x-refresh-token и получает **403**. POST не имеет
  серверного ответа, retry исходного GET отсутствует, cookies очищаются, виден login.
  Это успешная диагностика известного backend-дефекта, не PASS browser recovery.

Адресный прогон этих четырёх сценариев: **4 PASS**, 0 FAIL/skip/flaky/errors,
workers=1/retries=0, **19.128 s**, `.cache/backend-stage12/p2-browser-cors.json/log`.
Полный повтор 33 прежних + 4 новых: **36 PASS / 1 FAIL**, 0 skip/flaky/errors,
workers=1/retries=0, **184.920 s**, p2-real-final.json/log. Единственный FAIL —
прежний контрактный тест refresh preflight, ожидающий 200 и получающий 403.
В четырёх CDP attachments: 76 backend entries, 36 OPTIONS (34 × 200, 2 × 403,
0 × 204). Read-only серверные логи также содержат OPTIONS refresh/login/product;
выведены только счётчики. Прежние browser-сценарии ADMIN, mobile details,
изоляции аккаунтов, MinIO/optimizer и обоих GIVEAWAY start/end прошли без route.
Свежая сборка VlqBTxnS53OJpmJzON3t2, точные остальные проверки и новые fixtures —
в [основном отчёте](./stage12-results.md#8-исправления-p2-заключительного-vp).

## Оценка приёмки

CORS **не исправлен**. Полноценный browser `401 → refresh → retry` с сохранением
ввода остаётся BLOCKED; контрактный тест продолжает требовать успешный preflight
и не превращён в skip/expected failure. Новый тест явно подтверждает отказ v1.36.
Backend redaction также не реализована; оба требования остаются OPEN в
[BACKEND_REQUIRED_FIXES.md](./BACKEND_REQUIRED_FIXES.md).

Исторические 1085 PASS mock/model не объявляются новым полным прогоном текущих
исправлений. Для P2 выполняется адресный UI/browser/API regression; итоговые
проверки, fixtures и точные числа приведены в основном отчёте.

## Состав отдельного изменения

- `tests/real/network.ts`
- `tests/real/backend-integration.spec.ts`
- `tests/real/giveaway-browser.spec.ts`
- `tests/real/browser-cors.spec.ts`
- `docs/backend-plan/stage12-p2-network.md`
- `docs/backend-plan/stage12-results.md`
- `docs/backend-plan/BACKEND_REQUIRED_FIXES.md`
- `docs/api-and-auth.md`
- `docs/backend-integration-contracts.md`
- `docs/plans/backend-integration.md`
- `docs/testing.md`

P2-1 не зависит от этого helper. Группа P2-1 состоит из четырёх файлов,
перечисленных в её протоколе; эта группа P2-2 — из 11 файлов. Предусмотрен
порядок отдельных коммитов P2-1 → P2-2, поскольку итоговый протокол ссылается
на оба исправления. P2-1 зафиксирован коммитом
`a35a711f11d2af90b23f9be35a6b16bfdd6186c9`; P2-2 —
`64ea7d95eebebe023e23e474918aad5bdb3ae872`. По переданному владельцем
29.10.2026 заключению Astra **P2-1/P2-2 PASS**, frontend этапов 1–12 PASS,
новых findings P0–P3 нет. [Финальный итог](./stage12-results.md#9-финальная-frontend-приёмка-astra)
не закрывает BE-12-01/BE-12-02 и не подтверждает production readiness.
