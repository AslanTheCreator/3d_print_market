# Аудит frontend: React и Next.js App Router

Дата: 01.10.2026. Проект: Figurzilla, версия package.json — 1.27.0.
Ревизия: `8377939`. До аудита в рабочем дереве уже находились незакоммиченные
отчёты `01-architecture.md`, `02-server-state.md`, `03-state-and-forms.md`.

## 1. Результат

Найдено пять проблем, исправимых на frontend без изменения backend.
Critical и High в рамках этого этапа не обнаружены.

| ID | Severity | Проблема | Effort |
| --- | --- | --- | --- |
| R1 | Medium | Controlled input поиска теряет символы при асинхронном обновлении URL | Small |
| R2 | Medium | Фоновая ошибка списка заказов размонтирует открытые диалоги и уничтожает ввод | Medium |
| R3 | Medium | Retry карточки товара обновляет RSC, но оставляет ошибку клиентского query | Small |
| R4 | Medium | Эффект infinite scroll повторно запускает упавшую следующую страницу | Small |
| R5 | Medium | Заведомо некорректные адреса каталога не используют route-level not-found | Small |

Главные риски — потеря пользовательского ввода и ненадёжное восстановление
после ошибок. Рабочую композицию Server/Client Components переписывать не требуется.
Backend endpoints, недостающая серверная функциональность и ограничения API
не являются замечаниями этого отчёта.

## 2. Discovery и scope

Сначала изучены `AGENTS.md`, `package.json`, `tsconfig.json`,
`next.config.mjs`, `.eslintrc.json`, `playwright.config.ts`, `middleware.ts`,
релевантные разделы `docs/architecture.md`, `docs/api-and-auth.md`,
`docs/testing.md` и предыдущие отчёты. Затем построена карта route-файлов,
мест использования React effects, browser APIs, navigation hooks,
`Suspense`, `next/dynamic`, `next/image` и metadata.

Объявленный стек: Next.js `^15.5.24`, React/React DOM `^19.2.4`,
MUI, Emotion, TanStack Query v5, Zustand, React Hook Form, Axios и Playwright.
TypeScript работает в strict mode. Для фактических runtime-проверок
использовались уже установленные Next.js **15.5.21**, React **19.2.4**,
TanStack Query **5.90.20**, MUI/MUI Next.js **5.18.0**. Установленный Next.js
не соответствует объявленному диапазону; зависимости в ходе аудита не менялись.
Проверки не следует считать прогоном на объявленном Next.js 15.5.24.

| Область | Связи и выбранные файлы |
| --- | --- |
| Общая оболочка | `app/layout.tsx` → `AppProviders` → MUI cache/theme, AuthProvider, QueryProvider, AdminCacheBoundary → AppLayout |
| Серверный каталог | `(home)/page.tsx`, category/detail pages → server public API → сериализуемые initial props → client widgets/query hooks |
| Routing и состояния сегментов | `middleware.ts`, dashboard/admin layouts, root/admin error boundaries, global-error, not-found, локальные loading.tsx |
| Поиск и URL | SearchProducts, useSearch, useUrlState, AdminProducts, настройки с tabs/search params |
| Lifecycle и async | OrdersWidget, PaymentDialog, product form/draft, upload hooks, profile/address forms, auth dialogs |
| Отложенный UI и изображения | DeferredProductSection, RelatedProducts, ImageGallery/fullscreen hook, ProductCard, next/image configuration |
| Проверки сценариев | Существующие auth-return-path, product-search-session, admin, order-payment и mobileAccount/admin fixture helpers |

Глубокое чтение ограничено этими цепочками. Проверка query state нужна здесь
для оценки lifecycle React-компонентов и взаимодействия `router.refresh()`
с сохранённым Client Component state; полный повтор API/state-аудитов не проводился.

## 3. Подтверждённые проблемы

### R1. Controlled input поиска теряет символы при обновлении URL

**Severity:** Medium. **Effort:** Small.

**Файлы и место:**
[AdminProducts.tsx](../../src/widgets/admin-products/ui/AdminProducts.tsx),
строки 30–32, 42;
[useUrlState.ts](../../src/shared/lib/navigation/useUrlState.ts), строки 3–12.

**Проблема:** `TextField.value` берётся непосредственно из
`useSearchParams().get("q")`. `onChange` вызывает только `router.replace()`.
Синхронного обновления состояния введённого текста нет.

**Почему это проблема:** навигация App Router асинхронна. До применения нового
URL controlled input получает прежний `value`, и React возвращает его в DOM.
Следующий символ вводится в уже сброшенное поле. Это нарушение семантики
controlled input, а не вопрос предпочтительного хранения фильтров.
Правило подтверждено [документацией React об input](https://react.dev/reference/react-dom/components/input).

**Доказательство:** Playwright, действующий `/admin/products`, mock API.
При задержке RSC-навигации на 400 мс и вводе `dragon` с интервалом 5 мс
поле и URL содержали `n`, а не `dragon`. Запись данных не выполнялась.

**Последствия:** быстрый ввод и редактирование строки дают неверный поиск;
создаётся навигация на каждый символ, хотя фильтрация товаров здесь локальная.

**Исправление на frontend:** использовать локальный draft текста и обновлять
его синхронно в `onChange`. Согласовывать URL через debounce или явный submit,
сохраняя остальные параметры и сбрасывая страницу одним обновлением.
Синхронизировать draft при внешней смене URL/Back/Forward, не заменяя текущий
ввод запоздавшим результатом собственной навигации.

### R2. Фоновая ошибка заказов уничтожает открытый диалог и его draft

**Severity:** Medium. **Effort:** Medium.

**Файлы и место:**
[OrdersWidget.tsx](../../src/widgets/orders/ui/OrdersWidget.tsx), строки 93–106,
122–164;
[useOrderQueries.ts](../../src/entities/order/model/useOrderQueries.ts),
строки 28–51;
[CustomerActions.tsx](../../src/widgets/orders/ui/CustomerActions.tsx),
композиция PaymentDialog;
[PaymentDialog.tsx](../../src/features/order-payment/ui/PaymentDialog.tsx),
строки 91–102, 158–164.

**Проблема:** `OrdersWidget` при любом `query.error` возвращает отдельную
ветку с Alert, даже когда query сохраняет ранее успешно загруженные orders.
Таблица, мобильные карточки и находящиеся внутри них action-компоненты
размонтируются вместе с диалогами.

**Почему это проблема:** запросы заказов обновляются на focus/reconnect.
Обычная ошибка фонового чтения становится событием уничтожения локального
состояния совершенно другого сценария — оплаты, отмены или отзыва.
Блокировка закрытия внутри самого диалога не защищает от unmount родителя.

**Доказательство:** Playwright открыл оплату существующего mock-заказа,
ввёл комментарий, затем перевёл фоновые GET заказов в 500 и инициировал
reconnect для устаревшего query. Диалог исчез. После успешного retry списка
и повторного открытия комментарий был пустым. Платёжные POST не отправлялись.

**Последствия:** теряются комментарий, выбранные реквизиты и локальная связь
с загруженным чеком. При pending-операции пользователь может потерять контекст
её результата; это следствие unmount, отдельно не воспроизводившееся в браузере.

**Исправление на frontend:** полный экран ошибки показывать при отсутствии
успешных данных. При ошибке refetch сохранять дерево и drafts, показывать
уведомление с retry. До подтверждения актуального статуса блокировать действия,
которые нельзя безопасно выполнять по устаревшим orders. Pending-операции
и уже введённый текст должны переживать ошибку обновления списка.
Не требуется переносить все формы в глобальный store.

### R3. Retry товара оставляет ошибку клиентского query после успешного SSR

**Severity:** Medium. **Effort:** Small.

**Файлы и место:**
[ProductDetailsWidget.tsx](../../src/widgets/product-details/ui/ProductDetailsWidget.tsx),
строки 29–43;
[useProductDetails.ts](../../src/entities/product/model/useProductDetails.ts),
строки 31–39, 75;
[useProductQueries.ts](../../src/entities/product/model/useProductQueries.ts),
строки 28–40;
[detail/page.tsx](../../app/(catalog)/catalog/[id]/detail/page.tsx), строки 86–115.

**Проблема:** «Обновить» вызывает только `router.refresh()`. Новые серверные
данные передаются как `initialData`, но существующий query с тем же ключом
не заменяется и не перечитывается этой операцией.

**Почему это проблема:** App Router объединяет новый RSC payload с текущим
деревом, сохраняя соответствующий клиентский state, включая QueryClient.
`initialData` инициализирует cache entry, а не синхронизирует его при каждой
смене props. Поведение соответствует
[Next.js 15 useRouter](https://nextjs.org/docs/15/app/api-reference/functions/use-router)
и [TanStack Query initial data](https://tanstack.com/query/v5/docs/framework/react/guides/initial-query-data).

**Доказательство:** после успешного SSR товара 901 mock-клиентский refetch
завершился ошибкой после трёх попыток. Затем mock снова разрешил чтение,
а серверный fixture продолжал отдавать товар успешно. Нажатие «Обновить»
выполнило RSC-запрос, но число клиентских GET осталось **3 → 3**, и экран
«Не удалось открыть товар» сохранился. Изолированный QueryObserver также
сохранил старые data и `isError=true` после обновления options.initialData.

**Последствия:** видимый retry не восстанавливает карточку после временного
клиентского сбоя; пользователю приходится полностью перезагружать документ.

**Исправление на frontend:** разделить retry серверной начальной загрузки
и клиентского refetch. Для query error предоставить `refetch` из hook и
вызывать его с pending-state; для исходной серверной ошибки оставить
обновление route. Если свежие SSR props должны обновлять уже существующий
cache, явно согласовывать их по ключу и времени успешной загрузки.

### R4. Infinite scroll повторяет упавшую страницу без действия пользователя

**Severity:** Medium. **Effort:** Small.

**Файлы и место:**
[InfiniteScroll.tsx](../../src/shared/ui/infinite-scroll/InfiniteScroll.tsx),
строки 24–30;
[useInfiniteProducts.ts](../../src/entities/product/model/useInfiniteProducts.ts),
queryFn/getNextPageParam;
потребители: HomeProducts, CategoryProducts, SearchProducts,
SellerPageClient и RelatedProducts.

**Проблема:** эффект запускает `onLoadMore`, когда sentinel пересекает viewport,
есть следующая страница и её запрос не pending. Состояние ошибки не участвует
в условии. После отказа `hasNextPage` остаётся true по последней успешной странице,
а `isFetchingNextPage` снова становится false.

**Почему это проблема:** изменение pending true → false повторно запускает
effect с тем же видимым sentinel. Это новая операция fetchNextPage, поэтому
ограниченное число retries одного query не ограничивает весь цикл.
Ветка общего ErrorState может дополнительно уменьшить высоту списка и
приблизить sentinel к viewport.

**Доказательство уровня hook:** действующий `InfiniteScroll.tsx` исполнен
через TypeScript transpilation/VM с детерминированным runner зависимостей
effect, постоянным пересечением и настоящим InfiniteQueryObserver.
Четыре последовательных завершения запроса ошибкой вызвали четыре новые
загрузки даже при `retry:false`; итог — `hasNextPage=true`, `isError=true`.
React effect/IntersectionObserver в этой проверке подменены, браузерная
геометрия ею не проверяется. Отдельный Playwright-сценарий на действующем
поиске с успешной первой страницей из десяти товаров и HTTP 500 следующей
страницы подтвердил **семь** запросов хвоста после одного попадания sentinel
в viewport, без нажатия retry. Проверка завершалась при достижении этого
порога; это не верхняя граница числа повторов.

**Последствия:** повторные запросы и загрузочные состояния при устойчивом
сбое страницы, лишняя нагрузка и нестабильный error UI.

**Исправление на frontend:** передавать состояние ошибки следующей страницы
в InfiniteScroll и приостанавливать автоматическую загрузку до явного retry
или смены query. Сохранять уже загруженные страницы, показывать ошибку хвоста
и повторять именно fetchNextPage; различать её с ошибкой первой страницы.

### R5. Некорректные адреса каталога обходят not-found

**Severity:** Medium. **Effort:** Small.

**Файлы и место:**
[detail/page.tsx](../../app/(catalog)/catalog/[id]/detail/page.tsx), строки 14–21,
73–83, 90–100;
[category/page.tsx](../../app/(catalog)/catalog/category/[...slug]/page.tsx),
строки 43–53, 89–100, 126–140;
[CategoryProducts.tsx](../../src/widgets/product-catalog/ui/CategoryProducts.tsx),
строки 198–211;
[app/not-found.tsx](../../app/not-found.tsx).

**Проблема:** нечисловой product ID превращается в обычный Error, который
getInitialProduct проглатывает и передаёт в client widget как initialError.
Неразбираемый category slug превращается в `categoryPath=null` и обычный JSX
«Категория не найдена». Ни одна цепочка не вызывает `notFound()`.
В metadata товара любой сбой чтения, включая временный, называется отсутствием товара.

**Почему это проблема:** frontend уже знает, что такие параметры некорректны,
но не использует имеющийся not-found и смешивает постоянную ошибку адреса
с временной недоступностью. Error Boundary этого не исправит: ошибки пойманы.

**Доказательство:** HTTP-проверка dev-приложения вернула **200** для
`/catalog/not-a-number/detail` с текстом ошибки товара и для
`/catalog/category/not-a-category` с текстом отсутствующей категории.
Первый случай не требует запроса backend; второй проверялся с локальным fixture.
Отсутствие endpoint у fixture само по себе не является замечанием.

**Последствия:** неверная семантика недействительных маршрутов, обход общего
404 UI и предложение бессмысленного retry для некорректного product ID.
Временная ошибка серверного чтения также получает misleading metadata «Товар не найден».

**Исправление на frontend:** валидировать параметры в Server Component
и вызывать `notFound()` вне catch, который может перехватить его управляющее
исключение. Разделять ошибку параметров, подтверждённое отсутствие основного
товара и временную ошибку загрузки; 404 вспомогательного изображения не доказывает
отсутствие товара. Для временного сбоя сохранить error/retry UI с корректным заголовком.
Не добавлять неподтверждённые backend error codes.

`notFound()` задаёт not-found UI/noindex, но HTTP status зависит от streaming:
Next.js возвращает 404 для нестримингового ответа и может сохранить 200 для
уже начавшегося потока. Поэтому исправление нужно проверять с учётом момента
валидации, а не обещать безусловный 404 после начала streaming.
См. [Next.js 15 notFound](https://nextjs.org/docs/15/app/api-reference/functions/not-found)
и [not-found convention](https://nextjs.org/docs/15/app/api-reference/file-conventions/not-found).

## 4. Что проверено без серьёзных новых замечаний

| Область | Вывод и предел проверки |
| --- | --- |
| Server Components | Корневые routes/layouts серверные; параметры Next.js 15 представлены Promise и await. Home/category SSR явно dynamic, detail использует React cache между metadata и page |
| Client boundaries | Providers требуют client context; AppLayout использует pathname, store и overlays. Серверные страницы передаются через children, а не импортируются внутрь client shell: высокое расположение boundary не превращает их автоматически в Client Components; см. [Next.js Server/Client composition](https://nextjs.org/docs/15/app/getting-started/server-and-client-components) |
| Передача Server → Client | В проверенных цепочках передаются объекты/массивы, строки, числа и flags, включая timestamp. Передача функций/классов из Server Component в client props не найдена |
| SSR/CSR и hydration | Первоначальные auth/overlay состояния детерминированы, витрина преимущественно CSS-first. В проверенных browser-сценариях не обнаружено отдельной подтверждённой hydration-проблемы; полного прогона всех маршрутов/viewport не было |
| Browser-only API | Проверенные window/document/clipboard/storage вызовы размещены в effects, обработчиках либо guarded utilities. Например, UnauthorizedState вычисляет путь по window при действии пользователя, а не безусловно при SSR |
| Effects и dependency arrays | Debounce поиска, scroll listener, viewport listeners, gallery keyboard и draft async restoration имеют зависимости/cleanup. `useLayoutEffect` в app/src не найден. Дополнительный effect не предлагается только ради переноса вычисляемых данных в state |
| Derived state и custom hooks | Filters, суммы и отбор данных преимущественно вычисляются напрямую/useMemo; реальных проблем props drilling или размера компонента, требующих отдельного замечания, не установлено |
| Composition и keys | Action slots и children используются в catalog/detail/admin. Основные доменные списки имеют ID-keys. Индексные keys в фиксированных skeleton/code digits не считаются дефектом сами по себе |
| Suspense | Поиск/auth, header search, settings и admin покрывают useSearchParams подходящими Suspense boundaries. Отсутствие отдельного loading.tsx у чисто клиентской формы не является дефектом, если её query UI обрабатывает loading |
| Loading и error boundaries | Есть loading.tsx home/category/detail/admin, app/error.tsx, admin/error.tsx и global-error с собственными html/body без зависимости от сломанного ThemeProvider |
| Auth routing/layouts | Middleware сохраняет pathname и query в redirect. Проверка вложенного edit URL получила 307 с полным назначением. Предположение о потере deep link по hardcoded fallback dashboard layout исключено |
| Dynamic imports | Browser overlays/fullscreen вынесены через next/dynamic с ssr:false внутри client modules; такие импорты на уровне функции render не обнаружены |
| next/image | Есть sizes, резервирование размеров через fill-контейнер/width/height, fallback по onError и remotePatterns. Нет основания требовать next/image для каждого data/blob/admin-proof изображения |
| Metadata | Серверные metadata/generateMetadata, canonical, noindex auth/search/admin и robots/sitemap присутствуют; исключение по not-found/error-классификации описано в R5 |

Ранее установленные проблемы lifecycle не объявлены повторно новыми находками:
незащищённый уход через клиентскую навигацию, reset формы после submit,
late upload/reset аватара и таймер закрытия отзыва описаны в
[03-state-and-forms.md](./03-state-and-forms.md) (F2, F4, F8–F11).
Незавершённые read-запросы при смене фильтра/route и session races описаны в
[02-server-state.md](./02-server-state.md) (S2, S13).
R2 касается отдельной цепочки списка заказов и подтверждён браузерно.

## 5. Проверки и ограничения доказательств

Production-код, зависимости, комментарии и конфигурация не изменялись.
Production build не запускался. Использованы локальный Next dev server,
существующий серверный Playwright fixture и перехват клиентского API в браузере.
Проверки не обращались к реальному backend и не создавали товары/заказы/платежи.

Для воспроизведения создавался временный Playwright spec; после аудита он удалён.
Проверки запускались через `npx playwright test` с Chromium, одним worker,
без retries теста и на выделенных портах 4310/4311.

| Проверка | Результат |
| --- | --- |
| Invalid product ID и category slug, HTTP dev | Оба ответа 200 с обычным error/empty JSX |
| Nested auth redirect с query | Полный путь сохранён middleware; кандидат на проблему отклонён |
| Admin search, задержка RSC 400 мс, ввод dragon | В поле/URL осталось n |
| Draft оплаты → фоновая 500 заказов → retry | Диалог размонтирован, комментарий после восстановления пуст |
| Ошибка client product refetch → здоровый RSC refresh | Нового client GET нет; error UI остаётся |
| QueryObserver + замена initialData в options | Существующие data/error не заменены |
| Действующий infinite scroll effect + InfiniteQueryObserver, retry:false | Четыре новых запуска после четырёх отказов при постоянном пересечении |
| Infinite scroll в браузере, первая страница успешна, следующая возвращает 500 | Семь запросов хвоста без ручного retry; тест остановлен по порогу |

Это точечные воспроизведения, а не полный regression suite. Предварительная
проверка auth redirect имела неверное ожидание и была исправлена после чтения
middleware; итоговый контроль проходит. Предварительные browser-прогоны R4
не завершили воспроизведение из-за неправильного пути cursor в mock handler
и несовпадения selector со строкой inline style. После исправления harness
целевой сценарий прошёл. Он запускался отдельно от детерминированной модели effect.

Lint/typecheck/architecture:check и полный smoke/e2e не запускались:
итоговое изменение содержит только Markdown-отчёт, код/config не менялись.
Перед завершением проверены итоговый diff/status, ссылки на локальные файлы
и отсутствие временного spec в изменениях.

## 6. Порядок исправления и документация

1. R1 и R2: устранить потерю ввода и разрыв lifecycle открытых форм.
2. R3 и R4: сделать восстановление после ошибки управляемым и конечным.
3. R5: согласовать валидацию маршрутов, not-found и error metadata.

После исправлений нужны целевые регрессии: быстрый посимвольный ввод с
медленной навигацией; фоновая ошибка при открытом диалоге; retry query при
здоровом SSR; отказ следующей страницы при видимом sentinel; недействительный
route до/после начала streaming. Для изменений React/route-кода выполнить
проверки согласно `docs/testing.md`; это рекомендации для исправлений, не
запущенные проверки текущего документа.

Документация дополнена этим отчётом. `AGENTS.md`, `docs/architecture.md`,
`docs/api-and-auth.md` и `docs/testing.md` не менялись: аудит не меняет текущую
архитектуру, контракты, публичное поведение или workflow. Рекомендации не
описываются как уже реализованные исправления.
