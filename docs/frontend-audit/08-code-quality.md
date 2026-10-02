# Аудит frontend: качество кода и тестируемость

Дата: 02.10.2026. Проверяется текущая локальная frontend-реализация Figurzilla.
Production-код, конфигурация, комментарии и существующие тесты не изменялись.

## 1. Результат

Выявлено шесть замечаний: четыре Medium и два Low. Новых Critical/High
именно на этом этапе не подтверждено. Это не отменяет серьёзные проблемы
из предыдущих этапов: их приоритет и доказательства остаются в исходных отчётах.

| ID | Severity | Проблема | Effort |
| --- | --- | --- | --- |
| Q1 | Medium | Карточки товара подменяют валюту рублями | Small |
| Q2 | Medium | Дублирующий денежный formatter округляет цену и предоплату до целых | Small |
| Q3 | Medium | Устаревший assertion логотипа прерывает SSR mobile-регрессию | Small |
| Q4 | Medium | Тесты не проверяют опасные пересечения жизненных циклов auth, checkout и публикации | Medium |
| Q5 | Low | Успешные blob-превью сохраняются после ухода из редактора без владельца | Small |
| Q6 | Low | Общий public API продолжает экспортировать неиспользуемые form-hooks | Small |

Все рекомендации выполняются на frontend. Отсутствующие endpoints, серверные
возможности, предполагаемые backend validation rules и новые статусы не оценивались.

## 2. Discovery и scope

Сначала изучены `AGENTS.md`, `package.json`, `tsconfig.json`, `.eslintrc.json`,
`next.config.mjs`, `steiger.config.mjs`, `playwright.config.ts`,
`.github/workflows/frontend-ci.yml`, документы `architecture.md`,
`api-and-auth.md`, `testing.md` и отчёты этапов 01–07.

Стек подтверждён конфигурацией: Next.js App Router, React 19, strict TypeScript,
MUI/Emotion, TanStack Query 5, Zustand 5, React Hook Form, Axios и Playwright.
Runtime engines требуют Node 24 и npm 11. Отдельного unit runner в scripts нет;
model/contract-тесты уже выполняются через Playwright без browser fixtures.

Инвентаризация обнаружила 49 TS/TSX-файлов в `app`, 502 в `src`, 44 spec-файла
и четыре helper-файла в `tests/e2e`. Инвентаризация не означает построчное чтение
всех файлов: глубокий анализ выбран по связям и сигналам поиска.

Основные цепочки анализа:

- `product/model/form` → действующая форма widget → product mutations;
  поля валюты и цены → карточки, детали товара, checkout и payment UI;
- `useMultipleImageUpload` → `useProductForm` → draft lifecycle;
  создание object URL → загрузка → remove/reset/unmount;
- session store/refresh manager → Axios interceptor → auth browser tests;
  checkout payload/result helpers → orchestration hook → model/browser tests;
- `shared/lib/hooks` → public API → поиск потребителей и действующие settings hooks;
- scripts/CI → Playwright projects → SSR/mobile assertions и HTTP smoke.

По `app`, `src`, `tests` и `scripts` выполнен поиск TODO/FIXME/HACK/XXX,
workaround/deprecated-маркеров, ESLint suppression и TypeScript suppression.
Для dead-code кандидатов дополнительно проверены весь доступный текст проекта
вне документации, зависимостей и generated artifacts.

## 3. Подтверждённые проблемы

### Q1. Карточки товара подменяют валюту рублями

**Severity:** Medium.

**Файлы и место:**

- `src/entities/product/ui/ProductPriceDisplay.tsx:9–15,55,66,79` — props и вывод цены;
- `src/entities/product/ui/ProductCard.tsx:203`;
- `src/widgets/user-products/ui/UserProductCard.tsx:265` — оба потребителя;
- `src/entities/product/model/form.ts:25–39`, `ui/CurrencyField.tsx` в том же
  слайсе — существующий выбор валюты.

**Проблема.** `ProductPriceDisplay` не принимает `currency`. Обычная цена,
полная цена предзаказа и предоплата выводятся как `formatPrice(value) + " ₽"`.
Оба потребителя передают суммы без валюты, хотя продукт и форма поддерживают
RUB/USD/EUR/GBP/JPY/CNY. `CurrencyField` прямо обещает показать покупателю
выбранную валюту.

**Почему это проблема.** Теряется существующее доменное значение, а не
добавляется новая возможность API. Например, товар с `currency="USD"` и
`price=1250.75` в каталоге получает знак рубля без какой-либо конвертации.
В деталях и checkout есть formatter с валютой, поэтому один товар меняет
денежное обозначение между экранами.

**Последствия.** Покупатель неверно понимает стоимость, продавец видит
неправильную валюту своего товара. Это ошибка финансового отображения,
а не пожелание заменить символ на код.

**Исправление на frontend.** Добавить обязательную валюту в props, передать
`product.currency` из обоих потребителей и использовать существующий
`formatPrice(value, currency)` для цены и предоплаты. Не конвертировать деньги.
Добавить один параметризованный тест RUB/USD/EUR для обычного товара и
предзаказа; проверить совпадение валюты карточки с деталями/корзиной.

**Effort:** Small.

### Q2. Дублирующий formatter теряет дробную часть денег в деталях товара

**Severity:** Medium.

**Файлы и место:**

- `src/widgets/product-details/ui/productDetailsFormatters.ts:3–11` — `formatMoney`;
- `src/widgets/product-details/ui/ProductDetailsContent.tsx:128,144,161,169,244,252`;
- `src/shared/lib/utils/formatPrice.ts:1–18` — существующее форматирование;
- `src/entities/product/model/form.ts:81–89,101–109` — допускаются две цифры
  после десятичной точки.

**Проблема.** Локальный `formatMoney` использует `maximumFractionDigits: 0`,
а общий `formatPrice` с валютой сохраняет до двух десятичных знаков.
Детали округляют не только общую цену, но и «К оплате сейчас», предоплату
и остаток. Форма допускает дробные суммы, mapper сохраняет их через `parseFloat`.

**Почему это проблема.** Разные реализации одной операции уже расходятся
в пользовательском результате. Изолированный вызов фактических функций дал:
`formatMoney(1250.75, "RUB") → "1 251 ₽"`,
`formatPrice(1250.75, "RUB") → "1 250,75 ₽"`.
Это не предположение о будущих форматах backend.

**Последствия.** Обещанная сумма в карточке деталей отличается от суммы
корзины/платежа; отдельное округление компонентов предзаказа дополнительно
затрудняет сверку полной цены с предоплатой и остатком.

**Исправление на frontend.** Делегировать денежное отображение деталей
существующему общему formatter, сохраняя принятую точность. Удалить только
дублирующий денежный formatter, не перестраивая остальные helpers.
Проверить дробную цену и дробную предоплату/остаток на одних значениях
в деталях и checkout. Правила округления payload не менять.

**Effort:** Small.

### Q3. Устаревший assertion блокирует проверку SSR mobile-навигации

**Severity:** Medium.

**Файлы и место:**

- `tests/e2e/mobile-rendering.mobile.spec.ts:278–304` — тест без JavaScript;
- `src/widgets/header/ui/Header.tsx:19,149–158` — текущий SVG-логотип;
- `playwright.config.ts:66–70` — включение mobile spec;
- `.github/workflows/frontend-ci.yml:60–66`, `scripts/test-standalone.mjs` — CI-прогон.

**Проблема.** Тест требует `src` изображения с подстрокой `site`.
Header уже импортирует `logo.svg`; при локальном запуске assertion получил
`/_next/static/media/logo.bf4b7458.svg` и упал на строке 304.
Это замечание к тесту: поломка текущего логотипа не обнаружена.

**Почему это проблема.** Проверяется устаревшая деталь asset вместо
действующего ожидания. Падение происходит до assertions progressive navigation,
product skeleton и геометрии. Тест входит в общий standalone-прогон CI;
ошибка должна сохраняться там, пока загружается этот логотип. Полный CI
в рамках этого аудита не выполнялся.

**Последствия.** Регрессия прерывается по нерелевантной причине, полезные
SSR-проверки не выполняются в этом сценарии, общий тестовый gate остаётся красным.
На этапе 07 это уже наблюдалось в результатах проверки, здесь причина выделена
как самостоятельная проблема качества тестов и воспроизведена повторно.

**Исправление на frontend.** Обновить assertion под текущий SVG; для этого
SSR-сценария проверять присутствие и загрузку именованного логотипа.
Если нужен контроль выбора mobile asset, явно проверять текущий `logo.svg`
без generated hash, согласованно с уже существующим cold-load сценарием.
Не убирать остальные SSR assertions и не пропускать тест.

**Effort:** Small.

### Q4. Нет регрессии для опасных пересечений жизненных циклов

**Severity:** Medium.

**Файлы и место:**

- `tests/e2e/session-lifecycle.spec.ts:312–554`;
- `tests/e2e/checkout-submit-model.spec.ts:111–136`, `checkout-stock.spec.ts`;
- `tests/e2e/create-product.mobile.spec.ts:115–143`, `product-form-mapping.spec.ts`;
- проверяемая логика: `src/shared/api/axios/instances.ts`,
  `src/entities/session/model/authStore.ts`,
  `src/features/order-create/model/useOrderCreateSubmit.ts`,
  `src/widgets/create-product-form/model/productFormSubmit.ts`.

**Проблема.** Набор проверяет normal auth flow, общий refresh параллельных 401,
stock synchronization, payload helpers и обычную публикацию после отказа.
Он не проверяет следующие пересечения с уже найденными дефектами:

| Сценарий | Чего не доказывают имеющиеся тесты | Практически полезный новый assertion |
| --- | --- | --- |
| Refresh завершился после logout/смены аккаунта; queued write уже получил timeout | Отдельный logout и успешный shared refresh не проверяют их пересечение | Старый ответ не восстанавливает сессию; после terminal timeout не отправляется поздний POST/PUT |
| Потерян ответ создания заказа; либо после определённого отказа изменены адрес/количество | Тест helper сохраняет исходный snapshot и его object identity, но не исполняет весь retry lifecycle | Неопределённая запись блокирует слепой повтор; исправленный retry валидирует актуальный пользовательский выбор |
| Пользователь редактирует форму, пока создание товара pending | Существующий тест отвечает сразу и проверяет сохранение ввода только после 500 | Поздний успех не удаляет более новый ввод/черновик; повторный submit во время операции не создаёт второй запрос |

**Почему это проблема.** Эти проверки адресуют конкретные риски повторной
записи, чужой сессии и потери пользовательских данных, описанные в
[S2–S4](./02-server-state.md), [F2/F3/F9](./03-state-and-forms.md).
Риски повторно сверены с текущими hook/interceptor путями; новые runtime-дефекты
из одного отсутствия теста не выводятся. Прошедшие helper-тесты не подтверждают
правильность асинхронной композиции.

**Последствия.** Исправления наиболее дорогих ошибок могут регрессировать,
сохраняя зелёными существующие tests. Число тестов не заменяет проверки
жизненного цикла операции.

**Исправление на frontend.** Добавлять эти регрессии вместе с исправлениями
из указанных этапов. Для refresh-очереди использовать контролируемые promises,
таймеры и mock Axios adapter; для смены аккаунта, checkout и формы — дополнить
существующие browser fixtures отложенными ответами и счётчиком записей.
Проверять инварианты сессии, payload и сохранённого ввода, а не private refs.
Новый тестовый framework и изменения backend не требуются.

**Effort:** Medium.

### Q5. Успешные blob-превью редактора остаются без владельца после unmount

**Severity:** Low.

**Файлы и место:**

- `src/features/image-upload/model/useMultipleImageUpload.ts:66–75,98,112–119`;
- `src/widgets/create-product-form/model/useProductForm.tsx:101–104`;
- `src/widgets/create-product-form/model/useProductFormDraftState.ts:129–131`;
- `src/shared/lib/utils/fileUtils.ts:1–7`.

**Проблема.** Cleanup освобождает object URL только при `img.id === null`.
Успешная загрузка заменяет ID на число, поэтому blob-превью не освобождается.
Комментарий объясняет это восстановлением create-черновика, но hook также
используется редактором; draft effect в edit mode немедленно выходит.
После загрузки нового фото и ухода из редактора на другой клиентский маршрут
URL не передан create-черновику и не освобождён.

**Почему это проблема.** Успешный серверный ID не означает наличие владельца
локального blob. Изолированный hook harness с mock React/API выполнил загрузку,
получил `imageIds=[7]` и вызвал cleanup: `revokeImagePreview` не вызван.
Отдельного измерения browser heap не проводилось; размер эффекта не оценивался.

**Последствия.** Повторные открытия редактора и загрузки удерживают локальные
изображения до unload документа. Риск ограничен ресурсами вкладки, поэтому Low;
удаление серверных файлов здесь не предлагается.

**Исправление на frontend.** Явно определить владельца object URL. В редакторе
освобождать все созданные локально blob-превью при unmount; для create-черновика
сохранять только действительно переданные ему URL и освобождать их при
удалении/очистке. Не отзывать HTTP/data URL и не ломать восстановление черновика.
Добавить небольшой lifecycle-тест: успешная загрузка → уход из edit → revoke;
отдельно подтвердить сохранение рабочего create-черновика.

**Effort:** Small.

### Q6. Неиспользуемые form-hooks остаются в общем public API

**Severity:** Low.

**Файлы и место:**

- `src/shared/lib/hooks/useBatchForm.ts:15`;
- `src/shared/lib/hooks/useFormInitializer.ts:31`;
- `src/shared/lib/hooks/index.ts:2–3`;
- действующий lifecycle: `src/widgets/dashboard-settings/model/useSettingsDraft.ts`.

**Проблема.** Поиск имён и путей по исходникам, tests и scripts, затем
fallback-поиск по остальному тексту проекта выявил только определения
и реэкспорты обоих hooks. Settings работают через `useSettingsDraft`,
локальные модели и `useSettingsExpansion`.

**Почему это проблема.** Общий API предлагает альтернативный form lifecycle,
который уже не используется и не содержит текущего разделения dirty draft,
подтверждённой базы и восстановления после частичного сохранения.
Это конкретный dead code, а не требование объединять все формы.

**Последствия.** Разработчик может дорабатывать неиспользуемую реализацию
или выбрать её для новых settings вместо существующего рабочего пути.
Влияние на текущего пользователя и bundle size не утверждается.

**Исправление на frontend.** После контрольного поиска удалить эти два
модуля и реэкспорты. Отдельные мёртвые товарные реализации уже описаны
в [A5](./01-architecture.md#a5-неиспользуемые-товарные-реализации-создают-альтернативные-правила);
их не считать дополнительными findings этого этапа. Универсальный form framework
и массовый рефакторинг не нужны.

**Effort:** Small.

## 4. Остальные проверенные области

| Область | Оценка |
| --- | --- |
| ESLint | `npm run lint` завершился с кодом 0; текущих нарушений обязательного набора правил нет |
| TypeScript suppression | `@ts-ignore` и `@ts-expect-error` в проверенных каталогах не найдены; strict mode включён |
| ESLint suppression | Три места отключают только `@next/next/no-img-element`: Metrika pixel, payment proof и MultiImageUpload. Для pixel/blob/data preview причина понятна; отключений correctness/hooks правил нет. File-level suppression MultiImageUpload можно сузить при следующей доработке, самостоятельного дефекта от ширины suppression не доказано |
| TODO/FIXME и deprecated code | Явные TODO/FIXME/HACK/XXX/workaround/deprecated-маркеры не найдены. Это не сертификат актуальности всех dependency API: полный аудит жизненного цикла зависимостей не выполнялся. Функционально устаревшие неиспользуемые реализации учтены в Q6/A5 |
| Дублирование | Денежные formatters имеют реальное расхождение Q2. Похожий CRUD в трёх settings hooks уже разделяет общую orchestration через useSettingsDraft и имеет разные payload/validation; дополнительная абстракция ради количества строк не требуется |
| Magic/hardcoded values | Подмена валюты — Q1. Page sizes, UI dimensions, названия подтверждённых статусов, default currency и явно именованные renewal thresholds сами по себе не признаны дефектами; неподтверждённые backend limits не предлагаются |
| Сложные функции/условия | AST-эвристика дала 45 ветвлений для FavoriteButton, 42 для CreateProductFormActions, 39 для PaymentDialog, 37 для CategoryProducts. Учтены if/switch/loops/catch, ?:, &&/\|\|/??; вложенные функции оценены отдельно. Это приближение, не стандартный измеритель cyclomatic complexity. Большая часть ветвлений — UI variants, responsive styles и явные состояния; число само по себе не основание переписывать работающий код |
| Неочевидные side effects | Проверены upload cleanup, timers/callbacks публикации, interceptor replay и settings reconcile. Новый ресурсный дефект — Q5; опасные повторные записи/cleanup после успешного PUT уже подробно разобраны в этапах 02/03, без повторного увеличения числа проблем |
| Naming | Подтверждённых дополнительных ошибок, вызванных неясными именами, не найдено. Массовое переименование не предлагается |
| Testability | Чистые order/payment/payload/date/URL models доступны прямому тестированию; revisions cart store проверяются отдельно. Async hooks можно проверять существующими mock API. Главный практический пробел — Q4, а не отсутствие отдельной библиотеки unit-тестов |
| Хрупкие тесты | Конкретно воспроизведён Q3. Также найдены фиксированные ожидания 500/1000 ms в accessibility/gallery/mobile tests и ожидание приватного `__reactProps$` в двух helpers; это места для замены на наблюдаемую готовность при доработке. Флаки из этих ожиданий на данном этапе не доказаны и отдельными findings не посчитаны |

Серьёзных новых проблем в naming, marker hygiene, ESLint suppression и
FSD-границах этого этапа не выявлено. Прохождение статических проверок
не доказывает отсутствие dead exports или ошибок финансового отображения.

Границы тестов в целом разумны: HTTP smoke проверяет доступность shell/config/assets;
model tests — расчёты, parser/mapper и invariants; Playwright с mock API — UI,
payload и асинхронные взаимодействия. Mock browser tests не доказывают работу
реального backend, а smoke не заменяет проверку клиентского состояния.
Отсутствие 100% coverage, отдельного unit runner или дополнительных browser engines
само по себе замечанием не является.

## 5. Проверки и ограничения доказательств

Выполнено:

- `npm run lint` — exit code 0;
- `npm run typecheck` — exit code 0, route types generated;
- `npm run architecture:check` — exit code 0, `No problems found`;
- дополнительный диагностический `tsc --noUnusedLocals --noUnusedParameters`
  с отключённым incremental — выявил неиспользуемые объявления, например
  `Typography` в ProductDetailsBreadcrumbs и `Page` в checkout-delivery-groups.
  Эти flags не входят в обязательный typecheck; его результат остаётся успешным.
  Такие мелкие leftovers не выделены в отдельные проблемы;
- выбранные model/contract tests: **72 passed**. Команда:

```powershell
$env:TEST_BASE_URL='http://127.0.0.1:3097'
npx playwright test '.*-model\.spec\.ts|product-form-mapping\.spec\.ts|product-contract-v129\.spec\.ts' --project=chromium --workers=2 --reporter=line
```

Здесь `TEST_BASE_URL` только отключил bootstrap webServer; выбранные тесты
не запрашивали этот URL. Предупреждения Zustand об отсутствии storage
в Node не превратились в ошибки. Этот прогон не проверял browser persistence
и не подтверждает исправление ранее найденных lifecycle-проблем.

При отдельном browser-запуске использовались локальные dev/SSR fixture servers
на портах 3097/3098:

```powershell
$env:PLAYWRIGHT_PORT='3097'
$env:PLAYWRIGHT_FIXTURE_API_PORT='3098'
npx playwright test mobile-rendering.mobile.spec.ts --project=mobile-chromium --grep 'mobile streamed SSR fallback exposes' --workers=1 --reporter=line
```

Выбранный тест воспроизвёл падение на строке 304: expected `site`, received
`logo.bf4b7458.svg`. После вывода ошибки runner не завершил teardown;
процесс этого запуска остановлен. Поэтому результат описывается как
подтверждённое падение assertion, а не как завершённый полный browser-прогон.
Статистика двух запусков не объединялась; общий `test-results/.last-run.json`
не использовался как доказательство обоих запусков.

Дополнительный изолированный Node probe через TypeScript transpilation
проверил фактические денежные функции, React-render ProductPriceDisplay
с нейтральными MUI stubs и cleanup upload-hook с mock React/API:
четыре assertions прошли. Он подтвердил Q1/Q2/Q5, но не является тестом
полного приложения или измерением памяти браузера.

Production build не запускался: для этих findings он не нужен.
Полный e2e/standalone suite и HTTP smoke не запускались; подтверждение
ограничено указанными проверками. Backend и реальные операции записи
не проверялись. Измерение размера bundle/heap и полного покрытия не проводилось.

## 6. Изменения и документация

Создан только `docs/frontend-audit/08-code-quality.md`. Предыдущие отчёты,
production-код, конфигурация и тесты сохранены; коммит и push не выполнялись.

Документация обновлена этим отчётом. `AGENTS.md`, `docs/architecture.md`,
`docs/testing.md` и `docs/api-and-auth.md` менять не требуется: аудит
не меняет архитектуру, public API, поведение приложения, команды или setup.
При реализации рекомендаций актуализировать относящуюся к изменению документацию.

Сначала исправить Q1/Q2 и Q3; регрессии Q4 выполнять вместе с исправлениями
серьёзных lifecycle-проблем из этапов 02/03. Q5/Q6 — ограниченные локальные задачи.
