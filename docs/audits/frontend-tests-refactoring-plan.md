# План оптимизации тестовой базы Figurzilla

## 1. Цель, исходные данные и обязательные ограничения

| Поле | Значение |
|---|---|
| Дата согласования и сохранения | 2026-10-09, Europe/Moscow |
| Основание | [Исходный аудит](frontend-tests-audit.md) и последующая точечная проверка его выводов |
| SHA исходного аудита | `102114e0cb044bd56f8883eb479ba3ace388a18c` |
| HEAD при подготовке плана | `384fab90c586d3b7572984e2d03066228c61ced5` |
| Статус | Согласованный план; реализация пакетов не начата |
| Область текущего изменения | Только создание этого документа |

Цель — сделать проверки устойчивее и дешевле, сохранив уникальную защиту пользовательских сценариев и закрыв подтверждённые существенные пробелы. Целевое количество тестов, процент сокращения и формальное достижение 100% coverage не устанавливаются. Успех оценивается по сохранённым рискам, воспроизводимости, диагностике и стоимости исполнения.

### Неизменяемые границы

1. Исходный `docs/audits/frontend-tests-audit.md` сохраняется побайтно. Его SHA256 при подготовке плана: `ADB4B3C24B85089A10E8AD219391F83C9667BE01114BCA6EA4633A0144436CF8`. Уточнения и результаты дальнейших проверок фиксируются здесь, а не переписывают исторический аудит.
2. В рамках оптимизации тестов запрещены изменения production-кода: `app/`, `src/`, `public/`, production routing, API-контракты, DTO, query keys, бизнес-правила и публичные API слайсов. Нельзя извлекать функции из production-кода ради удобства тестирования, добавлять в приложение тестовые маркеры или ослаблять TypeScript strict. Создание предусмотренного существующим SSR fixture игнорируемого временного image asset при запуске проверки не является разрешением редактировать production assets.
3. Область каждого пакета — закрытый список в разделе 3. Дополнительно каждый пакет может обновлять только собственную запись о результатах, источниках требований и Verification Pass в этом документе. Другие файлы нельзя включать в пакет автоматически. Если работа требует расширения границ, остановить зависимую часть и отдельно скорректировать план до редактирования.
4. Подтверждённые дефекты приложения оформляются отдельными задачами с воспроизведением и правильным ожидаемым поведением. Исправление таких дефектов не входит в этот план. Корректный тест не удаляется, не пропускается и не ослабляется для получения зелёного результата.
5. Ожидаемое поведение определяется подтверждёнными требованиями, контрактами и пользовательскими сценариями. Текущая реализация помогает установить механизм и воспроизведение, но сама по себе не доказывает правильность бизнес-ожидания. Для существенного нового или изменённого assertion указать источник, защищаемый сценарий и наблюдаемый результат. Конфликт документов либо отсутствие подтверждения блокируют соответствующий assertion до уточнения требований.
6. До удаления или объединения теста составить карту: исходный case/assertion → уникальный риск → конкретный сохраняемый case/assertion → доказательство, что он обнаруживает ту же регрессию. Сначала усилить и независимо проверить сохраняющий тест, затем удалять дубликат. Название, сходство шагов, зелёный запуск или общий coverage не являются доказательством эквивалентности. Если эквивалентность не доказана — KEEP.
7. Не добавлять зависимости, новый runner, масштабный mock framework или изменения lockfile. Для разделения уровней использовать установленный Playwright; новый инструмент возможен только отдельным согласованным решением.
8. Существующие пользовательские изменения вне пакета сохраняются. Не требовать чистого checkout ценой reset, удаления файлов или чужих правок. Перед каждым пакетом фиксировать исходное состояние рабочей копии и сравнивать собственное изменение с ним.
9. Коммиты, push, внешние записи и исправления production-кода требуют отдельной прямой команды. Сохранение плана не разрешает автоматически начинать даже первый пакет. Дальнейшая работа выполняется отдельными небольшими этапами с независимым Verification Pass после каждого.

### Подтверждённые выводы, которые сохраняются

- Тестовая база в основном актуальна. Содержательные проверки auth/refresh, private scope, checkout, publication, image identity, dirty forms, error recovery и admin permissions сохраняются.
- Discovery в ходе уточнения аудита подтвердил 606 cases в 79 spec-файлах: Chromium — 544 в 68 файлах; mobile Chromium — 62 в 11 файлах. Это разрешает историческое расхождение FTA-057, а не устанавливает целевой размер базы.
- 22 `-model` файла содержат 154 cases. Ещё четыре полностью независимых от браузера файла — `product-form-mapping.spec.ts`, `product-contract-v129.spec.ts`, `safe-diagnostics.spec.ts`, `checkout-submit-lifecycle.spec.ts` — содержат 37 cases. Получаются 191 case в 26 файлах; остальные 415 cases в 53 файлах смешивают уровни и не должны автоматически называться полноценными E2E. В смешанных файлах есть дополнительные чистые/HTTP-проверки.
- Диагностический поднабор девяти model/integration файлов ранее прошёл: 82/82, Chromium, один worker, `TEST_BASE_URL=http://127.0.0.1:9`, без приложения и реального backend. Это не результат полного suite или CI.
- Между SHA аудита и HEAD подготовки плана в проверенной области исходников, тестов и инфраструктуры изменились только зависимости Next.js/eslint-config-next и sharp. Результаты исторических browser runs остаются историческими.
- FTA-035 уточнена до подтверждённого дефекта cache rollback, описанного в PB-01. FTA-037/FTA-039, focus, config retry, viewport и SSR pending требуют воспроизведения; конкретные причины ещё не доказаны.
- Не завершённый общий browser run (FTA-056), отдельные failure artifacts и успешные поднаборы не дают права объявлять всю базу зелёной.
- Скриншоты без утверждённого baseline — диагностические вложения (FTA-014). Они не заменяют автоматические assertions.

### Стратегия уровней

Чистые функции, таблицы политик, mapping и formatter проверять без браузера. Реальные stores, QueryClient/QueryObserver, mutations и lifecycle проверять с управляемыми promises, transport и временем. В браузере оставлять пользовательские действия, mounted integration, focus/keyboard/touch, navigation, responsive state и DOM-поведение. HTTP smoke сохранять для маршрутов и ответов сервера. Production standalone применять для SSR, image optimizer, hydration и storefront/admin boundary. Полные дешёвые таблицы дополнять небольшими браузерными представителями каждой уникальной ветви.

Нельзя считать mocks признаком бесполезного теста: важны реальная исполняемая логика, границы подмены и чувствительность assertions. Нельзя заменять реальную React-интеграцию самодельной имитацией scheduler. Новые тестовые ожидания не должны придумывать backend idempotency, endpoint behavior или новые правила покупки.

## 2. Завершение пакета, проверки и независимый Verification Pass

### Общий Definition of Done

Для каждого пакета обязательны: изменение только в разрешённой области; подтверждённый источник ожидаемого поведения; сохранение существующих полезных assertions и комментариев; соответствующие проверки; карта сохранения защиты при любом удалении; независимый Verification Pass. Все команды, условия запуска, результаты, skipped/flaky cases и нерешённые вопросы записываются в статус пакета. До выполнения этих условий пакет остаётся незавершённым.

Минимальная карточка результата: пакет, исходный HEAD и пользовательский baseline, изменённые файлы, источник требований, изменённые сценарии, карта удаления при необходимости, команды и результаты автора, проверяющий и его независимые результаты, итоговый статус. Изначально все пакеты имеют статус `NOT_STARTED`; описание критериев ниже не означает их выполнение.

### Профили обязательных проверок

| Профиль | Проверки |
|---|---|
| **D — документ/диагностика** | Проверка diff, списка файлов, SHA256 аудита, ссылок и размера документа; discovery и ограниченное воспроизведение только когда они нужны для вывода. |
| **M — model/integration** | Изменённые cases и соседние регрессии домена; `npm run typecheck`, `npm run lint`, `npm run architecture:check`; ESLint непосредственно изменённых TypeScript-файлов тестов, поскольку текущий `npm run lint` проверяет только `app` и `src`. |
| **B — browser** | Профиль M плюс затронутые пользовательские сценарии в правильном проекте Chromium/mobile Chromium, с требуемыми viewport/touch условиями и контролируемым API. Диагностический focused run выполняется без маскировки дополнительными retries. |
| **H — HTTP** | Профиль B плюс `npm run test:smoke` против правильного локального сервера; сохранение полной HTTP-матрицы при сокращении браузерных дублей. |
| **P — production** | Профиль B плюс свежий `npm run build`, затронутые smoke/browser сценарии на standalone artifact и проверка SSR fixture. Аналитика и записи подменяются локально. |
| **I — infrastructure** | Discovery и исполнение затронутых режимов, все реальные consumers изменённого helper, startup/cleanup принадлежащих запуску процессов и fixture. При изменении CI/standalone — свежая сборка и соответствующая production-проверка. Для TypeScript/config/scripts дополнительно применимы статические проверки профиля M. |

Команды браузерных поднаборов используют точные файлы и `--project=chromium` либо `--project=mobile-chromium`. Диагностика первого падения сохраняет trace через `--trace=retain-on-failure`, даже если локальные retries равны нулю. Лимит запуска и порты фиксируются до старта; внешнее прерывание не выдаётся за завершённый suite. Останавливать только процессы текущего запуска. SSR cases нельзя считать проверенными, если они skipped из-за отсутствия fixture URL.

Свежую production-сборку не требуется повторять для каждого локального изменения model assertions. Она обязательна для пакетов P, изменений соответствующей инфраструктуры и финальной проверки серии. Проверки расширяются или повторяются при новой правке, отказе либо конкретном нерешённом риске, а не ради количества запусков.

### Условия независимости Verification Pass

1. Проверяющий — другой разработчик либо отдельная сессия без участия в авторстве пакета. Повторный запуск самим автором не является независимой проверкой. Это требование не разрешает автоматически запускать subagents или создавать отдельные чаты.
2. До проверки зафиксировать HEAD, исходные пользовательские изменения и точный diff пакета. Автор не меняет пакет во время проверки. Проверяющий изучает и запускает проверки без исправлений production-кода или тестов; допустимы обычные игнорируемые артефакты. Обнаруженные недостатки возвращаются автору, после правок проверка повторяется на новом diff.
3. Проверяющий самостоятельно проверяет разрешённые файлы, SHA256 аудита, источники требований, границы mocks, meaningful selectors, негативные исходы и отсутствие ослабления assertions. Для удаления сверяет карту сохранения уникальной защиты и исполняет сохраняющие cases.
4. Проверяющий самостоятельно запускает профиль из строки пакета и указанные в ней дополнительные сценарии. Отчёт автора используется как контекст, но не заменяет собственный результат.
5. Итоги: `PASS`, `BLOCKED_PRODUCT`, `BLOCKED_REQUIREMENT`, `FAIL_TEST_OR_INFRA`. Только `PASS` завершает пакет. Блокировка одной подтверждённой проблемы не запрещает независимые пакеты. Для диагноза неизвестного падения допускается зафиксировать неопределённость, но нельзя объявлять затронутую регрессию пройденной.
6. Не обходить отказ через `skip`, широкие успешные mocks, произвольные sleeps, дополнительные retries, удаление корректного expectation или увеличение tolerance без подтверждённого требования.

## 3. Небольшие пакеты изменений

**Порядок начала строгий: P00 → P01 (FTA-034, P0) → независимый Verification Pass P01.** FTA-034 не ожидает полного устранения flakes, перестройки runner, сокращения матриц или завершения общего browser run. Далее номер задаёт предпочтительный порядок; независимые пакеты разрешается выполнять отдельными этапами после явно указанных prerequisites. Один пакет не объединяется с соседним ради большого изменения.

В таблицах имя `.spec.ts` без каталога означает ровно `tests/e2e/<имя>`. Имена новых файлов отмечены словом «новый». Список в каждой строке закрытый. Во всех строках дополнительно разрешена запись результата соответствующего пакета в этом документе, как установлено в разделе 1. Проверка файла-потребителя не разрешает его редактирование.

### 3.1. Минимальная диагностика и существенные недостающие сценарии

| Пакет / FTA | Разрешённые файлы | Результат и критерии завершения | Проверки и особые условия независимого VP |
|---|---|---|---|
| **P00 — минимальная диагностика**; FTA-024/FTA-025/FTA-053–057 | Только этот документ; штатные игнорируемые диагностические артефакты запусков | Зафиксированы baseline, discovery, правильный setup, ограниченная по времени команда для P01, trace первого отказа и cleanup. FTA-057 отмечена разрешённой по фактическому listing. Для неизвестных failures записаны границы доказанного. Не вводить условием завершения исправление всех FTA-053/FTA-054/FTA-055 или полный suite. | D; проверяющий подтверждает возможность focused запуска P01 на корректном окружении и отсутствие ложного заявления о полном зелёном run. Код/config в этом пакете не меняются. |
| **P01 — поздний auth после завершения сессии, P0**; FTA-034 | `auth-boundaries-model.spec.ts`, `session-lifecycle.spec.ts` | Управляемые поздние login/verify после logout и после начала новой сессии: старый ответ не возвращает старые токены/пользователя, не пишет в чужой private scope и не выполняет устаревший redirect. Проверяется владение сессией, а не только отсутствие exception. При дефекте — отдельная задача приложения. | M+B; сразу после P00. VP самостоятельно меняет порядок завершения promises и сверяет токены, store, private data и навигацию с подтверждёнными session requirements. |
| **P02 — return route поиска**; FTA-001 | `product-search-session.spec.ts` | Устаревшее ожидание приведено к подтверждённому post-login return route с исходными query params; сохранены cache/session isolation и история. | B; VP сверяет сценарий возврата с требованиями auth navigation, а не просто переписывает URL по увиденному результату. |
| **P03 — единая временная база поиска**; FTA-015 | `search-input.spec.ts` | Clock install и pause используют одну фиксированную временную базу. Сохранены debounce, отмена, фильтры, Back/Forward и delayed URL acknowledgements на двух существующих ширинах. | B; VP исполняет обе ширины и подтверждает отсутствие перехода clock в прошлое и сохранение проверок истории. |
| **P04 — focus отделён от setup**; FTA-016 | `catalog-filter-empty.spec.ts` | Assertion начального фокуса вынесен из общего открытия фильтра в самостоятельный содержательный case. Остальные сценарии диапазонов и empty states не блокируются его setup; сама проверка focus сохраняется. Реальный focus defect выделяется отдельно. | B; VP отдельно запускает focus и соседние сценарии, включая keyboard/маленький viewport, и проверяет, что ошибка focus не скрыта. |
| **P05 — таблица retry policy**; FTA-045 | Новый `query-retry-model.spec.ts` | Дешёвая таблица подтверждённой политики: отказ для auth/forbidden/validation, предел числа retries, разрешённые server/network failures. Не приписывать эту политику query с явным другим override. | M; VP проверяет реальные error types и границу retry counter, источники политики и отсутствие browser lifecycle в чистой таблице. |
| **P06 — read recovery и SSR pending**; FTA-017/FTA-031/FTA-055 | `read-recovery.spec.ts`, `scripts/playwright-api-fixture.mjs` | Нужные ответы завершаются управляемыми gates; различаются отправленный, отменённый и завершённый запрос. Число reads обосновано конкретным сценарием; его нельзя механически менять с 2 на 3. Проверяется пользовательское состояние, а не DOM identity. Fixture-правки ограничены существующим recovery-сценарием product 924; без нового универсального framework. | B+P для SSR; VP повторяет pending/failure/retry, проверяет reset fixture и объяснение дополнительного чтения. Невоспроизведённая причина FTA-055 остаётся явно открытой, а не исправленной на бумаге. |
| **P07 — mounted quantity queue**; FTA-036 | `checkout-stock.spec.ts` | Mounted debounce → queued PUT → delayed GET согласуются с последней пользовательской правкой. Покрыты быстрые изменения, поздние ответы, retry и блокировка недостоверного остатка перед submit. | B плюс существующие quantity/private model regressions; VP проверяет промежуточное и итоговое UI/cache состояние при контролируемом порядке ответов. |
| **P08 — confirmed order write и remount**; FTA-037 | `checkout-submit-lifecycle.spec.ts`, `checkout-stock.spec.ts` | Воспроизведена цепочка подтверждённого POST, неудачного confirming read и remount; проверены подтверждённые правила повторного действия. Не придумывать backend idempotency и не запрещать новый намеренный заказ без продуктового основания. При воспроизводимом повторе прежней операции — отдельная product task. | M+B; VP отличает прежнее checkout intent от нового действия пользователя и проверяет, что lifecycle/remount не теряет подтверждённый результат. |
| **P09 — order permissions table**; FTA-038 | `order-details-model.spec.ts` | Полная дешёвая таблица role/status/proof/tracking с подтверждёнными разрешениями и запрещёнными действиями. Неоднозначные строки заблокированы до подтверждения требований. | M; VP сверяет таблицу с ролью buyer/seller/admin и существующим контрактом, включая запрещённые ветви. |
| **P10 — stale action dialog**; FTA-039 | `order-details.spec.ts`, `open-forms.spec.ts` | Диалог payment/cancel остаётся открытым при обновлении статуса: устаревшее действие не отправляет запрещённую запись; пользовательское состояние и причина отказа проверяются наблюдаемо. Подтверждённый defect приложения уходит в отдельную задачу. | B; VP изменяет статус между открытием и submit, проверяет отсутствие write и отличает запрет по статусу от lock/loading. |
| **P11 — обычная отправка и получение**; FTA-040 | `order-details.spec.ts` | Содержательные successful shipping/receipt journeys: точный подтверждённый payload, одна запись, закрытие диалога и обновлённое состояние заказа. | B; VP исполняет обычный заказ и убеждается, что existing preorder/error/unknown-result coverage сохранено. |
| **P12 — publication prerequisites**; FTA-041 | `product-publication.mobile.spec.ts` | Используются реальные query prerequisites: loading/error/missing profile, подтверждённое требование ACTIVE, transfer accounts/social, retry и предусмотренный edit bypass. Полный порядок проверок определяется требованиями текущих сценариев create/edit. | B; VP проверяет блокировку submit и восстановление после исправления prerequisite, а не только искусственные flags модели. |
| **P13 — production storefront/admin crossing**; FTA-042 | `admin.spec.ts` | Вход/выход через настоящий layout boundary на standalone: storefront chrome/analytics не сохраняются в admin, нужное состояние восстанавливается при возврате. Аналитика подменяется, внешние события не отправляются. | P; VP подтверждает свежую production-сборку, реальный переход между layouts и отрицательную проверку storefront analytics в admin. |

FTA-035 не включается в этот поток как обычное зелёное дополнение tests: для неё уже подтверждён PB-01 и требуется отдельная задача приложения (раздел 4).

### 3.2. Строгие helpers и разделение режимов запуска

| Пакет / FTA | Разрешённые файлы | Результат и критерии завершения | Проверки и особые условия независимого VP |
|---|---|---|---|
| **P14a — guest mock**; FTA-023 | `tests/e2e/helpers/guestAuth.ts` | Unknown API request даёт диагностируемый отказ вместо общего успешного `200 []`. Явно заданы только подтверждённые маршруты текущих сценариев. | I; перед изменением зафиксировать фактические вызовы helper. VP запускает всех consumers и негативный контроль неизвестного запроса. |
| **P14b — account mock**; FTA-023 | `tests/e2e/helpers/mobileAccount.ts` | Убран успешный fallback неизвестного API; сохранены реальные empty/error/success сценарии и состояние mock. | I; VP запускает прямых consumers и transitive consumers через settings helper; проверяет отсутствие скрытого fallback в цепочке. |
| **P14c — settings mock**; FTA-023 | `tests/e2e/helpers/settingsAccount.ts` | Неизвестный settings request не переходит в общий успешный ответ; known empty states остаются явными. Не добавлять выдуманную validation. | I; VP запускает всех settings consumers и unknown-request negative control. |
| **P14d — admin mock**; FTA-023 | `tests/e2e/helpers/admin.ts` | Строгие known endpoints и ошибки, без успешной заглушки неизвестного запроса. Сохранены roles, write outcomes и reconciliation. | I; VP запускает всех admin consumers, включая portal/editor branches и forbidden requests. |
| **P15 — отдельный model mode**; FTA-005/FTA-021/FTA-030 и стратегия уровней | `playwright.config.ts`, `package.json`, `docs/testing.md` | На существующем Playwright добавлен запуск подтверждённых browser-independent файлов без приложения, fixture server и device projects. Перечень основан на зависимостях файла, а не только `-model` suffix. Обычный режим пока сохраняет прежнее полное покрытие; исключение переносится в P16. Зависимости/lockfile не меняются. | I+M; VP делает discovery обоих режимов, исполняет model mode с недоступным base URL и проверяет отсутствие старта server/browser для этих cases. |
| **P16 — обязательный model gate и browser exclusion**; FTA-024/FTA-025/FTA-026/FTA-056 | `playwright.config.ts`, `.github/workflows/frontend-ci.yml`, `docs/testing.md` | После PASS P15 обязательный model gate включён в CI перед build; browser mode исключает уже покрытые model cases без потери suite. Зафиксированы рабочие diagnostic команды/порты/trace/cleanup. Исключение и обязательный gate вводятся одним атомарным пакетом. Shared SSR state остаётся риском, пока нет воспроизведения; не создавать namespaced fixture framework без необходимости. | I+P; VP сверяет объединение discovery двух режимов, отсутствие потерь/необоснованных повторов, CI порядок, startup/cleanup и обязательное исполнение SSR без setup-skips. |

Минимальная диагностика P00 и auth P01 не зависят от P14–P16. Ужесточение каждого helper — отдельный пакет; если consumer требует правки, она не выполняется в этом пакете автоматически.

При подготовке плана обнаружены следующие browser consumers вызовов helpers; перед P14 их перечень повторно сверяется по фактическим вызовам, а не только по import fixture data:

- `guestAuth`: auth-return-path, catalog-filter-empty, guest-shopping.mobile, image-sizing, login-identifier, search-input, theme-colors.
- `mobileAccount`: avatar-replacement, catalog-filter-empty, editor-boundaries, controls-focus, core-images, create-product.mobile, image-identity, list-mutations, financial-display, open-forms, orders.mobile, private-data, read-recovery, save-confirmation, theme-colors, product-publication.mobile, unsaved-changes, route-boundaries; дополнительно consumers `settingsAccount`.
- `settingsAccount`: controls-focus, editor-boundaries, settings-empty-lists, settings-security.mobile, unsaved-changes.
- `admin`: admin-extended, admin, editor-boundaries, open-forms, search-input.

### 3.3. Узкие исправления и упрощение моделей

| Пакет / FTA | Разрешённые файлы | Результат и критерии завершения | Проверки и особые условия независимого VP |
|---|---|---|---|
| **P17 — compile-time product contract**; FTA-005 | `product-contract-v129.spec.ts`, новый `tests/contracts/product-contract.types.ts` | Сохранены все полезные compile-time guards. Runtime wrappers заданных констант удаляются только после доказательства, что typecheck действительно проверяет перенесённый contract. Runtime business invariants не удаляются вместе с wrappers. | M плюс существующие non-purchasable/stock regressions; VP проверяет inclusion нового файла в typecheck и каждую исходную type guard. |
| **P18 — anonymous/redirect overlap**; FTA-006/FTA-007 | `anonymous-access.spec.ts`, `docs/testing.md` | Слабые body-render/config повторы удалены только при PASS сохраняющего smoke. Сохранены unauthorized checks, полная HTTP redirect table и browser представители прямого/client перехода. | H; VP проверяет карту каждого удаления и реальный запуск сохраняющей HTTP-матрицы. |
| **P19 — checkout readiness duplicate**; FTA-008 | `checkout-delivery-model.spec.ts` | Исправлено описание unselected scenario либо удалён только доказанный duplicate happy path. Сохранена реальная защита shortage выбранной/невыбранной позиции. | M плюс соответствующие checkout-stock cases; VP проверяет различие selection branches, а не число оставшихся cases. |
| **P20 — устаревшие имена и fixtures**; FTA-002/FTA-003/FTA-004 | `checkout-submit-model.spec.ts`, `cart-quantity-store-model.spec.ts`, `mobile-rendering.mobile.spec.ts` | Уточнены Telegram/non-purchasable narrative, обещание persistence и имя performance artifact. Пакет не меняет бизнес-ожидания и не ослабляет assertions. | M+B для затронутых cases; VP сравнивает смысл до/после и подтверждает, что название соответствует реальной защите. |
| **P21 — retry payload contract**; FTA-027 | `checkout-submit-model.spec.ts` | Object identity заменена проверкой точных значимых полей, неизменности исходных данных и допустимого retry/stale outcome. | M плюс checkout-submit-lifecycle; VP проверяет, что иной payload обнаруживается даже при новом объекте и что no-duplicate protections сохранены. |
| **P22 — safe diagnostics**; FTA-029 | `safe-diagnostics.spec.ts` | Убраны необоснованные quota console sinks и имена locals; redaction и реальные границы logging остаются проверены. | M; VP проверяет утечку синтетических секретов и error serialization, карту удалённых AST assertions. |
| **P23 — работа cart cards**; FTA-028 | `cart-card-work-model.spec.ts` | Сохранены membership, общая проекция, ownership/scope и значимый ограниченный fan-out. Необоснованные точные внутренние counters удаляются только при сохранённой защите нужного performance риска. | M плюс существующий browser case 40 карточек; VP проверяет границы подмены hook и наблюдаемую нагрузку, не превращая case в тест собственного mock. |
| **P24a — search harness**; FTA-030 | `search-input-model.spec.ts`, `search-input.spec.ts` | Уникальная защита delayed/out-of-order acknowledgements, history, debounce cancellation и suggestions переносится в надёжные проверки до удаления самодельного React scheduler. Production hooks не извлекаются и не меняются. | M+B; VP сначала запускает сохраняющие cases и сверяет карту каждого удаляемого model assertion. |
| **P24b — infinite recovery harness**; FTA-021/FTA-030 | `infinite-recovery-model.spec.ts`, `read-recovery.spec.ts` | Сохранены pause после background success, ручной retry, смена/возврат query key и scope. Wall-clock и имитация React lifecycle заменяются управляемым временем/реальными существующими границами без нового runner. | M+B; VP проверяет независимые ключи и отсутствие скрытого автоматического retry после паузы. |
| **P25 — publication timers**; FTA-021 | `product-publication-model.spec.ts` | Таймеры управляемы; late callback, dispose и draft revision сохраняют самостоятельную защиту. | M; VP воспроизводит callback после dispose/новой revision и проверяет, что старый результат не изменяет текущий draft. |

### 3.4. Наблюдаемые browser assertions и устойчивое ожидание

| Пакет / FTA | Разрешённые файлы | Результат и критерии завершения | Проверки и особые условия независимого VP |
|---|---|---|---|
| **P26 — hydration readiness**; FTA-018/FTA-019 | `mobile-categories.mobile.spec.ts`, `session-lifecycle.spec.ts`, `private-data.spec.ts` | Убрана зависимость от `__reactProps` и неоднозначного hydration setup. JS-ready сценарии ожидают наблюдаемую готовность; progressive SSR navigation остаётся отдельной защитой. Production markers не добавляются. | B; VP проверяет hydration interactions и отдельный no-JS/progressive сценарий, session/private cleanup. |
| **P27a — accessibility waits**; FTA-020/FTA-033 | `accessibility-interactions.spec.ts`, `accessibility-touch-targets.mobile.spec.ts` | Произвольные sleeps заменены ожиданием состояния. Сохранены keyboard/touch, focus и 44×44 px для самостоятельных действий; реальные интервалы жеста/frame не удаляются механически. | B; VP проверяет keyboard и touch в соответствующих проектах, включая focus-visible и reachable actions. |
| **P27b — dirty/open form state**; FTA-020/FTA-031 | `open-forms.spec.ts`, `unsaved-changes.spec.ts` | Проверяются введённые значения, dirty/pending, ошибки и сохранность состояния вместо DOM node identity и sleeps. | B; VP воспроизводит повторное открытие, background failure и навигацию с несохранённым вводом. |
| **P27c — address selectors**; FTA-022 | `checkout-address.spec.ts` | MUI class/icon selectors заменены role/label/checked state там, где это уже доступно. Новый production test marker запрещён. | B; VP проверяет выбор, переключение, error и подтверждённый address payload. |
| **P27d — theme assertions**; FTA-022/FTA-033 | `theme-colors.spec.ts` | Проверяются semantic color roles, читаемость, contrast и focus. Точные брендовые значения сохраняются, пока нет основания считать их декоративными деталями. | B; VP сверяет источник каждой ослабляемой CSS-проверки и обязательный contrast. |
| **P27e — registration consent**; FTA-033 | `registration-consent.spec.ts` | Сохранены notice, юридические ссылки и payload. Декоративные assertions меняются только при доказанном отсутствии контракта; новый обязательный consent checkbox не придумывается. | B; VP проверяет регистрацию и существующий legal scenario, карту удалений. |
| **P27f — auth dialog diagnostics**; FTA-020/FTA-033/FTA-054 | `auth-dialogs.mobile.spec.ts` | Исправляются только доказанные проблемы mock/wait. Проверки visual viewport, focus и reset сохраняются; отклонение 336 px само по себе не оправдывает увеличение tolerance. При product defect — отдельная задача. | B, P при зависимости от production hydration; VP самостоятельно воспроизводит open/resize/focus/reset и отделяет test setup от дефекта UI. |
| **P27g — orientation state**; FTA-020/FTA-031 | `mobile-rendering.mobile.spec.ts` | Ориентация/resize проверяют сохранение пользовательского состояния, вместо identity узлов и произвольного ожидания. | B; VP проверяет значения, pending/dirty state и доступность действий после resize. |

### 3.5. Сокращение повторной браузерной работы без потери защиты

| Пакет / FTA | Разрешённые файлы | Результат и критерии завершения | Проверки и особые условия независимого VP |
|---|---|---|---|
| **P28 — financial journeys**; FTA-009 | `financial-display.spec.ts`, `docs/testing.md` | Полная дешёвая formatter table RUB/USD/EUR и представители UI-ветвей regular/preorder. USD regular и EUR preorder сохраняют non-RUB forwarding; существующие RUB владельцы явно названы. Повторный journey удаляется только после карты всех consumer branches и currency forwarding. | M+B; VP проверяет цены/количество/предоплату и payload валюты в сохраняющих journeys. |
| **P29 — auth return matrix**; FTA-010 | `auth-return-path.spec.ts`, `docs/testing.md` | Сохранена полная sanitizer table и каждый уникальный entry point. Браузерные комбинации flows/viewports сокращаются по явной карте до достаточных представителей; cart/favorite не отправляются автоматически после входа. | M+B; VP сверяет прямой/диалоговый login/register, переключение формы, отмену и route/query restoration. |
| **P30 — failed image restore**; FTA-011 | `image-identity.spec.ts`, `create-product.mobile.spec.ts` | До удаления базового дубля сильный case включает disabled/enabled publication readiness. Сохранены текст, image IDs, блокировка upload, retry, identity и mobile publication. | B; VP сначала запускает усиленный сохраняющий case, затем сверяет удалённую защиту. |
| **P31 — publication retry overlap**; FTA-012 | `product-publication.mobile.spec.ts`, `create-product.mobile.spec.ts`, `product-form-mapping.spec.ts` | Failed write/retry объединяется только при сохранении availability payload для create/edit, submit lock, draft revision, cleanup и mobile alert. | M+B; VP проверяет карту payload/cleanup/error assertions и отдельные create/edit ветви. |
| **P32a — владелец responsive shell**; FTA-013 | `mobile-rendering.mobile.spec.ts` | Назначен содержательный владелец общих chrome assertions с нужными режимами и breakpoint boundaries. Состояние страницы после resize остаётся самостоятельной проверкой. | B; VP подтверждает сохранённый shell coverage до любого удаления в P32b–g. |
| **P32b — guest shell duplicate**; FTA-013 | `guest-shopping.mobile.spec.ts` | После PASS P32a удалены только доказанные общие shell повторы. Guest shopping journey сохраняется полностью. | B; VP запускает сохраняющий shell case и guest journey, сверяет карту. |
| **P32c — dashboard shell duplicate**; FTA-013 | `dashboard-home.mobile.spec.ts` | После PASS P32a удалены только общие shell повторы. Profile/error/logout/draft interactions сохраняются. | B; VP сверяет dashboard-specific assertions и shell owner. |
| **P32d — settings shell duplicate**; FTA-013 | `settings-security.mobile.spec.ts` | После PASS P32a общие shell assertions не дублируются; form overflow, input/focus/error остаются. | B; VP проверяет доступность полей/действий и сохранность ввода на мобильном размере. |
| **P32e — checkout shell duplicate**; FTA-013 | `checkout-cart.mobile.spec.ts` | После PASS P32a удалены только общие shell повторы; selection, delivery и достижимость submit сохраняются. | B; VP проверяет checkout-specific layout и пользовательское действие, а не только shell. |
| **P32f — product form shell duplicate**; FTA-013 | `create-product.mobile.spec.ts` | После PASS P32a сохранены draft при resize, категории, фотографии и publication; удалены лишь эквивалентные shell assertions. | B; VP проверяет заполненную форму при resize и карту shell покрытия. |
| **P32g — theme shell duplicate**; FTA-013/FTA-033 | `theme-colors.spec.ts` | После PASS P32a сокращены только общие shell повторы. Contrast, semantic roles и подтверждённый brand contract остаются. | B; VP проверяет независимую защиту читаемости и shell owner. |
| **P33 — image sizing matrix**; FTA-032 | `image-sizing.spec.ts`, `docs/testing.md` | Сохранены критические breakpoint/auto-fill/max-width boundaries, DPR/resolution adequacy, assets и transfer budgets. Матрица сокращается только по карте рисков. Pixel-exact logo остается KEEP до подтверждения допустимой tolerance/брендового требования. | B+P; VP использует настоящий optimizer и fixture asset, проверяет размеры/разрешение и не принимает screenshots за visual assertion. |
| **P34 — delivery case decomposition**; FTA-058 | `checkout-delivery-groups.spec.ts`, `checkout-submit-lifecycle.spec.ts`, `own-product-purchase.spec.ts` | Multi-seller delivery остаётся своим journey с transfer/product mapping. Own-item guard и retry/outcome protections имеют самостоятельных владельцев без потери payload assertions. | M+B; VP отдельно запускает multi-seller, own-item и retry cases и сверяет карту исходного большого case. |

FTA-014 применяется ко всем пакетам со screenshot attachments: они обозначаются как diagnostics, а meaningful assertions сохраняются. Число оставшихся viewport cases или spec-файлов не является критерием завершения.

### 3.6. Остальные точечные пробелы, P2

| Пакет / FTA | Разрешённые файлы | Результат и критерии завершения | Проверки и особые условия независимого VP |
|---|---|---|---|
| **P35a — age validation**; FTA-043 | Новый `registration-age.spec.ts` | Таблица frontend age boundaries только по подтверждённому требованию регистрации. Наблюдаемые сейчас digits/0–150 не объявляются бизнес-требованием только по реализации. При отсутствии источника — `BLOCKED_REQUIREMENT`. | B; VP сверяет источники, границы, invalid input и отсутствие придуманной backend validation. |
| **P35b — seller profile boundaries**; FTA-044 | Новый `seller-profile.spec.ts` | Invalid/missing/error profile, retry и gate запроса products до разрешённого сценария. Не дублировать уже сохранённую pagination recovery matrix. | B; VP проверяет negative request assertions и восстановление после ошибки профиля. |
| **P35c — observable review update**; FTA-046 | `product-reviews.spec.ts` | После подтверждённой review mutation наблюдаемые данные товара/отзывов обновляются; invalidate вызов сам по себе недостаточен. | B; VP проверяет UI до/после и реальный refetch/update, включая ошибку записи. |
| **P35d — password payload**; FTA-047 | `tests/e2e/helpers/settingsAccount.ts`, `settings-security.mobile.spec.ts` | Mock сохраняет фактический body вместо `{}`; тест проверяет точный синтетический current/new password payload подтверждённого контракта. Реальные секреты не используются. | B плюс все settings helper consumers; VP проверяет, что неверный body действительно обнаруживается и не логируются реальные секреты. |
| **P35e — minimal batch diff**; FTA-048 | Новый `batch-settings-model.spec.ts` | Mixed unchanged/create/update/delete и no-op проверяют минимальный computeChanges и допустимые writes. Production extraction запрещён; применяются существующие тестовые границы. | M плюс существующий UI representative; VP сверяет отсутствие лишних writes и сохранение значимых полей. |
| **P35f — expiration boundaries**; FTA-049 | Новый `product-expiration-model.spec.ts` | Фиксированное время и подтверждённые пороги 0/3/7/14 дней, включая округление и непосредственно соседние значения. Источник правил фиксируется; неизвестное правило не выводится только из утилиты. | M; VP проверяет границы ceil и воспроизводимость при иной календарной дате запуска. |
| **P35g — category age gate lifecycle**; FTA-050 | `adult-category.spec.ts` | Confirm/cancel/reopen и отказ storage покрывают существующий подтверждённый category gate. Новый global gate для direct product URL/SEO не добавляется в тестовые ожидания без отдельного требования. | B; VP проверяет действия и повторное открытие при доступном/недоступном storage, отдельно фиксирует ограничение direct access. |

**Отложенные P3:** FTA-051 (небольшой WebKit/Safari набор) выполняется только при установленном browser risk и отдельном согласованном scope. FTA-052 (selective visual baseline) — при утверждённом владельце, стабильном окружении и процессе разбора diffs. Эти расширения не являются обязательным условием основного плана. До отдельного решения существующие meaningful assertions и diagnostic images сохраняются.

## 4. Отдельные дефекты, вопросы требований и завершение серии

### PB-01 — rollback конкурентных удалений корзины, FTA-035

**Статус: подтверждённый дефект frontend cache, отдельная задача приложения.** В исходном `useRemoveFromCart` onError восстанавливает весь snapshot корзины, а не только неуспешно удалённую позицию. Разные item IDs могут удаляться параллельно.

Управляемая диагностика исполняла исходные `useCartMutations` и `usePrivateMutation`, настоящие React/QueryClient/QueryObserver и synthetic cart transport в памяти, без записи файлов и HTTP:

1. Исходная корзина `[A, B, C]`; optimistic DELETE A и B оставляют `[C]`.
2. DELETE B подтверждён сервером; DELETE A завершается отказом.
3. Rollback A возвращает `[A, B, C]`, включая уже подтверждённо удалённый B.
4. Неудачное confirming GET оставляет неправильный cache. Ожидаемое состояние по подтверждённым исходам — `[A, C]`.

Зафиксированный результат: `optimisticRemaining=[3]`, `confirmedDeleted=2`, `afterRollback=[1,2,3]`, `afterFailedRead=[1,2,3]`, `readStatus=error`, `reads=2`. Это доказывает cache inconsistency. Browser manifestation и второй порядок settlement ещё не считаются проверенными; создание дубликата заказа этим опытом не доказывалось.

Отдельная задача должна получить собственное разрешение на production-правку и независимую проверку. Regression scope для неё — `list-mutations-model.spec.ts` и при необходимости существующий `list-mutations.spec.ts`: разные IDs, оба settlement order, смешанные/одинаковые outcomes, неудачный подтверждающий GET, scope cancellation. Конкретные production-файлы и способ исправления выбираются в плане этой отдельной задачи; текущая оптимизация не разрешает их менять.

До исправления не подменять ожидаемое состояние ошибочным snapshot, не добавлять skip и не объявлять FTA-035 закрытой. Пакет с воспроизведением может иметь `BLOCKED_PRODUCT`; это не мешает P01 и другим независимым пакетам. PB-01 закрывается только после отдельного исправления и его независимого Verification Pass.

### Что пока не является подтверждённым product defect

- FTA-037: подтверждённый POST + failed read + remount пока не воспроизвели дубликат. Hook-local successful IDs и scope-level uncertain state требуют lifecycle-проверки; нельзя заранее задавать новый backend idempotency contract.
- FTA-039: cancellation dialog не имеет того же current-status guard, что некоторые другие действия, но browser reproduction и правило допустимости нужны до окончательного вывода.
- FTA-016/FTA-053/FTA-054/FTA-055: исторические focus/config/viewport/SSR pending failures сохраняются как диагностические задачи. Падение теста не доказывает плохой тест, конкретный frontend bug или неправильный mock.
- FTA-026: shared mutable SSR fixture — риск; реальная race ещё не доказана. Выполнять reset и изолированные проверки, не вводить крупную инфраструктуру без воспроизведения.
- Использование `publicClient` для обычного чтения payment proof само по себе не доказывает backend data leak. Mock role checks не являются проверкой настоящей object-level backend authorization.

Если пакет обнаруживает подтверждённый дефект, отдельная карточка содержит: источник правильного поведения, минимальное воспроизведение, actual/expected, затронутый сценарий и тест, границы доказанного, production scope будущего исправления и критерии независимой проверки. Зависимый пакет блокируется; остальные продолжаются по отдельным командам пользователя.

### Вопросы требований, которые нельзя решать по текущему коду

- Неоднозначные order cancellation permissions и переходы status/role.
- Age validation регистрации и смысл допустимых числовых границ.
- Контракт pixel-exact logo/брендовых CSS и допустимые image tolerances.
- Глобальная adult policy для direct product URL, indexing/sitemap и уже существующий category gate. Текущая прямая доступность adult detail/SEO без общего gate — ограничение реализации, а не согласованное новое ожидание теста.
- Различение нового намеренного заказа и повтора прежнего checkout intent после remount.

Подтверждённые источники и ответы фиксируются в соответствующей карточке пакета. До ответа исполнитель не выбирает бизнес-правило самостоятельно: зависимая часть получает `BLOCKED_REQUIREMENT`.

Отдельно зафиксирован конфликт документации: `docs/core-flows.md` описывает draft как не привязанный к владельцу и не очищаемый, тогда как текущие draft/private scope механизмы и `docs/api-and-auth.md` описывают ownership и cleanup. Этот конфликт нельзя выдавать за product defect или использовать для ложного ожидания. Исправление другого документа не входит в текущее сохранение плана и требует отдельного разрешённого scope.

### Финальный независимый Verification Pass серии

После завершения согласованных пакетов проверяющий независимо подтверждает:

- Production-код, зависимости/lockfile и исходный аудит не изменены оптимизацией; пользовательские изменения сохранены. Audit SHA256 совпадает с разделом 1.
- Каждый изменённый expectation имеет подтверждённое основание; для удалений есть исполненная карта сохранения уникальной защиты. Нет ослабления focus, viewport, authorization, unknown write outcome или session isolation ради зелёного run.
- Discovery model/browser режимов согласован, обязательные cases не потеряны и не стали setup-skipped. Число cases используется для сверки состава, а не как цель.
- Выполнены статические проверки, model gate, свежая production-сборка и полный предусмотренный standalone smoke/browser запуск. Отдельно указаны фактические passed/failed/skipped/flaky, retries, лимиты и незавершённые процессы; исторические результаты не смешиваются с текущими.
- При failures установлены границы test/infra/product/requirement проблемы. Неполный или прерванный run не считается PASS; корректные failing tests остаются защитой, а product fixes идут отдельно.
- Обновлены только разрешённые записи `docs/testing.md` о реально введённых командах/стратегии/CI, будущие этапы не описаны как действующая архитектура. Изменения `AGENTS.md`, `docs/architecture.md`, `docs/api-and-auth.md` не нужны, пока их правила и production-поведение не меняются.
- Все обязательные пакеты имеют самостоятельный PASS, либо явно сохранена блокировка и серия не объявлена полностью завершённой. Отложенные FTA-051/FTA-052 не подменяют критические проверки.

Финальный Verification Pass не создаёт коммит, не выполняет push и не разрешает deployment. Для любых таких действий нужна отдельная команда пользователя.

### Проверка текущего сохранения

В рамках текущего запроса сохраняется только этот план. Реализация пакетов, исправление PB-01, изменения тестов/config/production и обновление действующих тестовых команд не выполняются. Для этого документа достаточно проверить состав изменений, читаемость и размер файла, наличие всех FTA-ссылок и неизменность audit SHA256; запуск build или test suite не требуется. `docs/testing.md` и остальные нормативные документы остаются без изменений, поскольку workflow ещё не изменён.
