# Аудит frontend: производительность

Дата: 2026-10-01. Область: только frontend Figurzilla.
Production-код, конфигурация, зависимости и backend не изменялись.

## 1. Результат

Подтверждены семь механизмов лишней работы: шесть новых замечаний и ранее
выявленный цикл запросов infinite scroll. Critical / High проблем в изученном
scope не обнаружено. Влияние на production LCP/INP и время React commit не
измерялось: severity оценивает механизм и охват, а не измеренную деградацию CWV.

| ID | Severity | Проблема | Effort |
| --- | --- | --- | --- |
| P1 | Medium | Каждый consumer корзины повторно синхронизирует весь quantity store | Medium |
| P2 | Medium | Каждая товарная кнопка вычисляет неиспользуемые суммы всей корзины | Small |
| P3 | Medium | Несколько изменений количества вызывают последовательные полные чтения корзины | Medium |
| P4 | Medium | Infinite scroll автоматически повторяет упавшую страницу без ограничения цикла | Small |
| P5 | Medium | Счётчики шапки загружают ненужные метаданные изображений | Medium |
| P6 | Medium | `sizes` товарной карточки завышает ширину изображения в многоколоночной сетке | Small |
| P7 | Low | Мобильный логотип загружает тяжёлый SVG для изображения 44×44 px | Small |

Отдельно выделены два риска роста: неограниченный DOM каталога и двойное
рендерирование длинной истории заказов. Они не объявлены текущими измеренными
тормозами. Микрооптимизации в основной список не включены.

## 2. Discovery и scope

Изучены `AGENTS.md`, `package.json`, lockfile, `next.config.mjs`, `tsconfig.json`,
документы architecture/api-and-auth/testing и прежний performance-аудит.
Отчёты предыдущих этапов использованы для сверки уже известных проблем.

Версии из lockfile: Next.js 15.5.25, React 19.2.4, MUI Material 5.18.0,
TanStack Query 5.90.20, Zustand 5.0.11, Framer Motion 12.34.0,
Swiper 12.1.3, Lodash 4.18.1. `package.json` содержит диапазоны версий;
они не приравнивались к установленным версиям. TypeScript работает в strict mode.

Discovery сначала определил следующие цепочки для глубокого анализа:

| Область | Связи и проверенный scope |
| --- | --- |
| Общий клиентский JS | RootLayout → AppProviders/AppLayout → Header/Footer/mobile navigation; общая тема, Query/Auth/Notification providers |
| Каталог | Home/category SSR → initialData → useProductsInfinite → productApi → attachImages → ProductCatalog → карточка и действия; search/seller/user-products |
| Корзина | AddToCartButton → useAddToCartFeature + useCartQuantity → useCartChecks → useCartProducts; mutations и persisted quantity store |
| Изображения | ProductCard, ImageGallery/MainImage/ThumbnailList/fullscreen, getImageUrl, image metadata API, remotePatterns и brand assets |
| Дополнительные запросы | Desktop badges/pending actions; deferred related products; checkout delivery queries по продавцам |
| Коллекции и вычисления | Infinite pages, карточки, desktop/mobile orders, фильтрация/сортировка, checkout totals и draft формы товара |
| Code splitting | Route entries, dynamic overlays, deferred sections, Framer Motion/Swiper/Lodash/Lucide/MUI imports |

Не проводилось последовательное чтение всего репозитория. Backend latency,
серверные ограничения API, отсутствие aggregate endpoints и серверной
пагинации не включены в список frontend-проблем.

## 3. Подтверждённые проблемы

### P1. Синхронизация quantity store выполняется в каждом consumer корзины

**Severity:** Medium. **Effort:** Medium.

**Файлы и место:**
[useCartQueries.ts](../../src/entities/cart/model/useCartQueries.ts#L26), effect;
[cartQuantityStore.ts](../../src/entities/cart/model/cartQuantityStore.ts#L153),
`syncWithServer` и persist;
[AddToCartButton.tsx](../../src/features/add-to-cart/ui/AddToCartButton.tsx#L65),
два пути к `useCartChecks` через feature и quantity hook.

**Проблема:** каждый вызов `useCartProducts` имеет собственный effect,
преобразующий полный query result и вызывающий `syncWithServer`.
Одна AddToCartButton вызывает этот hook дважды. Дедупликация сетевого query
не дедуплицирует React effects. Они выполняются и при `enabled:false`,
если в общем query cache уже есть данные.

**Почему это проблема:** `syncWithServer` создаёт новые `items`/`syncStates`,
для каждого server item ищет локальный через `find`, уведомляет store и
персистит `items`. Повтор одинакового snapshot не является no-op.
Количество этой работы растёт с числом смонтированных кнопок.

**Доказательство:** при изолированном исполнении действующих hooks/store
18 карточек × 2 consumers и 100 позиций корзины дали 36 effects,
36 store notifications и 36 вызовов `storage.setItem` на один snapshot.
Отключённый observer с cached data отдельно дал одну запись и notification.
React, Query result и storage в этой проверке подменены; это подсчёт операций,
не browser benchmark и не число React commits.

**Последствия:** лишние синхронные сериализации/storage writes и проверки
подписок при загрузке корзины, refetch и добавлении новых карточек;
особенно чувствительно для checkout, подписанного на весь `syncStates`.

**Исправление на frontend:** выполнять query → quantity projection один раз
на подтверждённое обновление cache, с lifecycle на уровне сессии/корзины,
а consumers оставить читающими. Сохранить обработку pending revisions,
rollback и logout. Дополнительно исключать запись одинакового snapshot и
индексировать локальные количества один раз внутри reconciliation.
Не заменять server state вторым независимым Zustand cache.

### P2. Товарные кнопки вычисляют суммы корзины, которые не используют

**Severity:** Medium. **Effort:** Small.

**Файлы и место:**
[useCartChecks.ts](../../src/entities/cart/model/useCartChecks.ts#L14), два reduce;
[cartQuantityStore.ts](../../src/entities/cart/model/cartQuantityStore.ts#L117),
`getQuantity`;
[useAddToCartFeature.ts](../../src/features/add-to-cart/model/useAddToCartFeature.ts#L30)
и [useCartQuantity.ts](../../src/entities/cart/model/useCartQuantity.ts#L20), consumers.

**Проблема:** даже consumers, которым нужен только `isProductInCart` или
число позиций, вычисляют `getCartTotal` и `getTotalQuantity` на каждом render.
Оба reduce для каждой позиции вызывают `getQuantity`, внутри которого `find`
по всему массиву quantity items. В каждой товарной кнопке это происходит дважды.

**Почему это проблема:** для C позиций корзины и Q локальных количеств
агрегация стоит O(C×Q) на consumer, O(N×C×Q) для N карточек.
При сопоставимых C/Q это квадратичный обход корзины, повторяемый для кнопок.
В проверке 18 карточек и 100 позиций дали **7 200 вызовов getQuantity**
только ради двух сумм, без учёта поиска принадлежности товара и selectors.

**Последствия:** лишняя CPU-работа при монтировании страниц каталога,
обновлении cart query и повторных renders кнопок; стоимость растёт вместе
с уже загруженным каталогом, даже если корзина остаётся прежнего размера.

**Исправление на frontend:** отделить membership/count от totals, чтобы
кнопки не вычисляли общие суммы. Общие totals считать только там, где они
отображаются, через индекс productId → quantity и один линейный обход.
Membership можно получать из общего набора ID, создаваемого при изменении
cart data. Мемоизация имеет смысл именно для переиспользования этого индекса
между renders с теми же данными; `React.memo` кнопок не устраняет лишние reduce
при первом render или обновлении их собственных query subscriptions.

### P3. Quantity mutations ставят полные чтения корзины в последовательную очередь

**Severity:** Medium. **Effort:** Medium.

**Файлы и место:**
[useCartMutations.ts](../../src/entities/cart/model/useCartMutations.ts#L15),
`enqueueCartRefresh`, `refreshCart`, onSuccess/onError;
[cartApi.ts](../../src/entities/cart/api/cartApi.ts), `getCart`;
[useCartQuantity.ts](../../src/entities/cart/model/useCartQuantity.ts), debounce.

**Проблема:** после каждого PUT количества запускается отдельное полное
чтение корзины. Общая очередь сериализует все эти чтения, но не объединяет их.
Debounce 500 ms действует внутри одной кнопки, поэтому изменения разных
товаров остаются независимыми заданиями очереди.

**Почему это проблема:** каждое чтение повторяет `/basket/find`, затем
метаданные изображений для всей корзины. Следующее чтение ждёт завершения
всей предыдущей цепочки. Проверка callbacks действующей mutation с
подменённым API: три успешных изменения → три getCart, максимум одно
одновременное чтение. Это подтверждает механизм очереди, не HTTP latency.

**Последствия:** burst изменений порождает повторные payload/metadata requests;
валидация последних позиций ждёт накопленной очереди, продлевая pending state
и блокировку checkout. P1 дополнительно размножает локальную обработку ответов.

**Исправление на frontend:** сохранять последовательность PUT одного товара,
но объединять подтверждающее чтение для группы завершённых mutations.
Учитывать generation/revision: чтение, начавшееся до нового PUT, не должно
считаться его подтверждением; для таких изменений нужен один последующий
проход. Не убирать серверную проверку актуальных количеств/остатков и не
снимать pending только на основании успешного PUT.

### P4. Ошибка следующей страницы не останавливает infinite scroll

**Severity:** Medium. **Effort:** Small.

**Файлы и место:**
[InfiniteScroll.tsx](../../src/shared/ui/infinite-scroll/InfiniteScroll.tsx#L26),
условие effect;
[useInfiniteProducts.ts](../../src/entities/product/model/useInfiniteProducts.ts),
пагинация; HomeProducts/CategoryProducts/SearchProducts и другие consumers.

**Проблема:** visible sentinel + hasNextPage + отсутствие pending запускают
fetchNextPage. После ошибки hasNextPage остаётся true по последней успешной
странице, pending снимается, а effect запускает следующий запрос того же хвоста.
Ошибка следующей страницы не участвует в условии остановки.

**Почему это проблема:** retry policy ограничивает одну операцию query,
но не новые операции, которые повторно запускает InfiniteScroll.
Повторная изолированная проверка текущего hook с настоящим
InfiniteQueryObserver дала четыре запроса упавшего хвоста после успешной
первой страницы даже при `retry:false`; hasNextPage осталось true.
Четыре — выбранный предел проверки, не предел цикла.

**Последствия:** запросы продолжаются при устойчивой ошибке, возникают
повторные loading transitions и лишняя обработка ошибок/рендеринг.

**Исправление на frontend:** передать `isFetchNextPageError` в механизм
автозагрузки и остановить его до явного retry или смены query. Сохранить
успешные страницы, ошибку отображать у хвоста; повторять fetchNextPage,
а не перечитывать весь накопленный список.

Это та же проблема, что [R4 предыдущего этапа](./04-react-next.md#r4-infinite-scroll-повторяет-упавшую-страницу-без-действия-пользователя),
а не дополнительный независимый дефект.

### P5. Header badges ждут изображения, которые не показывают

**Severity:** Medium. **Effort:** Medium.

**Файлы и место:**
[HeaderActions.tsx](../../src/widgets/header/ui/HeaderActions.tsx), desktop query enablement;
[useUserPendingActions.ts](../../src/widgets/header/model/pendingActions/useUserPendingActions.ts),
renewal/seller/customer queries;
[orderApi.ts](../../src/entities/order/api/orderApi.ts), `attachOrderProductImages`;
[productApi.ts](../../src/entities/product/api/productApi.ts), `getUserProducts`;
[attachImages.ts](../../src/entities/image/lib/attachImages.ts).

**Проблема:** после mount desktop header авторизованного пользователя
запрашивает seller orders, customer orders и до 100 собственных товаров
для счётчиков. Все три функции обязательно обогащают ответ image metadata.
Расчёт групп использует status/availability/expirationDate, а не изображения.
Lazy popover не откладывает эти query: они включаются до его открытия.

**Почему это проблема:** при наличии image IDs это до трёх дополнительных
запросов `/images/metadata` в холодном cache; каждый следует за своим
основным запросом и задерживает завершение query. Metadata не имеет общего
кэша внутри attachImages. Ошибка metadata также ломает query счётчика.
Основные queries запускаются параллельно, поэтому общего последовательного
waterfall между всеми тремя списками здесь нет.

**Последствия:** лишние запросы и payload на обычных desktop-страницах,
ожидание необязательного enrichment и зависимость badges от image service.
Повторные stale refetch воспроизводят эту работу.

**Исправление на frontend:** переиспользовать подтверждённые DTO основных
endpoint в query cache для счётчиков, а bulk metadata загружать отдельно,
когда изображения нужны странице заказов/товаров. Обеспечить общий cache
основных списков и не запускать второй запрос того же списка ради UI.
Не предлагать несуществующий backend count endpoint и не менять состав
счётчиков без продуктового решения.

### P6. Размеры изображений карточек не соответствуют адаптивной сетке

**Severity:** Medium. **Effort:** Small.

**Файлы и место:**
[ProductCard.tsx](../../src/entities/product/ui/ProductCard.tsx#L120), `sizes`;
[ProductGrid.tsx](../../src/entities/product/ui/ProductGrid.tsx), auto-fill grid;
[theme.ts](../../src/app/config/theme.ts#L230), Container geometry.

**Проблема:** после 600 px ProductCard сообщает браузеру размер `33vw`,
хотя сетка использует auto-fill с минимумом 156/190 px, а не три колонки.
Например, при viewport 1440 px Container с padding 32 px оставляет 1376 px;
шесть колонок с gap 20 px дают около 213 px на карточку. `33vw` сообщает
480 px, более чем вдвое больше её реальной ширины.

**Почему это проблема:** next/image выбирает responsive asset по declared
slot size и DPR, а не по измеренной ширине CSS grid. Для этого примера при
DPR 1 среди текущих srcset candidates есть 384/640 px: требуемые по `sizes`
480 px направляют выбор к более крупному варианту. Конкретный выбор браузера
и transfer требуют network trace; увеличение байтов не измерялось.

**Последствия:** избыточное разрешение загружаемых/декодируемых изображений
на многоколоночных viewport, умноженное на количество просмотренных товаров.
Lazy loading откладывает запрос, но не исправляет неверный slot size.

**Исправление на frontend:** согласовать sizes с числом колонок, Container
max-width, padding и gap на существующих breakpoints. Проверить фактические
`clientWidth`, `currentSrc` и transfer на 600/900/1376/1504 px и DPR 1/2.
Не заменять значение одним фиксированным размером для всех viewport.

### P7. Мобильный логотип слишком тяжёлый для своего размера отображения

**Severity:** Low. **Effort:** Small.

**Файлы и место:**
[Header.tsx](../../src/widgets/header/ui/Header.tsx#L131), mobile/auth logo;
[logo.svg](../../src/shared/assets/logo/logo.svg).

**Проблема:** используемый мобильный SVG имеет размер **143 854 B** и
отображается в 44×44 px. Локальная gzip-компрессия даёт **60 231 B**;
это синтетический размер, не наблюдённый network transfer. Для сравнения,
активный desktop WebP — 23 650 B, variable font — 41 572 B.

**Почему это проблема:** проверка getImageProps установленного Next.js
показала для `.svg` исходный src без srcset. Width/height/sizes у этого
изображения не превращают большой SVG в уменьшенный растровый вариант.
Логотип добавляет заметный объём на холодном мобильном посещении.

**Последствия:** дополнительный transfer и обработка сложного SVG в общей
шапке; повторное посещение с browser cache менее чувствительно.

**Исправление на frontend:** оптимизировать существующий SVG с визуальной
проверкой в 44/88 px: убрать ненужные данные, сократить path precision без
видимого изменения. Если этого недостаточно, подготовить компактный asset
того же знака для текущего размера отображения. Не подменять его desktop
логотипом с другой композицией.

Старые `logo-desktop.png` (946 540 B) и `logo-old.svg` не используются текущей
шапкой; их наличие в репозитории само по себе не является browser load issue.

## 4. Потенциальные проблемы при росте

### G1. Infinite pagination не ограничивает смонтированный каталог

**Severity:** Medium при длинных сессиях просмотра. **Effort:** Medium.

**Файлы/модуль:** `useInfiniteProducts.ts`, HomeProducts/CategoryProducts/
SearchProducts, `ProductCatalog.tsx:83`, UserProductsList и seller catalog.

**Проблема и условие:** все pages сохраняются и flatten-ятся; каждый
загруженный товар остаётся смонтирован вместе с MUI-деревом, query/store
subscriptions и actions. Pagination ограничивает ответ одной страницы,
но не общий DOM. При сотнях/тысячах просмотренных товаров растут
память, работа reconciliation и число consumers из P1/P2. Stale refetch
infinite query также может последовательно перечитать накопленные страницы.

**Последствия:** задержки добавления страниц, обновления общей корзины и
возврата к stale каталогу. На первых 10–20 товарах такая деградация не доказана.

**Исправление на frontend:** после P1/P2 профилировать 200/500/1000 карточек.
При подтверждённой деградации внедрять windowing сетки с сохранением высот,
scroll restoration, фокуса и состояния количества либо доступную постраничную
навигацию на существующих cursors. Не добавлять `maxPages` изолированно:
удаление верхних страниц без управления геометрией вызывает скачок прокрутки.
Новая библиотека требует согласования по правилам проекта.

### G2. Обе responsive-коллекции заказов строятся полностью

**Severity:** Medium при большой истории заказов. **Effort:** Medium.

**Файлы/модуль:**
[OrdersWidget.tsx](../../src/widgets/orders/ui/OrdersWidget.tsx#L125),
OrdersTable и `MobileOrders.tsx:55`.

**Проблема и условие:** desktop список и mobile карточки одновременно
монтируются, а CSS скрывает одну ветку. Обе ветки map-ят свои полные visible
orders, создают actions и форматируют данные; локального ограничения числа
строк нет. Это дублирует React/DOM-работу при длинной истории, хотя скрытая
ветка не требует обычного layout/paint. При нескольких заказах выигрыш
от усложнения реализации не подтверждён.

**Последствия:** избыточный DOM/память и commit cost при обновлениях длинных
списков; обе ветки продолжают существовать при открытии деталей заказа.

**Исправление на frontend:** ограничить отображаемое окно локальной
пагинацией уже полученных данных либо адаптивной виртуализацией. Сохранить
CSS-first SSR/hydration и состояние при resize; не выбирать JSX-ветку
render-time useMediaQuery вопреки текущим правилам. Отсутствие серверной
пагинации и объём обязательного API-ответа не являются этим замечанием.

## 5. Проверено без серьёзных новых замечаний

| Область | Вывод |
| --- | --- |
| MUI/Lodash/Lucide imports и tree shaking | В установленном Next `dist/server/config.js:848–881` есть modularizeImports для MUI icons/Lodash и optimizePackageImports для MUI/Lucide. Named imports сами по себе не доказывают попадание всей библиотеки в bundle. Массовая замена импортов не обоснована |
| Тяжёлые зависимости | Framer Motion найден в DashboardHomeWidget, Swiper — gallery/reviews. Нет доказательства, что они входят в initial JS всех страниц; размер package на диске не использован как browser bundle size |
| Route splitting / client boundaries | App Router routes сохраняются; client providers с RSC children не делают автоматически всё содержимое client code. Каталог, checkout и формы используют клиентский state обоснованно; blanket removal `use client` не предлагается |
| Dynamic/lazy imports | Fullscreen viewer и header drawer/popover грузятся по открытию; reviews/related используют dynamic components внутри IntersectionObserver boundary. Сам факт наличия динамического импорта не выдаётся за измеренный выигрыш в kB |
| Query deduplication | Общие ключи cart/favorites/profile позволяют переиспользовать сетевые ответы. Множество useQuery consumers не объявлено множеством одинаковых HTTP-запросов; P1 касается effects, P2 — вычислений |
| Waterfalls | Product DTO → image metadata зависит от неизвестных заранее IDs; category lookup → products зависит от categoryId. Полностью распараллелить их без новых данных нельзя. P5 касается только enrichment, который потребителю не нужен |
| Checkout delivery | useQueries запускает lookup параллельно по продавцам, а не последовательно по каждому товару. Группировка и totals используют Map/мемоизацию по данным; оснований дополнительно оборачивать всё в useMemo нет |
| next/image и image variants | Используются medium/thumbnail, оригинал доступен fullscreen; есть remotePatterns, error fallback и резервирование геометрии. Нет основания считать любой fallback на original нарушением или требовать next/image для blob/proof изображений |
| CLS | У карточек/галереи есть aspect ratio, у logo — размеры; есть session-window CLS gate в mobile tests. Новый подтверждённый CLS-дефект не найден. Deferred sections с minHeight 1 требуют измерения при scroll/slow load, но не объявлены CWV-регрессией по одному JSX |
| Context / Zustand | NotificationProvider отдаёт стабильный memoized context action. Quantity selectors возвращают конкретные значения; useAuth подписан на весь store, но сам этот факт без дорогого сценария не включён как новый дефект |
| Синхронные операции/формы | Не найдены подтверждённые long tasks. Draft формы пишется синхронно, однако сериализует значения/ID, а не binary image data; изображения ограничены. Нужность debounce для этого draft без профиля не доказана |
| Prefetch | ProductCard имеет prefetch=false. Обычные навигационные ссылки не объявлены дефектом без подтверждения чрезмерного speculative traffic |
| Server cache / force-dynamic | Home/category запрашивают гостевую выдачу на сервере; отсутствие межзапросного cache не объявлено ошибкой без согласованного срока свежести. Нельзя предлагать общий cache авторизованной выдачи или ломать session isolation ради скорости |

## 6. Проверки и ограничения доказательств

Выполнены статические проверки связей/импортов и изолированное исполнение
текущего TypeScript через TypeScript transpilation/VM без изменения исходников:

| Проверка | Результат и граница доказательства |
| --- | --- |
| Quantity consumers | 18 карточек × 2 hooks; 100 cart items: 36 effects, store notifications и storage writes; 7 200 getQuantity calls. Hook dependencies React/Query и storage подменены; время INP/commit не измерялось |
| Disabled observer | Cached data + enabled:false всё равно вызвали sync effect, notification и storage write |
| Mutation queue | Три success callbacks → три full-cart reads, max concurrent reads 1; API/QueryClient подменены, реальных HTTP-запросов не было |
| Infinite scroll | Настоящий InfiniteQueryObserver + действующие pagination/scroll hooks, подменённые React effect и observer: первый success + четыре ошибки хвоста, retry:false; hasNextPage=true и isFetchNextPageError=true |
| Image props/assets | Проверены srcset generation установленного Next, отсутствие SVG srcset, размеры текущих logo/font assets и синтетический gzip SVG |
| Diff и ссылки | Проверены новый Markdown, относительные file links и line anchors; остальные исходники не менялись |

Production build не запускался: для найденных механизмов он не нужен.
Текущий `.next/build-manifest.json` содержит Turbopack development/HMR chunks,
при этом рядом остаётся BUILD_ID прежней сборки; такой каталог не использован
для подсчёта текущего production First Load JS. Исторические показатели
из `docs/performance-audit.md` не перенесены как новые результаты.

Lint/typecheck/architecture check и полный smoke/e2e suite не запускались:
изменён только отчёт, а точечные проверки не изменяют поведение приложения.
Новый browser benchmark не проводился. Результаты предыдущего browser-аудита
не выдаются за тесты, выполненные на этом этапе.

Не измерены актуальные production bundle bytes, network transfer, mobile
LCP/INP/TBT и стоимость Метрики/Webvisor. Метрика подключается afterInteractive
в витринной ветке; в существующих E2E tag подменяется пустым ответом, поэтому
эти тесты не оценивают её production overhead. Для количественной оценки
нужны актуальный production artifact и репрезентативные изображения/данные.

После исправлений достаточно целевого замера: cart sync/quantity interactions,
ошибка хвоста infinite scroll, холодные desktop badges и mobile/desktop images.
Для G1/G2 отдельно проверить большие коллекции. Связывать trace с revision,
viewport/DPR, throttling и количеством данных; оптимизации bundle/React.memo
принимать по измеренному выигрышу, а не по наличию большой зависимости.

## 7. Порядок исправления и документация

Сначала P4 как неконтролируемые запросы при сбое; затем P1/P2 и P3 как
повторная обработка корзины и подтверждение quantities. Далее P5/P6 и P7.
G1/G2 внедрять после профилирования соответствующего размера коллекции.

Документация дополнена только этим отчётом.
`AGENTS.md`, `docs/architecture.md`, `docs/testing.md` и `docs/api-and-auth.md`
не требуют обновления: аудит не изменил архитектуру, API, UI-поведение,
тестовую стратегию или setup. Прежний performance-аудит сохранён как
исторический документ; новые выводы не представлены в нём как исправления.
