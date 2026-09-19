# Testing

## Команды

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

## Выбор проверок

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
порт приложения плюс один. Fixture реализует только подтверждённые контрактом
`GET /product/901` и `GET /images/metadata`; неизвестные запросы возвращают
JSON `404`. При запуске против произвольного `TEST_BASE_URL` зависящие от
fixture сценарии пропускаются, если `PLAYWRIGHT_FIXTURE_API_URL` не задан явно.

Тесты с реальным backend требуют подходящих env и тестовых данных. Секреты из `.env.local` не выводятся в логи.

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

`mobile-chrome-model.spec.ts` table-driven тестом проверяет pathname resolver:

| Маршруты | Mobile chrome | Bottom nav | Mobile footer |
| --- | --- | --- | --- |
| `/`, `/catalog/search`, `/catalog/category/**`, `/favorites`, неизвестный | browse | да | да |
| `/sellers/**` | context | да | да |
| `/catalog/:id/detail` | context | нет | нет |
| `/dashboard/**` | account | да | нет |
| create/edit product, `/checkout` | focused | нет | нет |
| `/auth/login`, `/auth/register` | auth | нет | нет |
| about, contacts и legal routes | context | нет | да |

Model-тест также фиксирует приоритет create/edit перед общим dashboard matcher,
category перед динамическим product detail, fallback для Back и нормализацию
trailing slash.

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

Изменения финансового отображения и lifecycle заказа проверяются на трёх уровнях.

Model/contract tests должны покрывать:

- обычный заказ и предзаказ с количеством `1` и больше `1`;
- полную стоимость товаров, предоплату, остаток и отдельную доставку без двойного счёта;
- условный переход из `BOOKED` для `PURCHASABLE` и `PREORDER`;
- активные статусы, включая `AWAITING_PREPAYMENT_APPROVAL`;
- ISO 8601, текущий `DD.MM.YYYY HH:mm:ss` и невалидные даты, одинаковый порядок при сортировке и отображении;
- единое правило safe tracking URL: только абсолютные HTTP/HTTPS адреса.

Playwright с mock API должен проверять:

- суммы, количество и тексты обычного заказа и предзаказа в checkout, карточках, деталях, оплате и отправке;
- описание последующих платёжных этапов после checkout предзаказа;
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

## Documentation-only

Если менялись только Markdown-файлы, достаточно проверить diff, ссылки и соответствие коду. Полный test suite не требуется.
