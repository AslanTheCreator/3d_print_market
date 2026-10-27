# Этап 12: реальные интеграционные проверки DEV

Прогоны: 22.10.2026. Окончательная браузерная диагностика CORS и документирование:
27.10.2026. Ветка `feature/backend-integration`, исходный HEAD
`682df92f07a65aacfbd9f31683bbffc4bed7f95b`. Базовый коммит этапа 12 —
`ad9715218e5a894c8e501f3cb1c987ac93826315`. Исправления двух P2 заключительного VP
выделены 27.10.2026 в два отдельных Conventional Commits по разрешению владельца
проекта; push, merge и rebase не выполняются.
Предшествующее пользовательское изменение `docker-compose.yml` сохранено отдельно.

**Статус этапа: Frontend-работы завершены с известными backend-ограничениями; P2 финального VP исправлены, ожидает адресного независимого VP.**

Решением владельца проекта CORS refresh и приватное backend-логирование отложены
и переданы в зону ответственности backend-разработчика. Описание разработчику
передаёт владелец проекта. Эти ограничения не блокируют завершение текущих
frontend-работ; их FAIL/BLOCKED и результаты прогонов сохраняются. Исправления
backend и полный успешный браузерный refresh не подтверждены. Полная серверная
приёмка имеет два открытых backend-дефекта; требования к исправлениям вынесены в
[BACKEND_REQUIRED_FIXES.md](./BACKEND_REQUIRED_FIXES.md).

## 1. Матрица Acceptance Criteria

| Критерий этапа 12 | Результат | Основание |
| --- | --- | --- |
| Все исходные требования реализованы и проверены | BLOCKED | Реальные бизнес-сценарии ниже прошли; успешный browser refresh с сохранением формы заблокирован CORS backend |
| BLOCKER-вопросы закрыты, ответы отражены в типах/UI/тестах | FAIL | B1–B4, N1–N2 проверены реальными сценариями; CORS refresh и приватные query в backend-логах отложены на сторону backend решением владельца проекта |
| Проверки пройдены, реальные серверные сценарии выделены | FAIL | После P2 без interception: real 36 PASS / 1 FAIL; исходный real 32 PASS / 1 FAIL и полный mock/model 1085 PASS сохранены как исторические результаты |
| Документация соответствует реализации, ORDER-файлы не удаляются | PASS | Обновлены API/auth, architecture, testing и этот протокол; DELETE ORDER проверен реальным API |
| Итоговый Verification Pass завершён, diff пригоден к отдельному коммиту | BLOCKED | Заключительный VP выявил два P2; исправления прошли self-review, адресный независимый VP ещё не выполнен |

Решение о завершении frontend-работ не означает выполнения всех AC. В первой,
второй, третьей и пятой строках остаются указанные ограничения; checkbox этих
критериев в плане не закрывается. Независимый VP можно проводить на текущем diff
с документированными backend-исключениями, не дожидаясь их исправления.

| Проверяемое требование | Результат | Уровень подтверждения |
| --- | --- | --- |
| Общие fixtures новых контрактов, отказ старых mutation и DELETE ORDER | PASS | `backendContracts.ts`, регрессии и реальные отрицательные запросы |
| BOOKED → CANCELLED, покупатель/продавец/ADMIN бота | PASS | Реальные POST и последующие GET; не-BOOKED и чужой бот отклонены |
| Запрос отмены → CANCELLED / REJECTED | PASS | Обычный заказ и предзаказ, обе стороны; исходный статус сохраняется до решения |
| DISPUTE → BUYER / допустимый SELLER | PASS | AWAITING_PREPAYMENT_APPROVAL (обе стороны), AWAITING_PAYMENT с чеком, ASSEMBLING, ON_THE_WAY; BUYER → FAILED, допустимый SELLER → COMPLETED; преждевременный SELLER и LEGACY отклонены |
| CANCELLED → PAYMENT_APPEAL → DISPUTED → CANCELLED | PASS | Оба исхода, с evidence и без него; повторное открытие запрещено |
| Доплата в открытом споре | PASS | Чек присоединён к caseImages, заказ остаётся DISPUTED |
| Реальные роли и object-level доступ | PASS | ADMIN 1, USER 14/18, боты 2/3; запрет ADMIN для USER; ORDER виден только участникам/ADMIN |
| Серверная валидация и конкурентные операции | PASS | Пустой comment, неверные переходы/исходы/настройки; конкурентное открытие, решение и включение пересекающихся розыгрышей |
| Currency snapshot и paymentProofImageId | PASS | RUB в user/admin case после смены валюты товара на USD; ID чека после оплаты |
| GIVEAWAY: создание, преобразование, повторное редактирование | PASS | Реальные API, сохранение category/image relations; defaults 0/RUB/null |
| Публичные окна GIVEAWAY, выключение/повторное включение | PASS | Реальный сервер; standalone browser нового и преобразованного товара проходит начало/конец по настоящему времени, без clock mocks |
| Возврат пользователя после решения ADMIN | PASS | Реальный mobile browser → форма обращения → отдельная ADMIN-сессия → решение → обновлённые case/order |
| Межаккаунтный приватный кэш | PASS | Два реальных login в одном document; заказы предыдущего покупателя отсутствуют |
| Изображения production/standalone | PASS | Реальный MinIO, Next Image optimizer, naturalWidth > 0, отсутствие img-src CSP violations |
| Прямой refresh API | PASS | Настоящий X-Refresh-Token возвращает text/plain access token; новый token принят /auth/profile |
| CORS browser refresh | FAIL | 27.10.2026 реальный frontend после защищённого GET 401 инициировал refresh; OPTIONS с x-refresh-token от localhost:3000 получил 403, POST заблокирован, сессия завершилась |
| Успешный browser refresh с сохранением ввода | BLOCKED | Реальный браузер не может отправить refresh после неуспешного preflight |
| Сохранение ввода, single-flight/401 recovery с успешным refresh | MOCK ONLY | Регрессионные сценарии подменяют API и не доказывают исправление серверного CORS |
| Безопасная диагностика frontend | PASS | Код сериализатора исключает query/body/backend message; `safe-diagnostics.spec.ts` входит в полный регрессионный набор; real manifest не сохраняет query/body/headers |
| Отсутствие чувствительных query в backend-диагностике | FAIL | Docker logs содержат HTTP request URI с comment=S12-…; реальные значения не экспортировались |

## 2. Стенд и реальные сценарии

- Backend: `http://localhost:8081`, Swagger `/swagger-ui/index.html`, OpenAPI
  `/v3/api-docs` (81 path). Фактический образ `ready555/model_store:v1.36`, digest
  `sha256:d2864829404d893ecd623e539c0b789abf93e688cf767772e780fa4c6a31b3bb`.
- PostgreSQL: `localhost:5432`, контейнер `postgres-with-cron`, тег `postgres:15.3`,
  фактический сервер 15.19; существующий volume сохранён.
- MinIO: `localhost:9000` / console `localhost:9001`,
  `quay.io/minio/minio:RELEASE.2022-02-18T01-50-10Z`; прежнее хранилище сохранено.
- Production standalone исходных прогонов 22.10.2026: `http://localhost:3000`,
  build ID `t0u3swxWpaMEg6HW91soq`; свежая P2-сборка и повторы — в разделе 8.
  Browser и SSR обращаются к реальному `localhost:8081`. API mocks/HAR/SSR fixtures
  в `tests/real` отсутствуют. Regression standalone 3100 и SSR fixture 3101
  использовались только для отдельного mock-набора и после прогонов остановлены.
  После прогонов 22.10.2026 frontend 3000 и локальный SMTP sink 2525 были оставлены
  работающими. Для диагностики 27.10.2026 использован Next.js dev на 3000 с тем же
  реальным API; запущенный для этой диагностики frontend затем остановлен. Перед
  повторным VP необходимо проверить текущие процессы и SMTP guard.
- В исходном real-harness Метрика блокировалась через Playwright route. VP
  подтвердил побочный эффект: browser OPTIONS мог получать автоматический 204.
  Поэтому исходные browser PASS не доказывают настоящий CORS. P2-2 удаляет
  interception, использует CDP Network.setBlockedURLs до навигации каждой страницы
  и перепроверяет реальные сценарии; результаты и серверные OPTIONS — в разделе 8.
  Прямые Node API-запросы/GET этим механизмом не подменялись. В ранних запусках
  отсутствие внешней телеметрии не подтверждено. Конфигурации Telegram/webhook
  в переменных запущенного backend не обнаружены.
- DEV подтверждён пользователем, локальными DB/S3 и фактическими контейнерами.
  До записей сохранены обезличенные `environment-before.json`,
  `environment-active.json`, `data-before.json` в `.cache/backend-stage12/`.
- Внешний SMTP отключён до mutation. Пересоздан только backend существующего
  Compose с overlay `SPRING_MAIL_HOST=host.docker.internal`, port 2525, auth/TLS=false.
  Локальный `scripts/dev-smtp-sink.mjs` не пересылает письма и не сохраняет их текст.
  Счётчики после реального прогона: 0 сообщений / 0 получателей. Внешний SMTP
  автоматически не восстанавливается.
- `.env.local`: ADMIN ID 1; `CODEX_TEST_BUYER_*` фактически продавец USER ID 18;
  `CODEX_TEST_SELLER_*` покупатель USER ID 14. Используются существующие адреса,
  доставки, боты 2/3 и категория 132. Пароли и токены в отчёты не записываются.

Реальные mutations проверяются последующим чтением заказа, обращения, изображения,
административных деталей/истории и публичного состояния. Проверены машинные коды
`ORDER_CASE_ALREADY_OPEN`, `ORDER_CASE_ALREADY_RESOLVED`,
`PAYMENT_APPEAL_ALREADY_EXISTS`, `ORDER_CASE_INVALID_TRANSITION`,
`ORDER_CASE_INVALID_OUTCOME`, `GIVEAWAY_WINDOW_OVERLAP`, `BAD_REQUEST`.
Конкурентные операции действительно отправляются через `Promise.all`: один
победитель и один отказ, затем проверяется единственный сохранённый результат.

## 3. Созданные и изменённые DEV-данные

Исходный итог 22.10.2026 включает диагностические и повторные запуски той сессии,
а не только последние 33 теста. Дополнительные fixtures P2 от 27.10.2026 — в разделе 8. Все товары маркированы `[ТЕСТ S12-…]`, заказы — `S12-…`.

| Сущности | До → после | Созданные ID |
| --- | --- | --- |
| Товары | 17 → 145 | 128: 23–36, 38–151 |
| Заказы | 9 → 163 | 154: 10–163 |
| Обращения | 0 → 80 | 80: 1–80 |
| Изображения | 24 → 84 | 60: 90–149; 54 ORDER и 6 PRODUCT |

Тестовые товары: 35 PURCHASABLE, 31 PREORDER, 31 EXTERNAL_PRODUCT, 31 GIVEAWAY.
Все 31 тестовый розыгрыш отключены; OPEN-обращений нет. Обращения: 44 запроса
отмены, 24 спора, 12 payment appeals; исходы 19 CANCELLED, 25 REJECTED,
24 BUYER, 12 SELLER. Заказы оставлены в состояниях BOOKED (21),
AWAITING_PREPAYMENT (6), AWAITING_PAYMENT (38), ASSEMBLING (14),
CANCELLED (51), FAILED (18), COMPLETED (6) для аудита/повторного VP.

После таймаута параллельного UI-прогона собственное обращение 65 заказа 136
оставалось OPEN. Оно адресно закрыто ADMIN API как REJECTED; повторно прочитаны
RESOLVED/REJECTED и неизменный AWAITING_PAYMENT заказа (`cleanup.json`).
Новые доставки не понадобились. Внешние платежи не выполнялись;
подтверждение оплаты моделировалось синтетическим PNG через реальный API.

Пользователи не создавались. Статусы исходных заказов 1–9 проверены повторно
и совпадают с исходными: 1 CANCELLED, 2 AWAITING_PAYMENT, 3–6 BOOKED,
7 COMPLETED, 8–9 BOOKED. Сбросов БД, массовых удалений и новых volumes не было.
Полный обезличенный инвентарь: `.cache/backend-stage12/data-after.json`;
ID/статусы запросов по запускам — `manifests/*.json`. ORDER-файлы не удалялись:
сервер отвергает такую операцию. Содержимое evidence в manifests отсутствует.

## 4. Подтверждённые несовместимости и исправления

1. **Frontend, production images:** локальный MinIO разрешался только в dev.
   `ALLOW_LOCAL_API_URL=true` теперь также включает локальные image remotePatterns
   и CSP при production build. Без opt-in production остаётся ограниченным;
   unsafe-eval не включается. Есть model regression и реальная standalone-проверка.
2. **Frontend, legacy order:** у исходного заказа 8 удалён товар, snapshot содержит
   `categories=null`. `OrderProductPreview` падал и ломал весь список.
   Безопасный доступ `categories?.[0]` и fallback «Без категории»; desktop/mobile
   regression воспроизводит именно полученный серверный snapshot.
3. **Frontend, ADMIN recovery:** сохранённая форма не наблюдала восстановление
   профильного query после reconnect failure, поэтому Save оставался disabled.
   Редактор подписан на существующий `useSessionProfile`; роль и guards остаются
   обязательными. Проверены dirty-ввод, retained form, pending PUT, отказ роли.
4. **Frontend, mobile auth:** эффект visualViewport выполнялся до появления MUI
   portal ref; callback ref теперь запускает подписку после появления элемента.
   Добавлен scroll padding, чтобы действия не обрезались у края keyboard viewport.
   После verification фокус возвращается на submit через явный ref. Исходное
   понижение notification ниже modal выявлено VP как P2-1 и заменено размещением
   в потоке активного Dialog с доступным закрытием и сохранением focus (раздел 8).
5. **Тест, prefetched RSC:** navigation observer исключает prefetch, а positive
   control допускает reuse удержанного prefetch. Проверки единственного
   router.replace, history, cookies и целевого RSC сохранены.
6. **Тест, Reset filter:** Reset штатно закрывает mobile overlay. Тест проверяет
   закрытие, повторно открывает фильтр на mobile width и проверяет сброшенные поля.
7. **Тест, pending ADMIN PUT:** после profile retry выполняется явное контрольное
   чтение; принятый/неопределённый PUT не считается завершённым по одному profile GET.
   Сохранены draft/form identity и запрет второй записи.
8. **Backend, отложено — CORS refresh:** подтверждённый FAIL передан на сторону
   backend. Воспроизведение, последствия и повторная приёмка — в разделе 6.
   Прокси, подмена ответов и альтернативный недокументированный refresh не добавлены.
9. **Backend, отложено — приватная диагностика:** подтверждённый FAIL передан
   на сторону backend. Доказательства без приватных значений и требования
   к redaction — в разделе 6; frontend-исправление этой проблемы не заявляется.
10. **Тест, mobile categories:** полный повтор обнаружил клик по SSR-ссылке до
    hydration: в error context отображался каталог вместо диалога. Изолированно
    прежний набор прошёл 18/18. Сценарии меню теперь используют существующий
    паттерн ожидания React props перед кликом; modified-click fallback не изменён,
    проверки alert/Retry/отсутствия навигации сохранены.

Реальные особенности не объявлены дефектами: ORDER upload возвращает TEMPORARY
до привязки/активации; anonymous/посторонний обычный USER получает 200 [] при
чтении ORDER image, чужой scoped agent — 403; metadata не раскрывается,
DELETE отвергается. Token endpoint бота возвращает camelCase, обычный login —
snake_case, refresh — text/plain. Это учтено тестовым harness без изменения API.

## 5. Автоматизированные проверки

Ниже исторические результаты прогонов 22.10.2026 на production-сборке
`t0u3swxWpaMEg6HW91soq`. Текущая свежая сборка и повтор после P2 — в разделе 8.

| Проверка | Фактический результат | Отчёт в `.cache/backend-stage12/` |
| --- | --- | --- |
| npm run build | PASS, exit 0 | build-final-reviewed.log |
| npm run lint | PASS, exit 0 | lint-reviewed.log |
| npm run typecheck | PASS, exit 0 | typecheck-accepted.log |
| npm run architecture:check | PASS, exit 0 | architecture-reviewed.log |
| npm run test:smoke | 15 PASS, 0 FAIL/skip, 6.709 s | smoke-reviewed.log |
| npm run test:integration:real, финальный отдельный прогон | 32 PASS / 1 FAIL, 0 skip/flaky, 114.862 s, workers=1/retries=0 | real-results.json, real-final-alone.log |
| Предшествующий real-прогон 30 сценариев | 29 PASS / 1 FAIL, 0 skip/flaky, 85.539 s | real-final-reviewed.log |
| Дополнительные реальные сценарии (предоплата buyer/seller, публичный converted GIVEAWAY) | 3 PASS, 0 skip/flaky, 55.788 s, workers=1/retries=0 | real-additional.json/log |
| ADMIN/open forms + legacy category, до последнего scroll-padding | 24 PASS; mobile auth ещё имел 1 subpixel failure | fixes-reviewed.json |
| Mobile auth после scroll-padding | 4 PASS, 14.6 s | auth-reviewed.json |
| Session lifecycle + mobile Reset | 26 PASS, 55.1 s | targeted-regression-final.log |
| Полный desktop/mobile regression на итоговой сборке | 1084 PASS / 1 FAIL, 0 skip/flaky, 818.515 s; mobile categories click до hydration | full-e2e-reviewed.json/log |
| Mobile categories после ожидания hydration | 30 PASS, 0 skip/flaky, 22.851 s (6 × 5), workers=4/retries=0 | categories-reviewed.json/log |
| Полный повтор после исправления mobile categories | 1085 PASS (1019 desktop + 66 mobile), 0 FAIL/skip/flaky/errors, 862.972 s, workers=4/retries=0 | full-e2e-accepted.json/log |
| Read-only production image probe | Next Image optimizer: 4 ответа 200, 3 загруженных img с naturalWidth > 0 | Вывод проверки в сессии |
| Браузерная диагностика CORS 27.10.2026, отдельно от 33 real-тестов | Реальный 401 → OPTIONS refresh 403 → завершение сессии; same-origin контроль refresh 200 и profile 200 | Обезличенные CDP-метаданные в сессии, Chromium 148.0.7778.96 |
| Ссылки документации и diff-check | Проверены при завершении документации; diff-check exit 0 | Проверка CLI в сессии |
| Pattern audit локальных текстовых артефактов | 103 файла, 0 явно помеченных credentials/JWT, 0 query в manifest paths; это ограниченная проверка шаблонов, не доказательство полного отсутствия секретов | artifact-privacy-audit.json |

Предыдущий полный прогон: 1077 PASS / 8 FAIL из 1085, 0 skip/flaky, 992.154 s
(`full-e2e-final.json`). Изолированный повтор воспроизвёл 3 ADMIN и 3 mobile-auth
дефекта (исправлены выше); gallery swipe и contextual account menu отдельно
прошли. Эти первоначальные failures не скрыты итогами адресных повторов.
Существующие timeout/retries/skip не ослаблялись, assertions сохранены.

Параллельный real-прогон вместе с полным mock-набором: **29 PASS / 4 FAIL**,
6.6 min (`real-accepted.log`): тот же CORS и три ожидания browser UI (mobile
details, сообщение о создании обращения, список при смене аккаунта). В error
context оставалась загрузка, сервер успевал принять обращение. При повторе всех
33 сценариев отдельно все три прошли без изменений assertions/timeout.
Связь с нагрузкой вероятна; устойчивая причина замедления не установлена.
Этот неуспешный запуск сохранён в отчёте и не называется успешным.

## 6. Отложенные проблемы backend и риски

### CORS /auth/refresh

**BACKEND CORS BUG, влияет на реальный frontend; отложено на сторону backend.**
27.10.2026 подтверждён штатный сценарий приложения в Chromium 148.0.7778.96,
Next.js dev на `http://localhost:3000`, реальный API на `http://localhost:8081`.
В отдельном браузерном контексте после успешного login заменён только access
token; действительный refresh сохранён. Открытие истории заказа вызвало
`GET /order/159/cases` → 401 и автоматический refresh через interceptor.

Chrome отправил OPTIONS с правильными Origin, POST и `x-refresh-token`;
backend вернул 403 без Access-Control-Allow-Origin. Ошибка браузера —
`net::ERR_FAILED` / `PreflightMissingAllowOriginHeader`. POST не отправлен,
новый access token не получен, retry не выполнен, cookies очищены, переход на
`/auth/login`. Успешный refresh/retry с сохранением ввода остаётся **BLOCKED**.
API mocks, CORS bypass и изменения кода/конфигурации не использовались.

Живой OpenAPI требует именно `X-Refresh-Token`; JAR запущенного v1.36 содержит
CorsConfig с Authorization/Content-Type/X-Requested-With без этого header.
Контрольные preflight на том же endpoint с каждым разрешённым header дают 200,
с x-refresh-token — 403. Compose действительно передаёт разрешённый origin
localhost:3000 и allow-all=false, но не задаёт разрешение отсутствующего header.
Frontend вызывает backend напрямую; Next.js proxy и серверного refresh нет.

Same-origin контроль из страницы Swagger на localhost:8081: OPTIONS отсутствует,
POST refresh 200, новый access token принят profile GET (200) того же аккаунта.
Таким образом, успех Swagger не опровергает CORS-дефект. Это не ошибка frontend
и не диагностический сценарий, не используемый приложением.

### Приватные query в HTTP-логировании

**BACKEND LOGGING BUG, отложено на сторону backend; FAIL read-only аудита.**
HTTP request URI сохраняет чувствительный query comment вместе со значением.
Аудит 22.10.2026 обнаружил 451 строку с синтетическим комментарием; сохранены
только счётчики, без фактических значений. Это отдельный аудит, не второй failed
test финального real-набора. Необходима централизованная серверная redaction;
frontend-сериализатор не исправляет серверную запись приватных данных.

Для обеих проблем затронут образ `ready555/model_store:v1.36`, digest — в
разделе 2. Статус OPEN, воспроизведение, последствия, ожидаемое поведение,
ответственность backend-разработчика и минимальные критерии повторной проверки
зафиксированы в [BACKEND_REQUIRED_FIXES.md](./BACKEND_REQUIRED_FIXES.md).
Исправления отложены решением владельца проекта, не объявлены выполненными.

### Остальные риски и наблюдения

- Единичный прежний timeout публичного GIVEAWAY остаётся под наблюдением;
  реальный standalone start/end прошёл, mock-regression результат указан отдельно.
- При одновременном полном regression и real-наборе наблюдались browser UI
  таймауты. Финальный real-набор выполнен отдельно; нагрузочная стабильность
  не подтверждена. Для повторения серверной приёмки запускать наборы последовательно.
- Проверки являются синтетическими DEV-сценариями, не подтверждают нагрузочную
  устойчивость production, независимые вкладки или потерю памяти при hard reload.
- SMTP остаётся локальным sink; при его остановке backend не сможет отправлять
  письма. Возвращать внешний SMTP во время интеграционных тестов нельзя.
- Повторный real-набор создаёт новые fixtures; исходные данные не очищаются.

## 7. Готовность к независимому Verification Pass

**Frontend-работы завершены с известными backend-ограничениями; P2 финального VP исправлены, ожидает адресного независимого VP.**

Исходный frontend-объём зафиксирован коммитом ad97152. Заключительный независимый
VP выявил P2-1 (уведомления при Dialog) и P2-2 (ложный preflight в real-harness).
Оба исправления прошли адресные проверки и self-review и выделены в отдельные
коммиты. P2-1: `a35a711f11d2af90b23f9be35a6b16bfdd6186c9`; P2-2 — коммит,
содержащий этот итоговый протокол. Адресное независимое подтверждение исправлений
ожидается.

Контракты refresh не менялись, CORS bypass не добавлен. Два backend-дефекта
остаются OPEN, CORS FAIL и успешный refresh/retry BLOCKED. AC не закрыты формально.
Незавершённых frontend-задач в объёме этих P2 не выявлено; production-приёмка
без backend-ограничений не заявляется. AGENTS.md, зависимости, strict mode и
FSD-границы не изменялись. Пользовательский Compose не включён в P2-изменения.

## 8. Исправления P2 заключительного VP

### P2-1 — уведомления при открытых Dialog

NotificationProvider помещает сообщения в поток активного Dialog через MUI
Portal, сохраняя accessibility tree и FocusTrap. Уведомление не перекрывает
действия; его закрытие с клавиатуры возвращает focus внутрь Dialog. Вне Dialog
используется штатный snackbar-слой темы. Подробности, воспроизведение и состав
отдельного изменения — в [протоколе P2-1](./stage12-p2-notifications.md).

### P2-2 — настоящий preflight без interception

В tests/real отсутствуют route/fulfill/HAR/Fetch interception. Метрика блокируется
CDP Network.setBlockedURLs на каждой странице до goto, включая ADMIN. Все
прежние 33 real-сценария повторены вместе с четырьмя новыми desktop/mobile
browser CRUD и 401→refresh probes. Подробнее — в
[протоколе P2-2](./stage12-p2-network.md).

В четырёх новых сценариях полного повтора CDP сохранил 76 безопасных backend
network entries, включая 36 OPTIONS: **34 × 200, 2 × 403, 0 × 204**. Оба 403 —
refresh с правильными Origin localhost:3000, POST и x-refresh-token. Read-only
Docker logs подтверждают достижение сервера: 5 строк OPTIONS refresh, 14 login,
24 product (счётчики включают адресный и полный прогоны, не число уникальных
OPTIONS). URI query/headers/body не экспортировались. POST refresh после отказа
не выполнен, retry отсутствует, сессия завершается. Это подтверждение дефекта
backend v1.36, не успешный recovery. Прежние browser PASS теперь перепроверены
без автоматического preflight; прямые API-сценарии также повторены.

### Точные проверки 27.10.2026

Свежий production standalone: **VlqBTxnS53OJpmJzON3t2**. Real origin строго
http://localhost:3000, API localhost:8081. Отдельный mock standalone 3100 и SSR
fixture 3101 используются только UI-регрессиями; real-контексты к ним не обращаются.
После проверок mock standalone 3100 и fixture 3101 остановлены. Реальный
standalone 3000 и локальный SMTP sink 2525 оставлены для адресного VP.

| Проверка | Результат | Отчёт в .cache/backend-stage12/ |
| --- | --- | --- |
| Build, lint, typecheck, architecture | PASS, exit 0 | p2-build-final.log, p2-lint-final.log, p2-typecheck-final.log, p2-architecture-final.log |
| ESLint изменённых browser/real specs и helper | PASS, exit 0 | Вывод CLI в сессии |
| Новые уведомления + существующие mobile auth | 8 PASS, 0 FAIL/skip/flaky, 18.725 s, workers=2/retries=0 | p2-notifications-final.json/log |
| Смежные notification/auth/session/open-forms/user-products | 50 PASS, 0 FAIL/skip/flaky/errors, 63.884 s, workers=2/retries=0 | p2-targeted-regression.json/log |
| Существующий mobile overlay/Reset с настроенным SSR fixture | 1 PASS, 0 FAIL/skip/flaky, 5.114 s, workers=1/retries=0 | p2-mobile-reset-configured.json/log |
| HTTP smoke реального standalone | 15 PASS, 0 FAIL/skip, 6.750 s | p2-smoke.log |
| Новые реальные browser CORS/CRUD, отдельно | 4 PASS, 0 FAIL/skip/flaky/errors, 19.128 s, workers=1/retries=0 | p2-browser-cors.json/log |
| Полный real повтор: прежние 33 + новые 4 | **36 PASS / 1 FAIL**, 0 skip/flaky/errors, 184.920 s, workers=1/retries=0 | p2-real-final.json/log |

Единственный FAIL — прежний контрактный тест, ожидающий разрешённый
X-Refresh-Token: backend OPTIONS возвращает 403. Новый passing probe явно
проверяет этот отказ и logout, не заменяет контрактный FAIL на PASS. Прежние
реальные login/USER→ADMIN denial, mobile details, обращение→ADMIN→возврат,
межаккаунтный кэш, production MinIO/optimizer и оба публичных GIVEAWAY start/end
прошли без interception. API-роли/валидация/конкуренция/решения также повторены.

8 PASS входят в более широкий набор 50 PASS, а четыре адресных real-теста входят
в полный повтор 37; эти числа не суммируются как уникальные сценарии. Полный
mock/model 1085 PASS — исторический результат; заново весь набор не запускался.
Первый новый UI-прогон выявил потерю focus (2 PASS / 2 FAIL), исправленную без
ослабления assertions. Первый вызов mobile-overlay с внешним TEST_BASE_URL не
исполнил сценарий из-за отсутствующего PLAYWRIGHT_FIXTURE_API_URL; после задания
существующего SSR fixture он прошёл. Skip/timeout/retries в коде не добавлялись
и не ослаблялись. Новые сценарии не используют произвольные задержки.

### DEV-данные и self-review

До записей подтверждены текущий immutable backend v1.36, локальные DB/S3 и SMTP
host.docker.internal:2525; запущен только существующий локальный sink, backend
и Compose не менялись. Снимки p2-data-before/after.json, summary и manifests
сохранены локально без приватных значений. За оба real-запуска создано 22 товара
(ID 152–173), 30 заказов (164–193), 15 обращений (81–95), 10 изображений (150–159).
Четыре собственных CRUD-товара 152/154/168/170 удалены через реальный API;
последующий GET вернул 404. Остальные fixtures оставлены для аудита.

Счётчики: products 145→167, orders 163→193, cases 80→95, images 84→94.
Прежние S12-записи и исходные заказы 1–9 не изменились. Новых OPEN-обращений и
включённых тестовых GIVEAWAY нет. SMTP: 0 сообщений / 0 получателей. Сброса БД,
массовых удалений, новых volumes или удаления ORDER evidence не было.

Self-review и diff-check выполнены: два набора содержат 15 файлов, assertions
сохранены, API interception в tests/real отсутствует. Проверены 114 локальных
ссылок в 9 документах, битых ссылок нет. В diff не найдены известные локальные
секреты и явные JWT/private-key/token шаблоны; это ограниченная проверка, не
универсальная гарантия. Локальные env, cache/logs/manifests, browser-артефакты
и прежний пользовательский Compose не включаются в изменения P2.
Изменения разделены на два коммита без общих файлов: сначала P2-1 (4 файла),
затем P2-2 (11 файлов), содержащий общий итоговый протокол stage12-results.md.
Второй коммит также актуализирует план, API/auth, testing, контракты и открытые
backend-требования. Код и тесты после принятых прогонов не менялись; при фиксации
уточнена только документация. Готово к заключительному независимому адресному VP.
Пользовательский Compose в коммиты не включён. Push, merge и rebase не выполнялись.
Backend CORS и redaction остаются открытыми; real-итог 36 PASS / 1 FAIL сохранён.
