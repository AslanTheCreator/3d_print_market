# Testing

## Локальные товары бота

`scripts/seed-agent-products.mjs` создаёт два товара с префиксом `[ТЕСТ]`
на фиксированном локальном backend `http://localhost:8081`. Существующий активный
бот выбирается явно; ADMIN_LOGIN и ADMIN_PASSWORD загружаются из `.env.local`.

```powershell
node --env-file=.env.local scripts/seed-agent-products.mjs --agent-id=2
node --env-file=.env.local scripts/seed-agent-products.mjs --agent-id=2 --write
```

Без `--write` выполняются вход, чтение и предварительный вывод. При записи
администратор выдаёт токены выбранному боту, затем скрипт вызывает
`POST /agent/products` с токеном бота. Используются минимальные сроки,
подтверждённые ответами backend: access 15 минут, refresh 30 дней. Токены
остаются только в памяти процесса; refresh не используется. Скрипт не меняет
браузерную сессию и не печатает пароли или токены.

Товары создаются без изображений, с существующей категорией «Аниме фигурки»
и демонстрационными ссылками на зарезервированный домен `example.invalid`.
Проверка по externalUrl пропускает ранее созданные записи, не перезаписывая
ручные изменения. Не запускайте несколько экземпляров одновременно: серверная
идемпотентность не гарантирована. После сетевой ошибки запись автоматически
не повторяется; сначала проверьте список товаров. Изменение externalUrl у
тестового товара лишает скрипт возможности распознать его при следующем запуске.

Проверено 01.10.2026 на локальном backend: для figovBaron (ID 2) созданы товары
21 и 22, оба ACTIVE / EXTERNAL_PRODUCT, count=null, prepaymentAmount=null.
Контрольное чтение подтвердило владельца; повторный запуск не создал дубликатов.
Это проверка создания и чтения товаров, а не оплаты, заказов или загрузки файлов.

## Административная панель

`tests/e2e/admin.spec.ts` и `admin-extended.spec.ts` используют mock API из `helpers/admin.ts`. Проверяются
доступ guest/buyer/admin, выход и повторный вход, отсутствие витринного chrome
и аналитики, noindex, ограничение fan-out, частичная выдача, полные payload
редактора с count=0/null, отказ чтения связей, повтор только восстановления,
ACCOUNT_NOT_FOUND и ошибка чтения после создания реквизитов. Заказы проверяют
корневые суммы при количестве >1 и предоплате 0/>0, sellerId в admin URL,
валидацию SHIP, сохранение ввода после отказа, проверку неопределённого результата
без повторного действия и авторизованное чтение изображений с retry.
Responsive-проверка охватывает 320/393/599/600/768/899/900/1376 px. Дополнительные
проверки включают четыре действия, ошибки 403/409/500, пустую следующую страницу,
постраничную сверку неопределённого результата, CRUD контактов, точный payload
профиля, предотвращение потери ввода, изменение imageIds без DELETE файла и
клавиатурное меню. `admin-session-model.spec.ts` проверяет различие обновления
токена и смены аккаунта. Снимки трёх разделов сохраняются в test-results.
Также проверяются redirect при 401 профиля, сверка потерянного ответа создания
и запрет повторного действия из устаревшего списка после ошибки перечитывания.

Запуск: `npx playwright test admin --project=chromium`.
Для изменения админки выполняются также lint, typecheck, architecture:check,
build, HTTP smoke и регрессия общего кабинета/auth. Все e2e-записи выполняются
только на mock API. Успех тестов не заменяет приёмку на реальных изолированных
товарах и заказах: набор необходимых данных описан в
[backend-plan.md](./backend-plan.md#проверка-результата).

## Команды

Stage 23: `npx playwright test controls-focus accessibility-authenticated-controls accessibility-interactions open-forms save-confirmation --project=chromium`
и `npx playwright test accessibility-touch-targets.mobile --project=mobile-chromium`.
`controls-focus.spec.ts` проверяет фокус первого ошибочного native input в формах
пароля, профиля и обычного/компактного адреса, keyboard submit, переключение
видимости пароля и сохранение autocomplete hints. Отзыв имеет связанные видимые
подписи textarea/группы рейтинга и описания ошибок; отправка работает с клавиатуры.
Продление и ссылка товара имеют отдельные Tab stops без button внутри anchor:
Enter/Space дают один POST без перехода, Ctrl+click открывает ссылку в новой вкладке.
Для меню кабинета измеряются computed contrast значимой иконки (≥3:1), видимый
focus и target ≥44×44 px в normal/focus/hover. Обязательны lint, typecheck,
architecture:check, build, HTTP smoke и общая e2e-регрессия order UI.
API подменены; реальный backend и autofill менеджером паролей не проверяются.

Stage 22: `npx playwright test catalog-filter-empty accessibility-interactions read-recovery --project=chromium`.
`catalog-filter-empty.spec.ts` проверяет полный и односторонние диапазоны,
повторное открытие без подстановки доступных границ, Apply/cancel/reset,
конечность чисел, Tab/Shift+Tab/Escape и возврат фокуса. Mobile-поверхность
проверяется на 320 px, коротком viewport и при увеличении текста до 200%:
именованный dialog, прокрутка и достижимость полей/действий.
Пустые поиск/категория имеют контекст и работающий сброс/переход; нейтральный
текст не утверждает отсутствие предзаказов. Loading/error не становятся empty,
ведущая карточка главной сохраняется. Обязательны lint, typecheck,
architecture:check, build и HTTP smoke. API подменены.

Stage 20: `npx playwright test search-input admin --project=chromium`.
`search-input-model.spec.ts` исполняет исходные hooks с управляемыми snapshots,
React effects и таймерами: delayed/out-of-order URL acknowledgements, быстрый ввод,
совместные изменения фильтров, Enter/clear/unmount, история и отмена debounce.
Подсказки 3 → 1 проверяются также с Enter до выполнения reset effect.
`search-input.spec.ts` проверяет задержанные RSC-переходы, сохранение query params,
сброс страницы, Back/Forward и подсказки 3 → 1/0 после refetch на 393/1280 px.
Обязательны lint, typecheck, architecture:check, build и HTTP smoke;
общая auth-регрессия — `auth-return-path.spec.ts`. Все API подменяются.

Stage 19: `npx playwright test auth-return-path --project=chromium`.
Spec проверяет гостевые cart/favorite из каталога и деталей товара на 393/1280 px:
отмена диалога, login/register с переключением форм, возврат на исходный route/query
и отсутствие автоматической записи. Sanitizer и браузерный вход отклоняют внешние,
protocol-relative и auth-loop redirect. Сохраняется покрытие checkout/favorites.
Обязательны lint, typecheck, architecture:check, build и HTTP smoke.
API подменяются; реальный backend не проверяется.

Stage 18: `npx playwright test list-mutations private-data-model cart-quantity-store-model --project=chromium`.
`list-mutations-model.spec.ts` исполняет настоящие entity hooks и TanStack
mutations с управляемыми promises: A fail после B success, rollback своей
позиции/revision, optimistic add из следующей infinite page без дублей,
refetch после последней операции, нормализация ошибок и тишина при cancellation
или завершении scope. Проверяются DELETE failure + успешный GET корзины,
повтор удаления и синхронный lock быстрых вызовов.
`list-mutations.spec.ts` проверяет optimistic иконку при pending POST,
ошибку DELETE после unmount карточки избранного, один alert и успешный retry,
удаление корзины из каталога и checkout с успешным контрольным чтением.
Обязательны lint, typecheck, architecture:check, build и HTTP smoke.
Все записи используют mock API; реальный backend не проверяется.

Stage 16: `npx playwright test infinite-recovery-model read-recovery route-boundaries product-search-session core-images --project=chromium`.
`infinite-recovery-model.spec.ts` исполняет настоящий InfiniteQueryObserver,
entity hook и effect автозагрузки с видимым sentinel: `retry:false` и один retry,
пауза после фонового успеха, ручное восстановление, category/name/participant/price,
session и sort query keys, включая возврат к прежнему ключу.
`read-recovery.spec.ts` покрывает initial/tail/background failure всех пяти
infinite consumers, предел запросов при видимом sentinel, сохранение DOM карточек
и scroll position, ручной retry хвоста, паузу после автоматического успешного
refetch и смену ценового фильтра. Отдельно проверяются client GET retry деталей,
SSR route refresh с восстановлением существующего cache, invalid ID без retry
и pending/recovery профиля на desktop/mobile ширинах.
SSR fixture product 924 управляется только тестовым `/__test/product-recovery`.
Обязательные проверки: lint, typecheck, architecture:check, build, HTTP smoke
и полный `npm run test:e2e`. API подменены; реальный backend не проверяется.

Stage 15: `npx playwright test core-images own-product-purchase user-products-stock order-details image-identity open-forms private-data --project=chromium`.
`core-images.spec.ts` проверяет header-only без metadata, общий core cache
шапки/списков, локальный fallback/retry профиля, заказов и собственных товаров,
сохранение ввода профиля, показ товаров по 12 и проверку sellerId при отказе
аватара и самого профиля. Retry картинки не повторяет core GET/POST.
Дополнительно: `dashboard-home.mobile.spec.ts`, полный `npm run test:e2e`,
lint, typecheck, architecture:check, build и HTTP smoke. Все API подменены;
эти сценарии не подтверждают реальный backend.

Stage 10: `npx playwright test save-confirmation image-identity private-data-model --project=chromium`;
профиль: `npx playwright test dashboard-home.mobile --project=mobile-chromium`.
`save-confirmation-model.spec.ts` исполняет настоящие entity mutations с
QueryClient: успех PUT при отдельном отказе cleanup, отсутствие rollback
подтверждённого профиля, rollback при отказе PUT и invalidation публичных списков,
detail и собственных товаров только после успешных delete/extend. Cleanup
проверяется с частичным успехом, повтором только failed IDs, конкурентным retry
и завершением scope. `save-confirmation.spec.ts` проверяет оба редактора в браузере:
раздельные сообщения, сохранённый ввод, запрет повторного PUT после успеха,
cleanup-only retry и клиентский возврат в ранее загруженный каталог после
delete/extend. Все записи используют mock API; реальный backend не вызывается.

Stage 13: `npx playwright test avatar-replacement avatar-upload-model save-confirmation --project=chromium`.
`avatar-upload-model.spec.ts` исполняет hook с контролируемыми promises: успешная A
и отказ B, невалидный файл, reset во время upload, новый выбор/удаление и смена scope.
`avatar-replacement.spec.ts` проверяет preview и отправленный ID в браузере,
ошибку/retry сохранения профиля, пустой upload response, отсутствие DELETE при ошибке,
явное удаление, запрет programmatic submit во время upload и late success после unmount.
`save-confirmation` сохраняет покрытие PUT/cleanup error/retry. Выполняются также
`dashboard-home.mobile.spec.ts`, полный `npm run test:e2e`, build и HTTP smoke.
Все записи выполняются на mock API.

Stage 14: `npx playwright test open-forms order-dialog-lifecycle-model order-payment order-details admin --project=chromium`.
`open-forms.spec.ts` проверяет reconnect → failed refetch → retry с открытой оплатой
на 393/1280 px, сохранение чека и комментария, запрет записи по устаревшему статусу,
settlement pending-оплаты, dirty admin-редактор после отказа/невалидных связей,
Escape/backdrop/крестик при pending cancel/review и сохранение ввода для повтора.
Быстрое повторное открытие отзыва не сбрасывает новый текст; model spec проверяет
поздний success и exit старого открытия, включая unmount. Дополнительно выполняются
`orders.mobile.spec.ts`, полный `npm run test:e2e`, build и HTTP smoke.
Все записи используют mock API; эти проверки не подтверждают реальный backend.

Stage 12: `product-publication-model.spec.ts` проверяет настоящие mutations с
QueryClient: синхронный lock при повторном вызове и пересоздании handler, ожидание
записи/cleanup, повторную проверку readiness, retry после отказа, неизменный snapshot,
late success/unmount, отмену таймера и защиту новой ревизии черновика.
`product-publication.mobile.spec.ts` проверяет create/edit с отложенными ответами,
Enter/programmatic submit, блокировку всех редактирующих controls на mobile/desktop,
сохранение ввода после отказа, обновление baseline до cleanup и новый экземпляр после
клиентского перехода. Выполняются также `create-product.mobile.spec.ts` и полный
`npm run test:e2e`; все записи используют mock API.

- **`npm audit --omit=dev --audit-level=high`** — проверка runtime-зависимостей, обязательная в Frontend CI после `npm ci`.
- **`npm run lint`** — ESLint для `app` и `src`.
- **`npm run typecheck`** — `next typegen` и TypeScript.
- **`npm run architecture:check`** — FSD-проверка Steiger для `src`.
- **`npm run build`** — production build.
- **`npm run test:smoke`** — HTTP smoke для уже запущенного приложения.
- **`npm run test:e2e`** — Playwright; без `TEST_BASE_URL` запускает dev server.
- **`npm run test:e2e:mobile`** — только curated mobile Chromium scenarios.
- **`npm run test:standalone`** — smoke и e2e на standalone build.
- **`npm run test:e2e:ui`** — интерактивный Playwright UI.

Steiger применяет к `src` recommended FSD rules, кроме
`fsd/insignificant-slice`: эвристика неприменима, поскольку фактический app
layer находится в корневом `app/`. Этот каталог не входит в автоматическую
проверку, поэтому его импорты и route-композиция проверяются вручную.

### Важно

Не выполняйте повторно дорогостоящие проверки после каждого промежуточного редактирования.
Сначала завершите логическое изменение, а затем подтвердите его один раз.

If a validation command fails, investigate the failure before rerunning it.
Do not repeatedly rerun the same expensive command without making a relevant change.

## Выбор проверок

После обновления зависимостей проверять установку через `npm ci`, runtime audit
и production build. Закреплённые версии в `overrides` обновляются вместе с
`package-lock.json`: `npm audit fix` не снимает такие ограничения автоматически.

Для большинства code changes:

```bash
npm run lint
npm run typecheck
npm run architecture:check
```

Для routes, server/client boundaries, env и production behavior дополнительно:

```bash
npm run build
```

Для auth, checkout, форм, redirects и browser behavior запускать релевантные e2e. Production-like полный прогон:

```bash
npm run build
npm run test:standalone
```

`test:standalone` копирует `public` и `.next/static` в standalone runtime,
поднимает локальный SSR API fixture и сервер приложения, запускает smoke и
оба Playwright-проекта, затем останавливает оба процесса.

## Smoke и E2E

Smoke находятся в `tests/smoke`, e2e — в `tests/e2e`.

`test:smoke` ожидает запущенное приложение и по умолчанию использует `http://localhost:3000`. Другой стенд задаётся через `TEST_BASE_URL`:

```powershell
$env:TEST_BASE_URL="https://test.example.com"
npm run test:smoke
npm run test:e2e
```

Локальный Playwright server можно переопределить через
`PLAYWRIGHT_WEB_SERVER_COMMAND`, порт — через `PLAYWRIGHT_PORT`. Готовность
сервера проверяется по нейтральному runtime route `/api/config`.
Порт SSR fixture задаётся через `PLAYWRIGHT_FIXTURE_API_PORT`, по умолчанию это
порт приложения плюс один. Fixture реализует подтверждённые контрактом
`GET /product/901`, `GET /product/902` (внешний товар с неограниченным остатком)
и `GET /images/metadata`; неизвестные запросы возвращают
JSON `404`. При запуске против произвольного `TEST_BASE_URL` зависящие от
fixture сценарии пропускаются, если `PLAYWRIGHT_FIXTURE_API_URL` не задан явно.

Для финансового отображения SSR fixture также предоставляет `GET /product/910`–`915`:
обычные товары и предзаказы с дробными суммами в RUB/USD/EUR.
`financial-display.spec.ts` проверяет обе карточки (каталог и собственные товары),
детали, корзину/checkout и диалоги предоплаты и остатка по этой матрице, а также
нулевые, целые и дробные значения общего formatter. Регрессия этапа B10:
`npx playwright test financial-display order-payment-model --project=chromium`.
Все данные локальные; реальные оплаты не выполняются.

Тесты с реальным backend требуют подходящих env и тестовых данных. Секреты из `.env.local` не выводятся в логи.

`safe-diagnostics.spec.ts` проверяет console arguments в development и production
на синтетических секретах в headers, body, params, вложенных details и сообщениях.
Проверяются serializer, HTTP/config/refresh failures, auth store, таймер обновления
и mutation callbacks. Console calls из `app`/`src` также исполняются отдельно
с синтетическим error для проверки всех точек вывода, включая UI handlers и boundaries;
это не браузерное воспроизведение их lifecycle. Проверки сохраняют полезные
status/code и исключают query/hash/credentials из маршрута. Backend не вызывается.

Регрессия refresh: `npx playwright test session-lifecycle refresh-queue-model admin-session-model safe-diagnostics --project=chromium`.
`session-lifecycle.spec.ts` проверяет браузерный login/refresh/logout на mock API.
`refresh-queue-model.spec.ts` исполняет настоящие session store/API, token manager
и Axios interceptors с управляемыми promises, таймерами и mock transport:
общий timer/init/401 refresh, поздний success/error после logout/login,
timeout/abort первого и ожидающих запросов, продолжение живой очереди,
поздний 401 и независимость pending refresh разных поколений. Проверяются
токены, состояние, таймеры и фактическое число отправок, включая POST.
Это не проверка реального backend.

Stage 04: `npx playwright test auth-boundaries session-lifecycle auth-return-path refresh-queue-model safe-diagnostics admin-session-model --project=chromium`;
существующие диалоги: `npx playwright test auth-dialogs.mobile --project=mobile-chromium`.
`auth-boundaries-model.spec.ts` проверяет lifecycle с отказами get/set/remove
и доступа к storage, memory fallback, отсутствие unhandled rejection и секретов
в persistence; также матрицу некорректных 403/429 для login/verify/resend,
включая NaN/Infinity и корректные специальные ошибки.
`auth-boundaries.spec.ts` проверяет browser cookies и auth при отказах storage,
восстановление после ошибок, нулевой/дробный cooldown, resend и verify на mock API.

Регрессия Stage 05: `npx playwright test http-preparation session-lifecycle refresh-queue-model safe-diagnostics auth-boundaries --project=chromium`.
`http-preparation-model.spec.ts` исполняет настоящие Axios interceptors с
управляемыми fetch/body promises и таймерами: deadline, отмена transport,
single-flight config, повтор после ошибки, отклонение невалидного URL,
защита кэша от позднего ответа, независимая отмена consumer, dev fallback/SSR
и неизменный адрес leader/queue при replay для absolute/root-relative base.
`http-preparation.spec.ts` проверяет восстановление login после timeout config
и конкурентный refresh через same-origin proxy в браузере на mock API.

## Каталог нового backend

`product-search-session.spec.ts` проверяет отсутствие `includeAdult`, bearer
header для авторизованного поиска, гостевую выдачу, ответы для несовершеннолетней
и взрослой mock-сессий, недействительный токен и обновление кэша после входа
и смены аккаунта. `adult-category.spec.ts` и мобильный сценарий категорий
проверяют локальное предупреждение без передачи возрастного флага серверу.

`external-purchase.spec.ts` покрывает покупку `EXTERNAL_PRODUCT` из поиска
и избранного, отсутствие внешнего перехода, гостевую авторизацию, запрет
покупки своего товара и SSR-детали с `count=null`. `checkout-stock.spec.ts`
проверяет изменение количества без лимита, доставку разных продавцов и
создание обычного заказа на внешний товар; ошибка `PRODUCT_NOT_PURCHASABLE`
остаётся обрабатываемой без предложения перейти в Telegram. Read-only
управление внешними товарами проверяется в `user-products-stock.spec.ts`.
Все операции записи в этих сценариях выполняются на mock API.
`checkout-preorder.spec.ts` также проверяет внешний товар с предоплатой и без неё: предварительные суммы и payload создания заказа. `order-payment-model.spec.ts` и `order-payment.spec.ts` проверяют готовые суммы заказа при количестве больше одного и намеренно отличающихся полях товара, в том числе на мобильном viewport. `order-details.spec.ts` проверяет тексты подтверждения и перечитывание обоих вариантов следующего статуса.

## Accessibility и touch

Playwright-регрессия для accessibility проверяет:

- видимые labels auth-полей, программную связь ошибок, пять именованных OTP
  inputs и динамические имена password visibility;
- keyboard-управление avatar upload/delete, счётчиками количества, очисткой
  цены, fullscreen-галереей и раскрываемыми settings cards;
- отсутствие вложенных `button` в изменённых составных controls и нативные
  disabled-состояния;
- mobile touch targets самостоятельных controls не меньше `44×44 px`;
- размеры application shell: compact top bar `56 px`, medium top bar `64 px`,
  desktop header `119 px`; safe-area inset добавляется поверх этих значений;
- нижнюю навигацию `64 px` плюс `safe-area-inset-bottom` и отсутствие
  перекрытия последнего доступного элемента страницы.

ESLint требует явное accessible name у `IconButton`. Общего automated
accessibility scan (например, axe по матрице routes/states) пока нет.

## Mobile application shell

`theme-colors.spec.ts` проверяет на `320/393/1280 px` контраст гостевых кнопок,
подсказок, ссылок, подписей шапки и фокуса; активный цвет мобильной навигации
после CSS cascade; различимые обычную покупку и голубой предзаказ, их hover
и открытие гостевого диалога. Проверяются отсутствие переполнения кнопки
предзаказа и пересечения его бейджа с избранным. API каталога подменяется fixture-данными.
Это адресные regression checks, а не полный accessibility scan сайта.
Warning-сценарии дополнительно проверяют тёмный текст бейджей и кнопок
продления, hover, а также янтарные акценты и читаемые счётчики в сводках
«Покупок» и «Продаж». Подтверждение продления в тесте не отправляется.

`mobile-chrome-model.spec.ts` table-driven тестом проверяет pathname resolver:

| Маршруты                                                                  | Mobile chrome | Bottom nav | Mobile footer |
| ------------------------------------------------------------------------- | ------------- | ---------- | ------------- |
| `/`, `/catalog/search`, `/catalog/category/**`, `/favorites`, неизвестный | browse        | да         | да            |
| `/sellers/**`                                                             | context       | да         | да            |
| `/catalog/:id/detail`                                                     | context       | нет        | нет           |
| `/dashboard/**`                                                           | account       | да         | нет           |
| create/edit product, авторизованный `/checkout`                           | focused       | нет        | нет           |
| гостевой `/checkout` после инициализации сессии                           | browse        | да         | нет           |
| `/auth/login`, `/auth/register`                                           | auth          | нет        | нет           |
| about, contacts и legal routes                                            | context       | нет        | да            |

Model-тест также фиксирует приоритет create/edit перед общим dashboard matcher,
category перед динамическим product detail, fallback для Back и нормализацию
trailing slash.

На гостевом `/favorites` mobile footer сокращён до контактов, юридических ссылок
и копирайта. `guest-shopping.mobile.spec.ts` проверяет оба гостевых экрана на
`320/375/393/599/600/768/899/900/1280 px`: заголовки, отсутствие overflow,
размеры кнопок, доступность перехода в каталог над нижней навигацией, active state,
отсутствие hydration errors и сохранение desktop-композиции.
`auth-return-path.spec.ts` проверяет на `393/1280 px` возврат в корзину и избранное
после переключения login/register, входа и регистрации с подтверждением почты.
Запросы авторизации и регистрации подменяются mock API. Негативные model cases
покрывают внешние URL, backslash, закодированные варианты, нормализацию пути и
auth loops; browser case проверяет удаление небезопасного redirect при переходе
между формами.

Для корневого `/dashboard` resolver отключает отдельное меню разделов;
на вложенных account-маршрутах оно остаётся доступным.

Browser-регрессия mobile shell должна выполняться на `320`, `393`, `599`,
`600`, `768`, `899` и `900 px` и проверять:

- top bar, footer, нижнюю навигацию и active state по route-матрице;
- размеры `56/64/119 px`, CSS offsets и safe areas;
- отсутствие horizontal overflow и перекрытия контента;
- fullscreen search без категорий, сохранение query и keyboard navigation;
- categories dialog с поиском сверху, drill-down, Back/Escape, retry и возврат
  фокуса;
- отсутствие hydration mismatch и desktop-регрессию header, inline search и
  categories drawer.

Safe-area сценарии используют `Emulation.setSafeAreaInsetsOverride`. Нижняя
навигация не должна запускать order/product запросы только ради profile badge.

`mobile-categories.mobile.spec.ts` проверяет загрузку taxonomy, error/Retry,
empty state с доступным поиском, переход в leaf-category и progressive link
при modified click, а также отступы age gate и прокрутку на коротком экране.
Сценарии shell также покрывают Back/Forward внутри меню,
закрытие desktop overlays при переходе ниже `900 px` и повторный вход после
выхода через мобильное меню профиля.

`dashboard-home.mobile.spec.ts` покрывает прямые ссылки главного кабинета и их
порядок, доступность навигации при загрузке/ошибке профиля и retry, отсутствие
мобильных плиток и прогресса, пустые и неполные данные рейтинга. Проверяются
touch targets, keyboard focus, отсутствие overflow на граничных ширинах,
desktop-композиция, сохранение ввода при resize, возврат и сохранение формы
через mock API, выход и свежие данные после повторного входа. На `393×727`
профиль и первые четыре ссылки должны помещаться над нижней навигацией;
последняя кнопка должна быть доступна после прокрутки.

## Настройки и безопасность

Мобильные настройки и безопасность проверяются в
`settings-security.mobile.spec.ts` с mock API из `helpers/settingsAccount.ts`:

- четыре видимые вкладки, текущий заголовок, активный «Профиль» и сохранённое
  меню вложенного маршрута; отсутствие overflow на `320/393/599/600/768/899/900 px`;
- skeleton, ошибка и retry адресов, доставки, оплаты, связи и справочника валют;
  пустые данные отличаются от ошибки, запись незагруженной формы недоступна;
- сохранение ввода между вкладками, при resize и фоновом refetch; частичный
  успех, повтор только оставшихся изменений и отсутствие дублирующего create
  после ошибки итогового чтения;
- disabled controls при сохранении, пометка удаления, работа панели сохранения
  над нижней навигацией, адресный CRUD с подтверждением удаления;
- password autocomplete, постоянное требование к паролю, keyboard visibility,
  `44×44 px` для иконок, валидация, ошибка с сохранением ввода и очистка после успеха.

Смена пароля и запись настроек в этих сценариях выполняются только на mock API.
Реальные клавиатуры и password managers требуют отдельной проверки на устройстве.

`settings-empty-lists.spec.ts` проверяет доменные `404` при отсутствии реквизитов
и контактов: доступную пустую форму, создание первой записи, её загрузку после
перезагрузки страницы и удаление последней записи. Отдельно проверяются
`401`, `403`, посторонний `404`, `500` и сетевая ошибка: форма не открывается
для редактирования, повторная загрузка восстанавливает сохранённые настройки.
Все записи выполняются на mock API.

## Новый адрес в checkout

`checkout-address-model.spec.ts` проверяет однозначное сопоставление нового
активного адреса с вводом, нормализацию пробелов/регистра, исключение старых и
удалённых адресов, отсутствие выбора по порядку или максимальному ID.

`checkout-address.spec.ts` с mock API покрывает создание первого и дополнительного
адреса, отмену без потери выбора товаров/доставки/комментария, точные payload
адреса и заказа, блокировку оформления во время сохранения и перечитывания,
сохранение ввода после отказа `POST`, повтор только `GET` после подтверждённого
создания и ошибки загрузки, возврат к списку без сохранённого выбора после
ошибки перечитывания, ручной выбор при неоднозначном результате и форму без
горизонтального overflow на viewport `393×727`.
Правила сценария описаны в [api-and-auth.md](./api-and-auth.md#адрес-доставки-в-checkout).

## Мобильная корзина и доставка

`checkout-cart.mobile.spec.ts` проверяет карточки на ширинах
`320/375/393/599/600/768/899/900/1376 px`: отсутствие horizontal overflow,
длинные названия, суммы предзаказа и touch targets. Проверяются независимые
способы доставки продавцов, применение и отмена черновика, Escape и возврат
фокуса, сохранение выбора при resize и исключении товаров, суммы доставки,
loading/error/retry/empty и единственный бесплатный способ. Коррекция остатка
проверяется через mock `PUT` и контрольное чтение корзины; исключение товара
с нулевым остатком не отправляет изменение количества.

Существующие `checkout-address.spec.ts` и `checkout-delivery-groups.spec.ts`
выбирают доставку через новый диалог и продолжают проверять сохранение выбора
и соответствие `transferId` продавцу при оформлении.

## Мобильные покупки, продажи и создание товара

`orders.mobile.spec.ts` проверяет единственный список и приоритет заказов, быстрые
фильтры обеих ролей, применение/отмену/сброс фильтров, empty/loading/error/retry,
полное название в деталях и историю с `null`-комментарием. Проверяются ширины
`320/393/599/600/768/899/900`, отсутствие overflow, первый action над нижней панелью,
touch targets и keyboard focus. `order-details-model.spec.ts` дополнительно
проверяет мобильный приоритет и фильтр подтверждений без изменения входного массива.

`create-product.mobile.spec.ts` проверяет поиск и множественный выбор категорий
с подтверждением, сохранение значений при resize, расположение цены и валюты,
панель публикации и переход к незаполненному полю. Mock API покрывает публикацию
обычного товара и предзаказа, сохранение ввода после ошибки, загрузку/удаление фото,
восстановление черновика и retry фото, отказ localStorage, retry категорий и
подтверждение очистки с возвратом без потери данных. Уведомление об ошибке не должно
перекрывать повторную публикацию. Мутации выполняются только на mock API.

`mobile-chrome-model.spec.ts` фиксирует заголовки покупок, продаж и создания,
сохраняя прежние правила «Моих товаров» и редактирования. Регрессия shell и
авторизованных контролов проверяется существующими `mobile-rendering.mobile.spec.ts`
и `accessibility-authenticated-controls.spec.ts`. Реальную экранную клавиатуру
и поведение Safari следует дополнительно проверять на устройстве: resize Chromium
не заменяет такую проверку.

## Order flow: этапы 1–5

Регрессия Stage 08: `checkout-submit-model.spec.ts`, `checkout-submit-lifecycle.spec.ts`,
`checkout-stock.spec.ts`, `checkout-address.spec.ts`, `checkout-delivery-groups.spec.ts`.
Lifecycle-тесты исполняют hook с настоящими QueryClient, scope и quantity store:
отложенный ответ, повторный submit/remount, смена сессии, неизвестные исходы,
проверка свежего snapshot и повтор только отказавших позиций.
Браузерные mocks проверяют явный пустой выбор после refetch/изменения количества,
удаление последнего выбранного товара, потерю ответа принятой записи, 5xx,
смешанный результат и блокировку повторного оформления после возврата из покупок.
Сценарий разрешённого Retry использует доменный отказ `400 + COUNT_INVALID`;
500 больше не моделирует заведомо безопасный повтор. После этапа выполняется
полный e2e, а также lint, typecheck, architecture:check, build и HTTP smoke.

Изменения финансового отображения и lifecycle заказа проверяются на трёх уровнях.

Model/contract tests должны покрывать:

- обычный заказ, предзаказ и `EXTERNAL_PRODUCT` с количеством `1` и больше `1`, с предоплатой и без неё;
- полную стоимость товаров, предоплату, остаток и отдельную доставку без двойного счёта;
- выбор цепочки по `order.prepaymentAmount`, а не `availability`, и отсутствие повторного умножения серверных сумм;
- активные статусы, включая `AWAITING_PREPAYMENT_APPROVAL`;
- ISO 8601, текущий `DD.MM.YYYY HH:mm:ss` и невалидные даты, одинаковый порядок при сортировке и отображении;
- единое правило safe tracking URL: только абсолютные HTTP/HTTPS адреса.

Playwright с mock API должен проверять:

- суммы, количество и тексты обычного заказа и предзаказа в checkout, карточках, деталях, оплате и отправке;
- описание последующих платёжных этапов после checkout любого товара с предоплатой;
- loading, error с retry, empty, один и несколько платёжных счетов; автоматический выбор единственного счёта и обязательный ручной выбор из нескольких;
- ошибки `403`, `409`, `500` и network failure на действиях этапов 2–5 без закрытия диалога и потери введённых данных;
- перечитывание заказов после сетевой ошибки с неизвестным результатом без имитации успешного перехода;
- повтор оплаты с тем же `imageId` после отклонённого status mutation;
- удаление только заведомо непривязанного upload при замене файла или закрытии, а при timeout — отсутствие удаления до подтверждающего refetch;
- блокировку status request для невалидного tracking URL.

Для изменений order flow выполняются:

```bash
npm run lint
npm run typecheck
npm run architecture:check
npm run build
npm run test:smoke
npm run test:e2e
```

Перед полным `npm run test:e2e` допустим запуск релевантных Playwright specs для быстрого feedback. `test:smoke` требует уже запущенное приложение, как описано выше.

На staging с реальным backend отдельно проходят обычный заказ и предзаказ с количеством больше одного по цепочке от `BOOKED` до `COMPLETED`. Проверяются роли, условный результат этапа 2, финансовый snapshot, даты с timezone, lifecycle остатка `PREORDER`, обязательность и приватность payment proof, object-level доступ к реквизитам и отсутствие дублей заказа после timeout/retry. Credentials, содержимое реквизитов и подтверждений оплаты не выводятся в отчёты и логи.

Эта матрица подтверждает только этапы 1–5. Пункты 6–7 открытия и завершения спора потребуют отдельного acceptance.

## Границы текущего набора

Состояние на 2026-09-08:

- набор включает HTTP smoke, desktop Playwright, model/contract tests и
  curated mobile Chromium scenarios;
- browser projects: Desktop Chrome и `mobile-chromium` на профиле Pixel 5
  (`393×727`, mobile UA, touch);
- `*.mobile.spec.ts` запускаются только в mobile project; desktop suite в нём
  не дублируется;
- mobile rendering покрывает SSR без JavaScript, hydration diagnostics,
  route-aware shell, сохранение DOM/state на `599/600`, `899/900`,
  `1375/1376`, смену ориентации, safe areas, horizontal overflow и overlay
  interactions;
- целевой `mobile streamed SSR fallback exposes progressive navigation without JavaScript`
  с SSR fixture проверяет именованную ссылку на главную и загрузку mobile logo
  без привязки к generated hash, затем навигацию, skeleton и его геометрию;
- проверки холодной загрузки шапки в `mobile-rendering.mobile.spec.ts` ожидают
  `logo.svg` на мобильных и `logo-desktop.webp` на десктопе, без загрузки
  логотипа другого варианта шапки;
- Lab CLS вычисляется через `PerformanceObserver` по session-window алгоритму;
  CI gate — `≤0.1`. LCP и transfer size сохраняются как диагностика, но пока
  не имеют hard budget;
- standalone-прогон 2026-07-28 дал CLS `0` для `/about` под Slow 4G /
  CPU ×4 и CLS `0` для fixture product detail. Диагностические значения этого
  запуска: LCP `784 ms` / transfer `447,368 B` для `/about` и LCP `224 ms` /
  transfer `626,659 B` для product detail; это локальные Lab-данные, не
  production field p75. Внешний тег Яндекс Метрики в E2E заменяется локальным
  пустым ответом и в transfer size не входит;
- browser-сценарии в основном подменяют API и auth cookies;
- session lifecycle покрывает initialization, login/logout, общий refresh для
  конкурентных `401`, один retry и redirect при refresh failure;
- часть `*.spec.ts` является model/contract tests без browser flow, но запускается через Playwright;
- browser API по умолчанию остаётся недоступным `127.0.0.1:9`, а SSR success
  product detail проверяется локальным fixture; real-backend сценарий не
  проверяется;
- coverage threshold, Firefox/WebKit и automated accessibility gate отсутствуют;
- CI публикует `playwright-report` и `test-results` с retention `7` дней.

Lab CLS не заменяет production field p75. Набор хорошо ловит frontend
regressions, но не является production acceptance.

## Release acceptance на staging

Перед публичным MVP один release candidate должен пройти на staging с совместимым backend и изолированными тестовыми данными:

1. register с юридическим уведомлением и ссылками, verify, login, refresh, logout и password reset;
2. seller settings с success, empty и каждой ошибкой загрузки;
3. create/edit обычного, preorder и external товара без потери contract fields;
4. image upload и приватный доступ к payment proof;
5. cart, остатки, доставка по продавцам и полный checkout;
6. buyer/seller order lifecycle, payment, shipping, cancel, review и role-based details;
7. timeout/retry/idempotency и запрет покупки собственного товара на backend;
8. anonymous adult product на главной, search, seller, related, direct detail и sitemap;
9. auth redirect sanitizer, session teardown и отсутствие cross-account cache/draft;
10. HTTP status, canonical и `noindex` для invalid/private/adult routes.

Минимальная browser-матрица публичного релиза:

- desktop Chromium;
- mobile Chromium на поддерживаемом viewport;
- WebKit/Safari для критичных buyer/auth flows;
- automated accessibility scan плюс keyboard smoke;
- отдельный mobile/desktop performance замер.

Результат staging acceptance должен быть привязан к Git SHA и immutable image digest. Без этой связи локальный или CI-прогон не является доказательством готовности конкретного production artifact.

## Границы редактора

Stage 11 проверяется `product-form-mapping`, `product-contract-v129`,
`editor-boundaries-model`, `editor-boundaries` и `route-boundaries` specs.
Они покрывают edit count 0/null/положительный, nullable admin prepayment → 0,
дробные и невалидные деньги/счётчики, loading/missing/mismatched edit target,
отсутствие неправильных GET/PUT и нормализацию admin page/agent.
`route-boundaries` проверяет SSR без JavaScript, metadata/noindex и фактический
HTTP status; 200 допустим для streamed not-found, 404 до начала потока.
Временный core/metadata отказ проверяется отдельно от отсутствующего товара.

SSR fixture содержит товары 920 (core 404), 921 (503), 922 (metadata 404),
923 (успех без изображений); `/__test/requests` предоставляет счётчики запросов
только тестового сервера. HTTP smoke использует успешный fixture product 901.
При внешнем `TEST_BASE_URL` для route specs нужно дополнительно задать
`PLAYWRIGHT_FIXTURE_API_URL` на этот локальный fixture; иначе они пропускаются.
Проверки этапа: lint, typecheck, architecture:check, build, HTTP smoke и указанные
specs; admin/dashboard/auth regression выполняется по общей матрице выше.

## Уход из dirty-форм

Stage 17: `unsaved-changes.spec.ts` проверяет add/edit адреса, профиль,
настройки, пароль и edit товара на mock API: Link header/bottom navigation,
локальный Back/Cancel, браузерные Back/Forward и reload, accept/cancel,
сохранение ввода/фото/URL, image-only dirty, блокировку upload/save и отсутствие
предупреждения после сохранения, программный поиск из header и закрытие
категорий без потери формы. `image-identity.spec.ts` явно подтверждает уход
для проверки освобождения blob URL edit; `product-publication.mobile.spec.ts`
дополнительно проверяет Back/Link при pending edit, `dashboard-home.mobile.spec.ts`
подтверждает отмену правок перед повторным открытием профиля. Проверяется отсутствие чувствительного ввода
в localStorage, sessionStorage и history state. Сценарии профиля и товара
покрывают мобильную геометрию; полный e2e включает существующие mobile specs.
`avatar-replacement.spec.ts` проверяет блокировку Back во время upload и
подтверждённый discard после завершения; прежний Back с pending больше не
размонтирует редактор. Проверки поздних upload/reset/смены scope остаются
в `avatar-upload-model.spec.ts`.
После этапа обязательны lint, typecheck, architecture:check, build,
HTTP smoke на запущенном приложении и полный `npm run test:e2e`.

## Корзина на карточках

Stage 21: `cart-card-work-model.spec.ts` проверяет одного владельца проекции,
80 query observers/два membership consumer на 40 карточек, cached mount,
одинаковый snapshot, ручное подтверждение без карточек, смену scope и teardown.
Hooks чтения исполняются с контролируемыми query/React adapters; QueryClient,
QueryObserver, quantity store и lifecycle mutation настоящие. Отдельный
`cart-quantity-store-model.spec.ts` фиксирует no-op и восстановление validation
при прежних counts, сохраняя проверки revisions/rollback.

Сравнение исполнения исходных hooks до/после для 40 карточек (80 consumers):
effects синхронизации 80 → 0, reconciliation первого snapshot 80 → 1,
quantity reads для totals 6400 → 0, чтения price для totals 3200 → 0.
Persist writes 0 → 0: persistence уже удалён в Stage 06. Это счётчики работы
в модельном прогоне, без утверждения выигрыша в миллисекундах.

`checkout-stock.spec.ts` дополнительно проверяет 40 карточек в браузере:
общие подтверждённые counts, один initial GET, rollback, stock limit и logout.
Существующие сценарии покрывают delayed PUT/GET, переход из каталога и retry
stock validation; `private-data-model.spec.ts` и `private-data.spec.ts` — изоляцию
при смене аккаунта. Запуск: `npx playwright test cart-card-work-model
cart-quantity-store-model checkout-stock private-data --project=chromium`;
также `checkout-cart.mobile.spec.ts` в `mobile-chromium`.
Обязательны lint, typecheck, architecture:check, build и HTTP smoke.
Все записи используют mock API, реальный backend не проверяется.

## Documentation-only

Если менялись только Markdown-файлы, достаточно проверить diff, ссылки и соответствие коду. Полный test suite не требуется.

## Владение приватными данными

Stage 09: `npx playwright test image-identity order-payment private-data-model --project=chromium`
и `npx playwright test create-product.mobile --project=mobile-chromium`.
`image-identity.spec.ts` проверяет пропуски первой/средней metadata, точные image IDs
в PUT/DELETE, блокировку upload при failed/pending restore, retry, очистку с поздним
restore, пустые/невалидные upload-ответы и владение blob URL при edit/create unmount.
`order-payment.spec.ts` также проверяет отказ невалидного upload и повтор того же файла
с единственным валидным ID в payment payload. API подменён; реальные файлы и платежи
на backend не создаются.

`private-data-model.spec.ts` исполняет lifecycle subscription, настоящие TanStack
mutations и hooks с управляемыми promises: logout/expiry/A → B, сохранение scope
при refresh, поздний GET, optimistic rollback, ручной refresh корзины и запрет
отправки операции старого scope. `private-data.spec.ts` проверяет в браузере
профиль B после выхода A, отсутствие чужого и legacy draft при reload,
сохранение ввода после refresh и очистку при автоматическом завершении.
`create-product.mobile.spec.ts` использует draft с подтверждённым owner.
Все API в этих сценариях подменяются; реальный backend не проверяется.
