# Аудит frontend: TypeScript, reliability и обработка ошибок

Дата: 01.10.2026. Проект: Figurzilla, `package.json` — 1.27.0.
Ревизия: `8377939`. До начала работы в `docs/frontend-audit/` уже находились
незакоммиченные отчёты этапов 01–05; они не изменялись.

## 1. Результат

Выделены 12 проблем, исправимых на frontend: 3 High, 8 Medium и 1 Low.
Critical не подтверждены. T2/T3 повторно рассматривают S3/S4 из
[аудита server state](./02-server-state.md), поскольку это существенные
ошибки Promise lifecycle и моделирования результатов операции.
Остальные пункты описывают отдельные дефекты текущего этапа.

| ID | Severity | Проблема | Effort |
| --- | --- | --- | --- |
| T1 | High | Неполный ответ metadata связывает превью с чужим ID изображения при редактировании товара | Small |
| T2 | High | Отклонённый по таймауту Promise не прекращает повтор POST после refresh | Medium |
| T3 | High | Неопределённый результат создания заказа представлен как повторяемая ошибка | Medium |
| T4 | Medium | Отказ записи auth-storage ломает успешный вход и может породить unhandled rejection | Small |
| T5 | Medium | Загрузка runtime API config не ограничена таймаутом Axios | Small |
| T6 | Medium | Assertions над auth error payload подменяют исходную ошибку и пропускают некорректный cooldown | Small |
| T7 | Medium | Пустой ответ upload превращается в успешное состояние с undefined вместо ID | Small |
| T8 | Medium | Денежные поля допускают Infinity, который сериализуется в null | Small |
| T9 | Medium | Тип admin-товара и форма не учитывают документированную nullable-предоплату | Small |
| T10 | Medium | Устаревший индекс подсказки поиска вызывает исключение в обработчике Enter | Small |
| T11 | Medium | Непарсируемая дата одного отзыва обрушает страницу товара | Small |
| T12 | Low | Числовые параметры URL не различаются с валидными ID/страницами | Small |

Для дефектов на границе данных явно указано условие отказа. Синтетические
входы подтверждают поведение frontend, но не доказывают, что production API
уже возвращает такие ответы. Backend-код, отсутствующие endpoint/данные,
серверные ограничения и серверная функциональность не оценивались.

## 2. Discovery и scope

Сначала изучены `AGENTS.md`, `package.json`, `tsconfig.json`, `.eslintrc.json`,
`next.config.mjs`, `playwright.config.ts` и релевантные разделы
`docs/architecture.md`, `docs/api-and-auth.md`, `docs/testing.md`.
Дополнительных `AGENTS.md` в исходном дереве проекта вне зависимостей не найдено.
Поиск `any`, `unknown`, assertions, non-null assertions, parsing, storage,
Promise/async/catch и error boundaries определил связанные модули.
После этого прослежены цепочки данных и обработчики, перечисленные ниже;
последовательного чтения всего репозитория не проводилось.

Стек: Next.js App Router, React, TypeScript strict, MUI/Emotion,
TanStack Query, Zustand, React Hook Form, Axios, npm и Playwright.
`strict: true` включён; `noUncheckedIndexedAccess` отдельно не включён.
Поэтому индексирование массива не добавляет `undefined` к типу элемента,
что существенно для T7/T10. Это не самостоятельное замечание к конфигурации.

Локально установлены Node.js 24.15.0, TypeScript 5.9.3, React 19.2.4,
TanStack Query 5.90.20, Zustand 5.0.11, RHF 7.71.1, Axios 1.18.1 и
Next.js 15.5.21. Последний отличается от объявленного `^15.5.24`;
результаты проверок относятся к установленному окружению.
Зависимости не устанавливались и не обновлялись.

| Область | Проверенные связи |
| --- | --- |
| HTTP и ошибки | `shared/api/axios/instances.ts` → runtime `/api/config`, auth adapter, очередь refresh → `shared/lib/errorHandler.ts` → Query/UI |
| Сессия и storage | `session/api/authApi.ts` → `model/authStore.ts` + cookies/Zustand persist → `src/app/providers/AuthProvider.tsx` и auth pages/dialogs |
| DTO и изображения | product/image/order/user API → DTO mapping, metadata enrichment → product form, upload hooks и product details |
| Формы и преобразования | `entities/product/model/form.ts`, product submit/draft, admin product editor, shipping settings, price-range filter |
| Заказы и async-результаты | order-create payload/result/submit, payment/confirmation/shipping/receipt actions, checkout result dialog, cart synchronization |
| URL и навигация | product/seller/category routes, product query hooks, admin filters/pagination, settings tabs, redirect sanitizer, search hook |
| Runtime fallback | root/global/admin error boundaries, RequestFeedback/ErrorState, product reviews, order date parsing, payment proof parsing |

Проверены также относящиеся к этим цепочкам model/browser fixtures и ранее
сохранённые аудиты, чтобы отличать уже описанные риски от новых наблюдений.

## 3. Подтверждённые проблемы

### T1. Превью изображения получает ID по позиции другого массива

**Severity:** High. **Effort:** Small.

**Файлы и место:**
- `src/widgets/create-product-form/model/useProductForm.tsx:43–63` — `buildInitialImages`; `189–197`, `238–248` — инициализация и вычисление удаления;
- `src/entities/image/api/imageApi.ts:46–50` — metadata возвращается без отсутствующих записей;
- `src/entities/product/model/useProductMutations.ts:22–32` — сохранение связей и удаление файлов.

**Проблема и доказательство:** image API сохраняет порядок доступных metadata,
но фильтрует отсутствующие записи. Форма затем берёт ID не из `image.id`,
а из `imageIds[index]`, с fallback на сам индекс. При `imageIds=[11,22]`
и доступной metadata только для `22` получается `{id:11, preview:preview22}`.
Изолированный вызов текущего `buildInitialImages` подтвердил этот результат.
Это допустимый для самого frontend частичный результат чтения, а не
предположение о новом API-поле.

**Почему это проблема и последствия:** сохранение другой правки отправляет
ID `11`, исключая отображавшееся изображение `22` из связей товара. Удаление
этого превью после добавления нового фото может включить `11` в
`imageIdsToDelete`, то есть удалить файл, который пользователь не выбирал.
Тип `InitialImageUploadState` не защищает от неверного соответствия ID/preview.

**Исправление на frontend:** связывать metadata по её `id`, сверяя его с
исходным набором. Не создавать ID из индекса. Сохранять исходные ID без
доступного превью отдельно либо блокировать запись связей до успешного retry;
отсутствие metadata не должно означать намерение удалить изображение.
Добавить регрессию для отсутствующей первой/средней metadata и удаления превью.

### T2. Таймаут Promise не удаляет запрос из очереди refresh

**Severity:** High. **Effort:** Medium.

**Файл и место:** `src/shared/api/axios/instances.ts:71–88, 247–270, 297–305`.
Пересечение: S3 в `02-server-state.md`.

**Проблема и доказательство:** очередь отвергает Promise через 10 секунд,
но subscriber остаётся зарегистрирован. Поздний refresh вызывает callback,
который вычисляет `instance(originalRequest)` до вызова `resolve` уже
завершённого Promise. Повтор реально запускается, хотя `resolve` больше
не меняет результат. Изолированный прогон с настоящим Axios, mock adapter
и виртуальным таймером подтвердил: второй POST получил `REFRESH_TIMEOUT`,
после позднего refresh тот же POST был отправлен повторно.

**Почему это проблема и последствия:** UI сообщает об отказе и может разрешить
новую попытку, а прежняя операция записи ещё выполняется в фоне. Возможны
дубли операций и рассогласование отображаемого результата с фактической записью.
`reject()` не является отменой оставшейся асинхронной работы.

**Исправление на frontend:** хранить очередь как записи с состоянием завершения,
таймером и unsubscribe; при timeout/abort удалять запись. Проверять завершение
и `AbortSignal` непосредственно перед replay, очищать таймер при любом исходе.
Проверить сценарии позднего refresh, отмены query и смены сессии.

### T3. Модель результата checkout не выражает неопределённый исход

**Severity:** High. **Effort:** Medium.

**Файлы и место:**
- `src/features/order-create/model/types.ts:4–11` — `OrderResult`;
- `src/features/order-create/model/useOrderCreateSubmit.ts:143–185, 256–297` — catch и retry;
- `src/features/order-create/model/orderCreatePayload.ts:28–40` — `retryable !== false`;
- `src/widgets/checkout/ui/CheckoutResultDialog.tsx:62–64, 272–284` — доступный повтор.

Пересечение: S4 в `02-server-state.md`; это отличается от F3 про устаревший
payload повторного оформления.

**Проблема и доказательство:** после потери ответа на POST, включая
`ApiError` с `TIMEOUT`/`NETWORK_ERROR`, `submitSingleOrder` возвращает
`status:"error"` без `retryable:false`. Фильтр относит такой результат к
повторяемым; UI предлагает повторный POST. Тип с двумя статусами и независимыми
optional-полями не позволяет отличить подтверждённый отказ от неизвестного исхода.
Изолированный вызов текущего callback и `getFailedOrders` подтвердил для
TIMEOUT и NETWORK_ERROR результат `error` без запрета retry и сохранённый
payload повторного POST; настоящие заказы не отправлялись.

**Почему это проблема и последствия:** отсутствие ответа не подтверждает,
что заказ не создан. Пользователь может повторно создать заказ. Это дефект
клиентского решения о retry; замечание не требует нового backend endpoint
или серверной идемпотентности.

**Исправление на frontend:** представить результат discriminated union
с отдельным состоянием неопределённого исхода. В этом состоянии блокировать
повтор POST и предложить обновить существующий список покупок/корзину.
Если доступные данные не позволяют однозначно сверить запись, сохранить
неопределённость и объяснить её пользователю, не объявлять операцию неудачной.
Известные отклонения API и ошибки до отправки обрабатывать отдельно.

### T4. Сбой persistence становится сбоем авторизации

**Severity:** Medium. **Effort:** Small.

**Файлы и место:**
- `src/entities/session/model/authStore.ts:44–68, 96–140, 159–182` — `set` внутри persist;
- `src/app/providers/AuthProvider.tsx:35–37` — `void initializeAuth()`;
- установленный `node_modules/zustand/middleware.js:358–373` — синхронная запись после изменения state.

**Проблема и доказательство:** стандартное persist-хранилище может успешно
открыться и прочитаться, но отвергнуть `setItem`, например из-за квоты.
Такое исключение возникает из `set`, хотя auth API уже завершился успешно.
В catch `login` повторный `set` снова пытается записать storage и выбрасывает
исключение. Прогон с установленным Zustand и хранилищем, где `getItem`
работает, а `setItem` бросает ошибку, подтвердил rejected login и
`isAuthenticated:false` после успешного mock API.

**Почему это проблема и последствия:** локальный кеш объекта `user` определяет
успех основной авторизации; cookies уже могут быть сохранены, а UI сообщает
об отказе. Аналогичный второй `set` в catch инициализации может отклонить
Promise, который AuthProvider игнорирует через `void`. Error boundary
не подменяет обработку rejected Promise из effect.

**Исправление на frontend:** задать безопасный storage adapter для persist:
перехватывать ошибки чтения/записи/удаления и продолжать работу с памятью.
Persistence не должна отменять подтверждённую авторизацию. Нормализовать
ошибку инициализации на одном уровне; для остающегося rejected Promise
предусмотреть catch. Не требовать обязательного localStorage для auth.

### T5. Runtime config может удерживать все запросы в pending

**Severity:** Medium. **Effort:** Small.

**Файл и место:** `src/shared/api/axios/instances.ts:132–168, 175–190, 335–349`.

**Проблема и доказательство:** `getApiBaseUrl()` выполняет `fetch("/api/config")`
без deadline/AbortSignal. Каждый HTTP-запрос сначала ждёт его в request
interceptor. Axios timeout `30000` действует на последующий транспорт,
а не на ожидание interceptor. С mock fetch, который остаётся pending,
запрос с явным Axios timeout `10 ms` через `80 ms` всё ещё не завершился;
adapter ни разу не был вызван. Порядок подтверждён также локальным кодом Axios.

**Почему это проблема и последствия:** при зависшем config-запросе каталог,
вход и другие операции могут оставаться в loading без error/retry. Это
frontend endpoint текущего Next-приложения; backend marketplace не затрагивается.

**Исправление на frontend:** ограничить fetch и чтение config по времени,
отменять их через AbortController и возвращать нормализованную ошибку.
Объединять конкурентную загрузку одним in-flight Promise, очищая его после
неудачи, чтобы retry мог восстановить работу. Проверять `apiUrl` как строку
в этой единственной точке конфигурации, не вводя проверки всех API responses.

### T6. `as` в auth catch не проверяет payload ошибки

**Severity:** Medium. **Effort:** Small.

**Файлы и место:**
- `src/entities/session/api/authApi.ts:64–79, 98–110` — assertions и чтение `.code`;
- `src/entities/session/model/types.ts:24–33` — cooldown/result;
- `src/features/auth/ui/VerificationCodeDialog.tsx:55–60, 136–140` — таймер.

**Проблема и доказательство:** запросы login/resend обходят нормализацию
через `_skipErrorTransform`. На 403/429 код приводит `response.data`
к интерфейсу, затем обращается к `.code`. Для пустого body (`null`)
оба метода выбрасывают `TypeError`, заменяя исходный AxiosError.
Для `{code:"VERIFICATION_COOLDOWN",retryAfterSec:"forever"}` метод возвращает
строку через объявленное числовое поле. Оба случая воспроизведены локально.

**Почему это проблема и последствия:** error handling сам порождает новую
ошибку, теряет транспортный статус и скрывает действительный отказ.
Некорректный cooldown может отображаться как NaN или не запустить ожидаемый
таймер, разрешая повтор раньше ожидаемого. Это устойчивость клиента к ошибочным
ответам, включая ответы промежуточной инфраструктуры, а не требование менять API.

**Исправление на frontend:** читать body как `unknown`, проверить объект и
только нужные поля сценария. Для cooldown требовать конечное неотрицательное
число секунд. При несовпадении payload сохранять/нормализовать исходную ошибку
через существующий `transformToApiError`. Представить success/cooldown result
union, чтобы обязательные поля не были независимыми optional-полями.

### T7. Upload без ID выглядит успешным благодаря небезопасному индексированию

**Severity:** Medium. **Effort:** Small.

**Файлы и место:**
- `src/entities/image/api/imageApi.ts:81–89` — типизированный ответ upload;
- `src/features/image-upload/model/useMultipleImageUpload.ts:107–119, 180–185` — `response[0]`, фильтрация и assertion;
- `src/features/order-payment/ui/PaymentDialog.tsx:234–237` — аналогичное чтение первого ID;
- `src/widgets/create-product-form/model/productFormSubmit.ts:59–64, 83–98` — проверка только длины массива ID.

**Проблема и доказательство:** даже значение `[]` соответствует `number[]`.
Индекс `response[0]` фактически даёт `undefined`, хотя TypeScript здесь считает
его числом. Hook записывает его в state с объявленным `number|null`, снимает
loading и не устанавливает error. Фильтр `id !== null` оставляет undefined,
а `as number` закрепляет ложный тип. Hook-прогон подтвердил `imageIds=[undefined]`,
`hasError=false`, `isUploading=false`; JSON-сериализация массива даёт `[null]`.

**Почему это проблема и последствия:** preview выглядит загруженным, проверка
наличия изображения проходит, но product payload содержит невалидную ссылку.
В payment dialog загрузка также завершается без понятного сообщения, хотя
используемого ID нет. Проверка результата upload практически необходима:
от него зависит следующая операция записи.

**Исправление на frontend:** в image API проверять, что upload одного файла
вернул используемый положительный safe-integer ID; при отсутствии ID отклонять
результат с нормализованной ошибкой. Не устанавливать success-state без ID.
Производные `imageIds` формировать с реальным type guard вместо `!== null`
и assertion. Сохранять понятный error/retry state для пустого ответа.

### T8. Проверка положительности не исключает Infinity

**Severity:** Medium. **Effort:** Small.

**Файлы и место:**
- `src/entities/product/model/form.ts:82–109, 133–144` — price/prepayment rules и mapping;
- `src/widgets/create-product-form/ui/components/ProductSaleFields.tsx:109–133, 191–217` — текстовые поля без ограничения длины;
- `src/widgets/dashboard-settings/ui/shipping-methods/ShippingMethodCard.tsx:91–119` и `model.ts:109–130` — стоимость доставки;
- `src/widgets/product-catalog/ui/price-range-filter/model.ts:7–14`, `usePriceRangeFilter.ts:174–195` — денежный фильтр.

**Проблема и доказательство:** вставка строки из 400 цифр `9` проходит regex
цены и проверку `parseFloat(value)>0`. Она преобразуется в `Infinity`.
Предоплата обрабатывается так же; парсер фильтра возвращает Infinity, а
blocking validation доставки не считает её ошибкой. Эти результаты
подтверждены вызовами текущих правил и mapping. В JSON неограниченное число
превращается в `null`, хотя payload объявляет `number`.

**Почему это проблема и последствия:** frontend принимает ввод и отправляет
значение другой семантики; ошибки дальнейшей записи/фильтрации возникают
после успешной локальной валидации. Для этого сценария не нужны нарушения
API-контракта со стороны сервера или предположение о максимальной backend-цене.

**Исправление на frontend:** после преобразования проверять `Number.isFinite`
в правилах и перед созданием payload. Для целочисленных локальных значений
также применять `Number.isSafeInteger`. Показывать ошибку поля, сохранять ввод.
Не добавлять произвольный бизнес-лимит цены; техническая конечность числа
не зависит от неизвестных backend validation rules.

### T9. Nullable-предоплата противоречит admin DTO и default values

**Severity:** Medium. **Effort:** Small.

**Файлы и место:**
- `src/entities/product/model/admin.ts:3–17` — `prepaymentAmount:number`;
- `src/entities/product/api/adminProductApi.ts:9–10` — unchecked DTO;
- `src/features/admin-product-management/ui/AdminProductEditor.tsx:40–46, 84–85` — перенос в форму и validator;
- `docs/testing.md:29–32` — запись о товарах с `prepaymentAmount=null`;
- `tests/e2e/helpers/admin.ts:4–8` — fixture только с числовой предоплатой.

**Проблема и доказательство:** документация проекта фиксирует локальные
товары EXTERNAL_PRODUCT с null в предоплате. DTO объявляет только number,
а editor передаёт значение напрямую в default values. Реальный validator
из JSX (`Number.isFinite(value)`) извлечён и проверен: null отвергается,
0 принимается. Nullable-вход не имеет явной обработки в форме.

**Почему это проблема и последствия:** если административное чтение отдаёт
документированное значение без нормализации, даже изменение названия
блокируется ошибкой «Введите число» в поле, которое пользователь не менял.
Утверждение о конкретном production admin response не делается: реальный
endpoint в этом аудите не вызывался. Несоответствие документированных данных
и клиентской модели подтверждено; путь попадания null в editor следует из кода.

**Исправление на frontend:** отдельно типизировать nullable DTO и числовую
модель формы. Явно обработать отсутствие предоплаты при mapping; при семантике
«без предоплаты» показывать 0 в существующей форме и сохранять текущий числовой
PUT payload. Не распространять null на другие поля/endpoint без доказательства
контракта. Добавить fixture nullable-входа и проверку редактирования другого поля.

### T10. Refetch подсказок оставляет индекс за пределами массива

**Severity:** Medium. **Effort:** Small.

**Файлы и место:**
- `src/widgets/header/model/useSearch.ts:54–60, 89–91, 180–184`;
- `src/entities/product/model/useProductQueries.ts:47–64` — query подсказок;
- `src/app/providers/QueryProvider.tsx:17–21` — refetch при reconnect.

**Проблема и доказательство:** индекс сбрасывается при изменении поискового
текста, но не при изменении массива подсказок для того же текста. После
фонового обновления трёх подсказок до одной индекс 2 сохраняется. Enter
проверяет только `>=0`, передаёт `undefined` из массива в `submitSearch`,
где вызывается `.trim()`. Изолированный hook-прогон с сохранённым state
и сменой query data подтвердил `TypeError`.

**Почему это проблема и последствия:** клавиатурный выбор перестаёт работать
в обработчике события; route error boundary такое исключение не исправляет.
Причина возможна при обычном refetch существующего API и не требует
некорректного формата ответа. Тип `string[]` создаёт ложную безопасность
при обращении по неконтролируемому индексу.

**Исправление на frontend:** сбрасывать/ограничивать индекс при изменении
данных; непосредственно перед выбором проверять найденную строку и границы.
Если подсказка исчезла, выполнить поиск по текущему вводу либо снять выделение.
Проверить уменьшение списка после reconnect/refetch между ArrowDown и Enter.

### T11. Форматирование даты отзыва не имеет безопасного результата

**Severity:** Medium. **Effort:** Small.

**Файлы и место:**
- `src/widgets/product-details/ui/productDetailsFormatters.ts:50–54` — `formatReviewDate`;
- `src/widgets/product-details/ui/ProductReviewsSection.tsx:96, 254` — вызов при render;
- `src/widgets/product-details/ui/ProductDetailsContent.tsx` — отложенный блок отзывов без отдельной boundary.

**Проблема и доказательство:** тип `createdAt:string` не гарантирует
валидность Date. `Intl.DateTimeFormat.format(new Date("invalid-date"))`
в текущем formatter выбрасывает `RangeError: Invalid time value`.
Вызов текущей функции подтвердил исключение. Аналогичного crash нет в
order date parser, который проверяет конечный timestamp.

**Почему это проблема и последствия:** одна повреждённая или нераспознаваемая
браузером дата при монтировании отзывов заменяет всю страницу root error
fallback, включая рабочую карточку и покупку. Возврат тех же данных снова
воспроизводит падение. Некорректные даты production в этом аудите не обнаруживались;
подтверждён локальный отказ frontend на точечном повреждении данных.

**Исправление на frontend:** перед Intl-format проверить конечность timestamp;
при невалидной дате отобразить нейтральный fallback без потери отзыва/карточки.
Поддерживать только подтверждённые форматы даты, не угадывать новый backend-формат.
Проверить ISO, пустую и невалидную строку. Валидация всех полей ответа не нужна.

### T12. `Number` не является проверкой параметра URL

**Severity:** Low. **Effort:** Small.

**Файлы и место:**
- `src/widgets/admin-orders/ui/AdminOrders.tsx:20–22, 50` — page/agent и пагинация;
- `src/entities/product/model/useProductQueries.ts:29–38` — product ID;
- `app/(user)/dashboard/products/[id]/edit/page.tsx:12–14` — передача route param;
- `src/widgets/create-product-form/model/useProductForm.tsx:88–95, 285–291, 317–318` и `model/productFormSubmit.ts:93–98` — edit state и submit.

**Проблема и доказательство:** `page=Infinity` проходит `Math.max`/`Math.floor`
и передаётся в запрос. «Назад» вычисляет `Infinity-1`, снова Infinity.
Product query принимает дробный положительный ID (`1.5`), а для `bad`/`0`
только выключает query, не давая явного invalid-state. После загрузки
категорий edit-композиция может показать пустую заполняемую форму: product
loading/error ложны, наличие product не входит в submit readiness.
Submit использует `Number(productId)` и способен отправить PUT с NaN/0
вместо проверенного ID. Parser/query-поведение проверено изолированно;
PUT в ходе аудита не выполнялся.

**Почему это проблема и последствия:** некорректный URL превращается в
неработающую пагинацию или редактирование без загруженного объекта и лишний
невалидный запрос. Это frontend parsing и использование существующего API;
отсутствие ресурса или нового endpoint не считается проблемой backend.

**Исправление на frontend:** проверять конечные safe-integer page/ID,
неотрицательность page и положительность ID. Некорректную page нормализовать
к 0; для invalid edit ID показать локальный fallback/not-found и заблокировать
запись до подтверждённой загрузки товара. Повторить защиту ID на submit boundary.
Существующие routes перестраивать не требуется.

## 4. Что проверено без самостоятельных замечаний

- Единственный найденный явный TypeScript `any` — `Record<string,any>` в
  `entities/account/model/queryKeys.ts:5`. Конкретного текущего runtime-дефекта
  от него не выявлено; косметическое ужесточение типа не включено в findings.
- `unknown` в error handlers, API-error details и generic callbacks в основном
  сужается через `instanceof`/guards. Само его использование не является проблемой.
  Assertions над DTO рассматриваются только там, где выявлено последствие.
- `as const`, MUI event casts для фиксированного набора значений, generic
  RHF default values и текущие вызовы `attachImages<T,R>` не показали отдельного
  дефекта. Переписывание generic API ради формы типов не предлагается.
- `participantId!` в `useSellerAccounts` защищён `enabled`, а assertion
  `item.field!` в списке требований используется после условной проверки.
  Само наличие `!` не считается доказательством crash. Ручной вызов disabled
  query потребовал бы дополнительной проверки, но проблемный текущий сценарий
  использования не подтверждён.
- Известные `OrderStatus` покрыты `Record<OrderStatus,...>` и текущими switch.
  Неполного switch для уже объявленного статуса не обнаружено. Нет практического
  основания требовать schema validation всего ответа только из-за union types.
- Settings tabs и admin order status проверяют принадлежность набору после
  чтения URL. Redirect sanitizer проверяет локальный адрес, origin и запрещённые
  символы; external/tracking URL helpers ограничивают протоколы HTTP/HTTPS.
- Единственный найденный прямой JSON parsing browser-черновика товара окружён
  try/catch и разбором полей из `unknown`; storage errors имеют memory fallback.
  Age verification перехватывает отказ sessionStorage. T4 относится к отдельному
  механизму Zustand persistence, а не к этим обработчикам.
- Order date parser обрабатывает ISO/локальный формат, проверяет календарные
  компоненты и возвращает null при невалидном timestamp. Payment proof проверяет
  типы строк, MIME и base64 перед построением data URL.
- Root, global и admin error boundaries присутствуют. Global fallback не зависит
  от app providers. Отсутствие дополнительных boundaries само по себе не
  записано в недостатки; T10/T11 описывают конкретные разные пути исключения.
- Большинство `mutateAsync` в формах имеют catch; `mutate` используется с
  обработчиками/видимым mutation error. `void refetch()` не признан автоматически
  unhandled rejection: обычный TanStack refetch возвращает query result,
  а ошибки читаются из query state. Отмена Axios отдельно пропускается как cancel.
- Cart quantity synchronization использует revisions и состояние необходимости
  проверки после ошибки чтения. Settings разделяют успешную запись и неуспешный
  refetch, блокируя новую запись до retry чтения.

Существенные уже описанные риски сессии, приватного кэша, общего черновика,
raw-error logging и вторичного cleanup после успешной записи остаются в
`02-server-state.md` / `03-state-and-forms.md`; они не объявляются исправленными
прохождением TypeScript. Для подробностей и приоритета следует использовать
эти отчёты вместе с текущим. T2/T3 включены здесь полностью из-за риска
повторных операций записи.

## 5. Проверки и ограничения доказательств

Выполнены:

- `npm run lint` — успешно, exit code 0;
- `node_modules/.bin/tsc.cmd -p tsconfig.json --noEmit --incremental false` —
  успешно, exit code 0; tsbuildinfo не перезаписывался;
- 8 групп изолированных воспроизведений: image ID mapping, finite-number rules,
  auth error payload, empty upload, stale suggestion index, review date,
  pending config fetch и отказ auth persistence;
- дополнительные проверки actual admin JSX validator, shipping validation,
  Infinity page и product query enabled для invalid/fractional ID;
- отдельное воспроизведение T2 с настоящим Axios, mock adapter и виртуальным
  10-секундным таймером — rejected запрос действительно повторён позже.
- проверка T3: текущий callback `submitSingleOrder` и `getFailedOrders`
  оставляют TIMEOUT/NETWORK_ERROR повторяемыми, сохраняя payload.

Диагностические скрипты выполнялись из временного каталога, transpile текущих
TS/TSX — в памяти, внешние модули/данные подменялись только для изоляции.
Новых файлов тестов и изменений production-кода в репозитории нет.
Hook-проверки использовали минимальный state harness, поэтому не являются
полным browser acceptance или проверкой всех React effects. Доказательства
UI-ветки T3 и части T12 основаны также на трассировке текущего кода.
Исходные auth данные и настоящие credentials не использовались.

Полный `npm run typecheck` с `next typegen` не запускался: выполнен отдельно
компилятор без генерации/записи типов. Значит свежая генерация route types
не подтверждена. Production build не был нужен для подтверждения найденных
проблем и не запускался. Smoke/e2e suite не запускался: приложение и реальный
backend не поднимались, записи не выполнялись. FSD-границы не менялись,
`architecture:check` для documentation-only результата не запускался.

Перед исправлениями наиболее полезны точечные регрессии T1–T3 и tests
на nullable/empty/overflow значения; прохождение lint/tsc уже показало,
что они не заменяют эти проверки поведения.

## 6. Изменения и документация

Добавлен только `docs/frontend-audit/06-types-reliability.md`.
Production-код, конфигурация, зависимости и предыдущие отчёты не изменялись.
`AGENTS.md`, `docs/architecture.md`, `docs/testing.md`, `docs/api-and-auth.md`
не обновлялись: аудит не меняет действующие архитектурные правила,
API-контракты, UI-поведение, setup или test workflow.
Коммиты и push не выполнялись.
