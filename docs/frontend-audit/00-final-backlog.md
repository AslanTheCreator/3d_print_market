# Итоговый технический backlog

Проверено 02.10.2026 по исходникам рабочей копии на базе `83779391dbb61178fb3ffc7acf109ac4e26a57a6`. Основание — отчёты [01](./01-architecture.md), [02](./02-server-state.md), [03](./03-state-and-forms.md), [04](./04-react-next.md), [05](./05-performance.md), [06](./06-types-reliability.md), [07](./07-ux-accessibility.md), [08](./08-code-quality.md); их ID ниже служат трассировкой, а не доказательством. Backend и его изменения исключены.

Существенные цепочки перечитаны в коде. Изолированные Node-прогоны фактических TS-модулей с mock API подтвердили refresh races/replay, checkout retry, ошибки image mapping, submit/reset, persistence, optimistic rollback, частичный успех сохранения, infinite scroll и форматирование. Использовались установленные Axios, Zustand и TanStack Query; React hooks в модульных сценариях подменялись. Это не браузерное воспроизведение и не подтверждение production-инцидентов. Browser/e2e/build в этом финальном аудите не запускались; результаты предыдущих отчётов не выдаются за новые прогоны.

`Risk` означает риск регрессии при исправлении. Зависимости обозначены ID задач; обязательные проверки этапов приведены после backlog.

## P0

Подтверждённых проблем уровня Critical, требующих отдельного P0, не найдено. Условные сценарии чужой сессии, повторной записи и потери данных включены в P1; эксплуатация или массовая потеря production-данных не установлены.

## P1

### B01. Ограничить refresh и replay поколением сессии и временем жизни запроса

**Priority:** P1\
**Severity:** High\
**Effort:** Medium\
**Risk:** High

**Проблема**\
Refresh сохраняет токены и меняет auth state после logout/нового login. Инициаторы refresh не имеют общего pending promise. Таймаут ожидающего запроса отклоняет promise, но сохраняет subscriber: поздний refresh всё равно отправляет запрос. Подтверждено исполнением store/API и настоящих Axios interceptors. Источники: S2, S3, T2, соответствующая часть Q4.

**Где**\
[authApi.ts](../../src/entities/session/api/authApi.ts), `refreshAccessToken`; [authStore.ts](../../src/entities/session/model/authStore.ts), `initializeAuth/refreshToken/login/logout`; [tokenRefreshManager.ts](../../src/shared/lib/token/tokenRefreshManager.ts), `performRefresh/stop`; [instances.ts](../../src/shared/api/axios/instances.ts), refresh subscribers и обе ветки replay.

**Почему это проблема**\
Ответ A может заменить сессию B. POST может выполниться после сообщения о таймауте и наложиться на ручной повтор.

**Root cause**\
Нет общего владельца асинхронного refresh и терминального состояния ожидающей операции.

**Что нужно изменить**\
Объединить refresh на поколение аккаунта в session layer. Проверять поколение до записи токенов, store updates, обработки ошибок и планирования следующего таймера. Сделать ожидание refresh отменяемым: удалить subscriber и timer при timeout/abort/смене аккаунта; перед replay повторно проверить актуальность. Сохранить HTTP adapter и направление FSD. Отмена HTTP сама по себе не заменяет проверку поколения.

**Зависимости**\
Нет. Согласовать публичный lifecycle с B02; B03 опирается на отсутствие позднего replay.

**Definition of Done**

- Timer, initialization и конкурентные 401 делят один refresh текущего поколения.
- Поздние success/error A после logout или login B не меняют B и не запускают старые таймеры.
- Истёкший/отменённый queued request никогда не отправляется; проверены leader и queue.
- Контролируемые promises/таймеры воспроизводят эти пересечения; действующие login/refresh/logout tests проходят.

### B02. Изолировать приватный кэш, callbacks и черновики между аккаунтами

**Priority:** P1\
**Severity:** High\
**Effort:** Large\
**Risk:** High

**Проблема**\
Обычные приватные queries имеют общие ключи; очистка зависит от кнопки logout. `AdminCacheBoundary` защищает только admin. Черновик товара использует общий storage key и память без владельца. Ручной `refreshCart` может записать результат после смены аккаунта. Прогон logout сохранил профиль в QueryClient и draft. Источники: A1, S1, F1, часть Q4.

**Где**\
[AuthProvider.tsx](../../src/app/providers/AuthProvider.tsx), [AdminCacheBoundary.tsx](../../src/app/providers/AdminCacheBoundary.tsx); query keys/hooks сущностей `user`, `cart`, `favorite`, `order`, `address`, `account`, `transfer`, `social-network`; [useCartMutations.ts](../../src/entities/cart/model/useCartMutations.ts); [productFormDraft.ts](../../src/widgets/create-product-form/model/productFormDraft.ts), [useProductFormDraftState.ts](../../src/widgets/create-product-form/model/useProductFormDraftState.ts).

**Почему это проблема**\
Следующий аккаунт может увидеть чужие адреса, заказы или draft; checkout может использовать чужие локальные данные. Доступ к чужим данным на backend этим не утверждается.

**Root cause**\
У приватных данных нет единой границы владельца и очистки независимо от UI.

**Что нужно изменить**\
В app layer централизовать смену account scope, отмену/удаление старых queries и очистку клиентских проекций. Применить scope к приватным ключам и ручным cache writes/rollback; поздний ответ должен обращаться только к своему scope либо игнорироваться. Передавать scope через композицию, не импортировать session в соседние entities. Для persisted draft использовать подтверждённого владельца или удаление при завершении сессии; legacy draft без владельца не восстанавливать новому пользователю. Протянуть AbortSignal по затронутым приватным чтениям, но не полагаться только на транспортную отмену.

**Зависимости**\
B01, B13. На этот контракт затем опираются B03, B04, B16, B23, B28.

**Definition of Done**

- UI logout, автоматическое завершение и A → B одинаково изолируют все перечисленные данные.
- Поздние GET, optimistic rollback и ручной refresh корзины A не заполняют кэш/проекции B.
- Draft A не восстанавливается B, включая reload и legacy storage; memory previews освобождаются по правилам B04.
- Успешный refresh того же аккаунта не очищает ввод и приватные данные.
- Browser-регрессия проверяет показ данных и отсутствие чужого draft, а не только auth-флаг.

### B03. Сделать повтор checkout зависимым от исхода операции и актуального выбора

**Priority:** P1\
**Severity:** High\
**Effort:** Medium\
**Risk:** High

**Проблема**\
Потеря ответа POST становится обычным retryable error. Retry отправляет сохранённый payload без проверки актуальных адреса/доставки/readiness и соответствия количества. Прогон подтвердил повтор после TIMEOUT и отправку `count=5/addressId=2` при текущих `count=1`, отсутствии адреса и `readiness=false`. Источники: S4, F3, T3, Q4.

**Где**\
[useOrderCreateSubmit.ts](../../src/features/order-create/model/useOrderCreateSubmit.ts), [types.ts](../../src/features/order-create/model/types.ts), [orderCreatePayload.ts](../../src/features/order-create/model/orderCreatePayload.ts), [orderCreateResult.ts](../../src/features/order-create/model/orderCreateResult.ts), [CheckoutResultDialog.tsx](../../src/widgets/checkout/ui/CheckoutResultDialog.tsx).

**Почему это проблема**\
Возможны повторная покупка, отправка уже не выбранных параметров и ложное сообщение «Заказы не были оформлены».

**Root cause**\
Модель попытки не различает подтверждённый отказ, неопределённый исход и устаревший snapshot.

**Что нужно изменить**\
Ввести отдельное клиентское состояние неизвестного результата для потери ответа после отправки; не считать любой HTTP/transport failure доказательством отсутствия записи. Блокировать слепой повтор, предложить чтение существующих покупок/корзины. Не угадывать соответствие по товару или времени и не снимать неопределённость из-за отсутствия совпадения. Для подтверждённого отказа повторно валидировать актуальные count/address/transfer/selection/readiness; при изменении вернуть пользователя к проверке заказа. Новых endpoint, idempotency keys и гарантий exactly-once не вводить.

**Зависимости**\
B01, B02, B11. Состояние неопределённой попытки должно переживать закрытие результата и возврат в checkout в рамках текущей сессии без сохранения чувствительного payload.

**Definition of Done**

- Mock «запись принята, ответ потерян» не приводит ко второму POST через Retry или повторное открытие checkout.
- UI раздельно показывает успех, подтверждённый отказ и неизвестный результат, включая частичный успех.
- Изменение количества, адреса, доставки или selection блокирует отправку старого snapshot.
- Повторяются только разрешённые позиции; успешные позиции не отправляются заново.
- Новые проверки исполняют lifecycle hook/UI, а не только helper сборки payload.

### B04. Сохранять идентичность и полноту набора изображений редактора

**Priority:** P1\
**Severity:** High\
**Effort:** Medium\
**Risk:** High

**Проблема**\
`buildInitialImages` сопоставляет metadata и IDs по позиции после фильтрации отсутствующих metadata: для `[11,22]` и metadata только 22 получается preview 22 с ID 11. После ошибки восстановления draft добавление нового фото заменяет все сохранённые IDs. Upload `[]` оставляет `undefined` в успешном состоянии. У успешных blob previews edit-режима нет cleanup при unmount. Источники: T1, F5, T7, Q5.

**Где**\
[useProductForm.tsx](../../src/widgets/create-product-form/model/useProductForm.tsx), `buildInitialImages/imageIdsToDelete`; [useProductFormDraftState.ts](../../src/widgets/create-product-form/model/useProductFormDraftState.ts); [useMultipleImageUpload.ts](../../src/features/image-upload/model/useMultipleImageUpload.ts); [imageApi.ts](../../src/entities/image/api/imageApi.ts), `saveImage`; [PaymentDialog.tsx](../../src/features/order-payment/ui/PaymentDialog.tsx), потребитель upload ID.

**Почему это проблема**\
Сохранение может исключить не тот файл, а cleanup — отправить удаление ID, не выбранного пользователем. Невосстановленные фото теряются из draft без явного удаления.

**Root cause**\
Успешность preview/metadata ошибочно заменяет идентичность и намерение сохранить или удалить изображение.

**Что нужно изменить**\
Сопоставлять только по `metadata.id`. Сохранённые IDs без preview удерживать отдельно либо блокировать изменение связей до retry/явного удаления. Пока restore выполняется, не разрешать конфликтующий upload; новый файл не должен снимать ошибку старых. Проверять используемый upload ID на границе image API, не объявлять успех для пустого/невалидного результата. Явно закрепить владельца blob URL за формой или draft; cleanup URL не означает DELETE серверного изображения.

**Зависимости**\
B02; реализовать до B06 и B05.

**Definition of Done**

- Отсутствующая первая/средняя metadata не меняет ID остальных фото и не означает удаления.
- Restore failure → новый upload сохраняет прежние IDs или остаётся явно заблокированным.
- Пустой/невалидный upload не попадает в product/payment payload и имеет error/retry.
- Удаляется только явно выбранный файл; поздний restore не заменяет новый набор.
- Edit unmount освобождает свои blob URLs; create draft сохраняет только принадлежащие ему и освобождает их при очистке.

### B05. Защитить весь lifecycle отправки формы товара

**Priority:** P1\
**Severity:** High\
**Effort:** Medium\
**Risk:** Medium

**Проблема**\
Поля/категории/фото остаются редактируемыми при pending, но success безусловно очищает draft или запускает отложенный уход. Handler принимает повторный вызов; после успешного edit dirty baseline остаётся прежним. Модульный прогон подтвердил два mutate и удаление нового draft поздним success. Источники: F2, F9, Q4.

**Где**\
[productFormSubmit.ts](../../src/widgets/create-product-form/model/productFormSubmit.ts), [useProductForm.tsx](../../src/widgets/create-product-form/model/useProductForm.tsx); [CreateProductFormContent.tsx](../../src/widgets/create-product-form/ui/components/CreateProductFormContent.tsx), поля и `MultiImageUpload` этого widget.

**Почему это проблема**\
Новые правки теряются; возможны повторные POST/PUT и callbacks навигации после завершения сценария.

**Root cause**\
Защищена кнопка, но не операция, редактируемый snapshot и переход в success.

**Что нужно изменить**\
Захватывать синхронный lock перед отправкой, повторно проверять readiness/upload/loaded edit target; ожидать mutation promise. Самый ограниченный вариант — блокировать все редактирующие controls до окончания записи и перехода. После успеха обновлять baseline и исключать повторный submit. Отменять отложенную навигацию при завершении экземпляра формы; не очищать более новый draft.

**Зависимости**\
B04, B06, B18, B22. Защиту закрытия/навигации согласовать с B20.

**Definition of Done**

- Два быстрых submit дают одну запись, включая Enter/programmatic submit.
- При отложенном API нельзя незаметно изменить поля/фото отправляемого snapshot.
- Ошибка сохраняет ввод и разрешает корректный повтор; успех edit обновляет baseline.
- Success/таймер старого экземпляра не очищает новый draft и не уводит с другого route.

### B06. Разделить подтверждённое сохранение и cleanup изображений

**Priority:** P1\
**Severity:** Medium\
**Effort:** Medium\
**Risk:** Medium

**Проблема**\
PUT товара/профиля и последующий DELETE изображений представлены одной mutation. Отказ DELETE скрывает успешную запись; товар не invalidated, профиль откатывается. Прогон настоящей MutationCache подтвердил успешный PUT при итоговом error и свежем старом detail cache. Источники: A2, S6.

**Где**\
[useProductMutations.ts](../../src/entities/product/model/useProductMutations.ts), [useUserMutations.ts](../../src/entities/user/model/useUserMutations.ts); [productFormSubmit.ts](../../src/widgets/create-product-form/model/productFormSubmit.ts), [ProfileForm.tsx](../../src/widgets/dashboard-home/ui/ProfileForm.tsx).

**Почему это проблема**\
Пользователь повторяет уже сохранённую запись и не понимает, какие данные подтверждены.

**Root cause**\
Неатомарные шаги разных сущностей скрыты под одним результатом entity mutation.

**Что нужно изменить**\
Entity mutation подтверждает PUT и синхронизирует кэш; сценарий редактора отдельно управляет cleanup. Показывать «сохранено, очистка не завершена», удерживать только незавершённые действия. Не откатывать подтверждённую запись и не повторять PUT ради DELETE. Сохранить существующий контракт удаления и не удалять файлы с неизвестным статусом привязки.

**Зависимости**\
B04; avatar-интеграция вместе с B07. Существующую invalidation расширить в B17.

**Definition of Done**

- PUT success + DELETE failure оставляет подтверждённые данные в UI/cache.
- Retry cleanup выполняет только нужный DELETE, без повторного PUT.
- PUT failure не запускает cleanup; частичный успех явно отличим от отказа записи.

### B07. Согласовать preview, ID и намерение удалить аватар

**Priority:** P1\
**Severity:** Medium\
**Effort:** Medium\
**Risk:** Medium

**Проблема**\
Новая загрузка меняет preview, сохраняя старые imageIds. Ошибка валидации первой замены оставляет `currentImageId=null` и `hasImageChanged=true`; submit может трактовать её как удаление аватара. Поздний upload после reset не проверяет актуальность. Источник: F4.

**Где**\
[useImageUpload.ts](../../src/features/image-upload/model/useImageUpload.ts), [ProfileForm.tsx](../../src/widgets/dashboard-home/ui/ProfileForm.tsx), `handleImageChangeWrapper/currentImageId/imageIdToDelete`.

**Почему это проблема**\
Сохраняется изображение, не соответствующее preview, либо удаляется фото без такого намерения пользователя.

**Root cause**\
Несколько независимых флагов заменяют целостное состояние изменения аватара.

**Что нужно изменить**\
Различать unchanged/uploading/uploaded/failed/explicitlyRemoved; хранить соответствующие preview и ID вместе. Ошибка не является удалением. Проверять revision upload при reset/замене; блокировать незавершённую замену или явно возвращать подтверждённое фото.

**Зависимости**\
B04 для проверки upload ID, B06 для результата сохранения.

**Definition of Done**

- A успешно → B с ошибкой: показанное изображение соответствует сохраняемому ID.
- Невалидный файл не приводит к DELETE текущего аватара.
- Поздний upload после reset/замены не восстанавливает старое состояние.

### B08. Сохранять редакторы и диалоги при ошибке фонового чтения

**Priority:** P1\
**Severity:** Medium\
**Effort:** Medium\
**Risk:** Medium

**Проблема**\
`OrdersWidget` заменяет всё дерево при `error`; `AdminProductEditor` перестаёт монтировать `ProductForm`, если refetch relations дал ошибку. TanStack Query при этом сохраняет прежние data, что повторно проверено настоящим QueryObserver. Источники: R2, F11.

**Где**\
[OrdersWidget.tsx](../../src/widgets/orders/ui/OrdersWidget.tsx), вложенные order actions; [AdminProductEditor.tsx](../../src/features/admin-product-management/ui/AdminProductEditor.tsx), условие `!relations.error`.

**Почему это проблема**\
Reconnect/refetch уничтожает введённый комментарий оплаты, выбранный чек или dirty-поля admin-товара без ухода со страницы.

**Root cause**\
Первоначальная невозможность загрузки и ошибка обновления уже загруженных данных управляют mount одинаково.

**Что нужно изменить**\
После успешной инициализации сохранять дерево и baseline; показывать локальное предупреждение/retry. При недостоверном актуальном статусе блокировать новые небезопасные действия, сохраняя pending-операцию и её результат. Не переносить все формы в глобальный store.

**Зависимости**\
B02. B21 затем защищает собственные способы закрытия диалогов.

**Definition of Done**

- Initial error имеет полноэкранный error/retry; background error сохраняет данные и draft.
- Reconnect → failed refetch → successful retry не размонтирует открытую оплату и admin-форму.
- Ввод и контекст pending-записи сохраняются; повторная запись по непроверенному статусу запрещена.

### B09. Останавливать infinite scroll после ошибки следующей страницы

**Priority:** P1\
**Severity:** Medium\
**Effort:** Small\
**Risk:** Low

**Проблема**\
Видимый sentinel вызывает новую загрузку после каждого снятия pending, не проверяя ошибку. `ProductCatalog` скрывает все карточки при общем isError. Прогон текущего effect с InfiniteQueryObserver дал четыре запроса упавшего хвоста при `retry:false`. Источники: R4, P4, U1.

**Где**\
[InfiniteScroll.tsx](../../src/shared/ui/infinite-scroll/InfiniteScroll.tsx), [useInfiniteProducts.ts](../../src/entities/product/model/useInfiniteProducts.ts), [ProductCatalog.tsx](../../src/widgets/product-catalog/ui/ProductCatalog.tsx); consumers HomeProducts, CategoryProducts, SearchProducts, SellerPageClient, RelatedProducts.

**Почему это проблема**\
Каталог исчезает после загрузки успешной страницы, а устойчивый сбой вызывает новые циклы запросов вне retry budget Query.

**Root cause**\
Состояние пагинации не различает initial error и ошибку хвоста.

**Что нужно изменить**\
Передавать ошибку следующей страницы в автозагрузку, сохранять страницы и выводить error/retry у хвоста. После отказа ждать явного retry или нового query key; retry должен вызывать fetchNextPage.

**Зависимости**\
Нет.

**Definition of Done**

- После исчерпания retry одной операции видимый sentinel не запускает новую.
- Карточки и scroll position сохраняются, ручной retry восстанавливает хвост.
- Проверены initial error, next-page error, background refetch и смена фильтра у всех consumers.

### B10. Отображать деньги с исходной валютой и дробной частью

**Priority:** P1\
**Severity:** Medium\
**Effort:** Small\
**Risk:** Low

**Проблема**\
`ProductPriceDisplay` безусловно приписывает ₽, а детали используют formatter с `maximumFractionDigits:0`. Поддерживаемые формой USD/EUR и дробные суммы отображаются неверно. Прогон дал `1250.75 → 1 251 ₽` в деталях. Источники: Q1, Q2.

**Где**\
[ProductPriceDisplay.tsx](../../src/entities/product/ui/ProductPriceDisplay.tsx), consumers `ProductCard` и `UserProductCard`; [productDetailsFormatters.ts](../../src/widgets/product-details/ui/productDetailsFormatters.ts), `formatMoney`; [formatPrice.ts](../../src/shared/lib/utils/formatPrice.ts).

**Почему это проблема**\
Покупатель видит другую валюту и сумму, чем в корзине/оплате, без конвертации.

**Root cause**\
Доменная валюта теряется в props; дублирующий formatter вводит другое округление.

**Что нужно изменить**\
Сделать currency обязательной для отображения цены; передать её из товара и использовать существующий formatter с принятой точностью для цены, предоплаты и остатка. Не менять payload и расчёты.

**Зависимости**\
Нет.

**Definition of Done**

- Обычный товар и предзаказ RUB/USD/EUR сохраняют валюту и дробные суммы.
- Карточка, детали, корзина и оплата показывают согласованные значения; конвертация не выполняется.

### B11. Сохранять явное исключение товаров из checkout

**Priority:** P1\
**Severity:** Medium\
**Effort:** Small\
**Risk:** Low

**Проблема**\
Effect выбора интерпретирует любой пустой Set как первичное состояние и снова выбирает все товары после обновления cartItems. Источник: F7.

**Где**\
[useCheckoutSelection.ts](../../src/widgets/checkout/model/useCheckoutSelection.ts), ветка `next.size === 0`.

**Почему это проблема**\
Refetch/изменение количества или удаление последнего выбранного товара возвращает в предполагаемый заказ ранее исключённые позиции.

**Root cause**\
Пустой пользовательский выбор не отличается от ещё не выполненной инициализации.

**Что нужно изменить**\
Выбирать всё только при первой успешной загрузке. В дальнейшем согласовывать существующие IDs, сохраняя явный пустой выбор и не добавляя исключённые позиции.

**Зависимости**\
B02 для reset при смене владельца. Выполнить до B03.

**Definition of Done**

- «Снять всё» сохраняется после refetch и изменения количества.
- Удаление последнего выбранного товара не выбирает остальные.
- Первая непустая загрузка и новая сессия инициализируются явно; пустой выбор блокирует submit.

### B12. Исключить секреты и исходные HTTP-конфигурации из логов

**Priority:** P1\
**Severity:** Medium\
**Effort:** Small\
**Risk:** Low

**Проблема**\
`ApiError.originalError` содержит Axios config. Dev logger выводит его целиком; auth store и отдельные mutations печатают error без dev guard. В config могут быть bearer/refresh headers и параметры паролей. Источник: S9.

**Где**\
[errorHandler.ts](../../src/shared/lib/errorHandler.ts), `transformAxiosError/logApiError`; [authStore.ts](../../src/entities/session/model/authStore.ts), catch; [instances.ts](../../src/shared/api/axios/instances.ts); API-error console calls, включая [useProductMutations.ts](../../src/entities/product/model/useProductMutations.ts).

**Почему это проблема**\
Секреты попадают в консоль и копируемую диагностику. Наличие внешнего сборщика логов или фактическая утечка не установлены.

**Root cause**\
Диагностический вывод принимает raw error вместо безопасного набора полей.

**Что нужно изменить**\
Использовать один безопасный serializer с allowlist status/code/нейтрального сообщения и маршрута без query. Не передавать config/request/raw error; проверить вложенные details и сообщения. Парольный backend-контракт не менять.

**Зависимости**\
Нет; применить рядом с B01, чтобы новый refresh logging сразу был безопасным.

**Definition of Done**

- Synthetic secrets в headers/body/params/details отсутствуют во всех перехваченных console arguments в dev и production.
- Диагностика сохраняет полезные status/code; настоящие секреты для тестирования не используются.

## P2

### B13. Сделать auth persistence необязательной для работы сессии

**Priority:** P2\
**Severity:** Medium\
**Effort:** Small\
**Risk:** Medium

**Проблема**\
Zustand persist записывает storage синхронно из `set`. Если чтение доступно, а запись бросает исключение, успешный login попадает в catch и становится rejected; повторный set в catch тоже падает. Это воспроизведено с установленным Zustand. Источник: T4.

**Где**\
[authStore.ts](../../src/entities/session/model/authStore.ts), persist и auth actions; [AuthProvider.tsx](../../src/app/providers/AuthProvider.tsx), `void initializeAuth()`.

**Почему это проблема**\
Квота/запрет browser storage ломают авторизацию при уже сохранённых cookies; возможен необработанный rejected Promise инициализации.

**Root cause**\
Ошибка вспомогательной persistence входит в основной auth transaction.

**Что нужно изменить**\
Дать persist безопасный storage adapter с memory fallback для get/set/remove и нормализовать завершение initializeAuth. Ошибка persistence не должна отменять подтверждённый auth result.

**Зависимости**\
B01; выполнить до B02, чтобы cleanup не зависел от успешности storage.

**Definition of Done**

- Login, initialize, refresh и logout работают при отказе каждого storage method.
- Нет unhandled rejection; cookies и auth state согласованы.
- В persisted user не появляются токены или дополнительные чувствительные данные.

### B14. Ограничить ожидание runtime API config

**Priority:** P2\
**Severity:** Medium\
**Effort:** Small\
**Risk:** Medium

**Проблема**\
`fetch('/api/config')` и чтение body не имеют deadline. Все Axios запросы ждут их в interceptor до запуска transport timeout. Прогон подтвердил pending дольше заданного Axios timeout без вызова adapter. Источник: T5.

**Где**\
[instances.ts](../../src/shared/api/axios/instances.ts), `getApiBaseUrl/setupUrlInterceptor/preloadApiConfig`; [route.ts](../../app/api/config/route.ts).

**Почему это проблема**\
Зависшая конфигурация удерживает каталог и авторизацию в loading без рабочего восстановления.

**Root cause**\
Обязательный async prerequisite запроса не имеет собственного ограниченного lifecycle.

**Что нужно изменить**\
Ограничить весь fetch+body parse по времени, отменять transport, проверять `apiUrl` по существующим правилам конфигурации. Объединить конкурентные загрузки одним promise и очищать его при неудаче, сохранив существующую политику окружений.

**Зависимости**\
Нет; координировать изменения файла с B01/B15.

**Definition of Done**

- Зависшие response и body завершаются нормализованной ошибкой в ограниченное время.
- Конкурентные запросы делят одну загрузку config; следующая попытка после отказа может пройти.
- Невалидный apiUrl не кэшируется как успешный; отмена одного consumer не ломает остальных.

### B15. Сделать подготовку URL идемпотентной при replay

**Priority:** P2\
**Severity:** Medium\
**Effort:** Small\
**Risk:** Medium

**Проблема**\
Для поддерживаемого root-relative API base `/proxy` interceptor мутирует endpoint; повтор после 401 превращает `/proxy/participant` в `/proxy/proxy/participant`. Это воспроизведено для leader и queued request. Источник: S10.

**Где**\
[instances.ts](../../src/shared/api/axios/instances.ts), `setupUrlInterceptor`; [env.ts](../../src/shared/config/env.ts), поддержка relative API URL.

**Почему это проблема**\
Успешный refresh не восстанавливает запрос в конфигурации same-origin proxy. Применение такой конфигурации на production не установлено.

**Root cause**\
Повторное выполнение interceptor повторяет преобразование уже преобразованного URL.

**Что нужно изменить**\
Использовать baseURL с неизменяемым endpoint либо другой идемпотентный способ построения адреса. Не создавать новый HTTP client.

**Зависимости**\
B01; вместе с B14 минимизирует повторные изменения request setup.

**Definition of Done**

- Absolute и root-relative base дают одинаковый целевой адрес до/после 401.
- Проверены leader, queue и повтор request interceptor, без удвоения префикса.

### B16. Согласовать конкурентные изменения избранного и их ошибки

**Priority:** P2\
**Severity:** Medium\
**Effort:** Medium\
**Risk:** Medium

**Проблема**\
Rollback восстанавливает целый старый список, перезаписывая успешную соседнюю mutation; итоговой invalidation после ошибки нет. Optimistic add читает InfiniteData как Product[]. Feature не передаёт ошибку UI. Прогоны подтвердили восстановление удалённого B поздним отказом A и пропуск optimistic add из infinite cache. Источники: S5, S12, часть S8.

**Где**\
[useFavoritesMutations.ts](../../src/entities/favorite/model/useFavoritesMutations.ts), [useToggleFavorite.ts](../../src/features/toggle-favorite/model/useToggleFavorite.ts), [FavoriteButton.tsx](../../src/features/toggle-favorite/ui/FavoriteButton.tsx).

**Почему это проблема**\
Избранное и следующий toggle расходятся с подтверждённым состоянием, а пользователь не получает объяснения отказа.

**Root cause**\
Оптимистическая операция не ограничена своей позицией/revision и не имеет полного settlement/error lifecycle.

**Что нужно изменить**\
Откатывать только своё изменение с учётом более новых операций либо сериализовать изменения списка; согласовать финальный refetch с pending mutations. Получать товар из типизированных pages/detail или переданного контекста. Показывать нормализованную mutation error существующим уведомлением.

**Зависимости**\
B02 для scope keys и callbacks.

**Definition of Done**

- A fail после B success не возвращает B; итоговый список совпадает с GET.
- Add из infinite catalogue корректно обновляет иконку без unchecked cast.
- Ошибка POST/DELETE видима, не дублируется и не возникает при cancellation.

### B17. Инвалидировать публичную выдачу после удаления и продления товара

**Priority:** P2\
**Severity:** Medium\
**Effort:** Small\
**Risk:** Low

**Проблема**\
Delete/extend обновляют `userAll/detail`, но не `productKeys.lists()`, где живёт публичная выдача. Источник: S7.

**Где**\
[useProductMutations.ts](../../src/entities/product/model/useProductMutations.ts), `useDeleteProduct/useExtendProductExpiration`; [queryKeys.ts](../../src/entities/product/model/queryKeys.ts).

**Почему это проблема**\
При клиентском возврате каталог до истечения staleTime показывает удалённый товар или старую выдачу после продления.

**Root cause**\
Invalidation перечисляет экран инициатора, а не все затронутые представления сущности.

**Что нужно изменить**\
Добавить invalidation существующей ветки публичных списков после подтверждённой записи; сохранить обновление detail и собственных товаров. Не менять TTL всех queries.

**Зависимости**\
B02, B06 для согласованного mutation lifecycle.

**Definition of Done**

- Success delete/extend делает затронутые публичные списки stale и восстанавливает их при возврате.
- Mutation failure не имитирует успешное удаление; существующие user/detail updates сохраняются.

### B18. Устранить потери значений в числовых моделях форм

**Priority:** P2\
**Severity:** Medium\
**Effort:** Medium\
**Risk:** Medium

**Проблема**\
Edit mapper превращает count=0 и count=null в одинаковую пустую строку; общие create rules блокируют сохранение. Обратный mapper `parseInt(...) || null` теряет ноль. Price/prepayment и отдельные parsers принимают Infinity. Прогоны подтвердили оба преобразования. Общий AdminProductDto также объявляет предоплату только number, хотя `docs/testing.md` фиксирует null у товаров, проверенных seed-скриптом через административный список. Источники: F6, T8, T9.

**Где**\
[form.ts](../../src/entities/product/model/form.ts), [productPublishRequirements.ts](../../src/widgets/create-product-form/model/productPublishRequirements.ts), [ProductSaleFields.tsx](../../src/widgets/create-product-form/ui/components/ProductSaleFields.tsx); [admin.ts](../../src/entities/product/model/admin.ts), [AdminProductEditor.tsx](../../src/features/admin-product-management/ui/AdminProductEditor.tsx); [shipping-methods/model.ts](../../src/widgets/dashboard-settings/ui/shipping-methods/model.ts), `ShippingMethodCard`; [price-range-filter/model.ts](../../src/widgets/product-catalog/ui/price-range-filter/model.ts). Свидетельство nullable admin list: [seed-agent-products.mjs](../../scripts/seed-agent-products.mjs), контрольное чтение и вывод `prepaymentAmount`.

**Почему это проблема**\
Нельзя исправить описание существующего товара без изменения остатка; локально допустимое Infinity сериализуется в JSON как null. Nullable read не имеет корректного представления в общей admin-модели; если detail отдаёт то же значение, текущий `Number.isFinite(null)` блокирует несвязанные правки. Последний сценарий подтверждён по коду валидатора, а не запросом реального detail endpoint.

**Root cause**\
Truthiness и строковые эвристики заменяют явное представление nullable/числовых значений и проверку результата преобразования.

**Что нужно изменить**\
Разделить create/edit validation, сохранить существующие 0/null остатка при несвязанных правках; дать count однозначное представление. Для admin отделить nullable read DTO от числовой модели формы: отсутствие предоплаты явно отображать как «без предоплаты» с уже используемым числовым значением 0 при подготовке существующего PUT. Не расширять write DTO до null и не переносить nullable на другие поля. Для денежных значений проверять конечность после parsing и перед payload, для счётчиков — целочисленность/безопасность. Не вводить неподтверждённый верхний бизнес-лимит.

**Зависимости**\
Нет; выполнить до B05 и B29.

**Definition of Done**

- Round-trip edit 0/null/положительного count сохраняет исходную семантику.
- Изменение названия/описания не требует выдуманного остатка.
- Огромные строки, NaN и Infinity дают field error, не попадают в request; обычные дробные деньги сохраняются.
- Admin fixture с отсутствующей предоплатой корректно отображается и допускает изменение названия; read null не попадает неявно в числовую форму или write DTO.

### B19. Проверять специальные auth error payload перед чтением полей

**Priority:** P2\
**Severity:** Medium\
**Effort:** Small\
**Risk:** Low

**Проблема**\
Login/resend обходят общую нормализацию; `as` не защищает чтение `.code` у null и не проверяет числовой retryAfterSec. Источник: T6.

**Где**\
[authApi.ts](../../src/entities/session/api/authApi.ts), catch login/resend; [types.ts](../../src/entities/session/model/types.ts); [VerificationCodeDialog.tsx](../../src/features/auth/ui/VerificationCodeDialog.tsx).

**Почему это проблема**\
Error handling заменяет исходный отказ TypeError, а невалидный cooldown ломает таймер.

**Root cause**\
Type assertion используется вместо проверки внешних данных в особой ветке ошибок.

**Что нужно изменить**\
Читать body как unknown, проверять нужные code/next и конечное неотрицательное число секунд. При несовпадении сохранять нормализованную исходную ошибку; success/cooldown сделать различимыми типами.

**Зависимости**\
B12 для безопасной диагностики.

**Definition of Done**

- Null/строка/посторонний объект 403/429 не порождают TypeError.
- Отрицательный/бесконечный/строковый cooldown не запускает некорректный таймер.
- Подтверждённые WAITING_VERIFY и VERIFICATION_COOLDOWN продолжают работать.

### B20. Защитить dirty-формы при реальных способах ухода

**Priority:** P2\
**Severity:** Medium\
**Effort:** Medium\
**Risk:** Medium

**Проблема**\
Settings защищены только beforeunload; Link/router.back/закрытие локального редактора теряют ввод. Edit адреса не передаёт onDirtyChange; edit товара не имеет persisted draft. Источник: F8.

**Где**\
[DashboardSettingsWidget.tsx](../../src/widgets/dashboard-settings/ui/DashboardSettingsWidget.tsx), [AddressManager.tsx](../../src/widgets/dashboard-settings/ui/AddressManager.tsx), [useProductForm.tsx](../../src/widgets/create-product-form/model/useProductForm.tsx), [DashboardHomeWidget.tsx](../../src/widgets/dashboard-home/ui/DashboardHomeWidget.tsx); [useUnsavedChanges.ts](../../src/shared/lib/navigation/useUnsavedChanges.ts), точки навигации header/mobile shell.

**Почему это проблема**\
Несохранённые настройки, профиль и правки товара исчезают при обычной клиентской навигации.

**Root cause**\
Dirty lifecycle формы не связан с клиентскими выходами из её владельца.

**Что нужно изменить**\
Передавать dirty из обоих режимов адреса. Подключить согласованную защиту к используемым Link/Back/локальным закрытиям, учитывая image dirty и pending; оставить beforeunload для полной навигации. Не сохранять пароли/реквизиты в browser storage и не подменять приватные Next router internals.

**Зависимости**\
B05, B07, B08, чтобы guard использовал окончательные признаки dirty/pending.

**Definition of Done**

- Проверены уход через header, bottom navigation, кнопку Back, историю браузера, закрытие profile/address editor и reload.
- Отказ от ухода сохраняет ввод/фото и текущий URL; подтверждение разрешает один переход.
- Успешно сохранённая/чистая форма не показывает ложное предупреждение; sensitive drafts не персистятся.

### B21. Привязать закрытие и reset order-диалога к его операции

**Priority:** P2\
**Severity:** Medium\
**Effort:** Small\
**Risk:** Medium

**Проблема**\
Cancel/review можно закрыть крестиком, Escape или backdrop при pending. Cancel сразу очищает текст; review запускает неотменяемый reset через 300 ms, способный очистить уже повторно открытый диалог. Источник: F10.

**Где**\
[CancelOrderDialog.tsx](../../src/widgets/orders/ui/CancelOrderDialog.tsx), [LeaveReviewDialog.tsx](../../src/widgets/orders/ui/LeaveReviewDialog.tsx), [useLeaveReview.ts](../../src/widgets/orders/model/useLeaveReview.ts).

**Почему это проблема**\
Ошибка записи приходит после потери ввода; callbacks старого открытия воздействуют на новое.

**Root cause**\
Open-state, mutation и delayed reset имеют независимые lifecycles.

**Что нужно изменить**\
Использовать один источник open-state и единый guard всех закрытий. Reset выполнять после закрытия только для того же открытия либо отменять таймер при reopen/unmount; success-close отличать от пользовательского закрытия при pending.

**Зависимости**\
B08 предотвращает внешнее размонтирование диалога.

**Definition of Done**

- Escape/backdrop/крестик при pending не уничтожают ввод; отказ записи оставляет доступный повтор.
- Close → reopen быстрее 300 ms не очищает новый текст.
- Success старой операции не закрывает новое открытие.

### B22. Валидировать параметры маршрута до загрузки и записи

**Priority:** P2\
**Severity:** Medium\
**Effort:** Small\
**Risk:** Medium

**Проблема**\
Invalid product ID попадает в общий error/retry, category slug без извлекаемого ID — в обычный JSX «не найдена». В seller edit отключённый query для bad/0 не гарантирует блокировку пустой формы/PUT. AdminOrders пропускает page=Infinity. Источники: R5, T12.

**Где**\
[detail/page.tsx](../../app/(catalog)/catalog/[id]/detail/page.tsx), [category/page.tsx](../../app/(catalog)/catalog/category/[...slug]/page.tsx), [edit/page.tsx](../../app/(user)/dashboard/products/[id]/edit/page.tsx); [useProductQueries.ts](../../src/entities/product/model/useProductQueries.ts), [productFormSubmit.ts](../../src/widgets/create-product-form/model/productFormSubmit.ts), [AdminOrders.tsx](../../src/widgets/admin-orders/ui/AdminOrders.tsx), parsing page/agent.

**Почему это проблема**\
Некорректный URL создаёт бессмысленный retry, сломанную пагинацию или запись без загруженного объекта.

**Root cause**\
Преобразование Number и disabled query считаются проверкой пользовательского URL.

**Что нужно изменить**\
Для ID проверять положительный safe integer, для page — неотрицательный; invalid page нормализовать. Синтаксически invalid route обрабатывать notFound вне catch управляющего исключения. В submit дополнительно требовать валидный ID и загруженный edit target. Различать подтверждённое отсутствие основного ресурса и временную ошибку; отсутствие image metadata не означает отсутствия товара. Структуру routes не менять.

**Зависимости**\
Нет; выполнить до B05/B27.

**Definition of Done**

- bad/0/дробный/Infinity/unsafe ID не вызывают GET/PUT неверного товара и не открывают доступную пустую edit-форму.
- Invalid category syntax показывает not-found; временная ошибка не объявляется отсутствием.
- Metadata/noindex и фактический HTTP status проверены с учётом streaming: безусловный 404 после начала потока не обещается.
- Admin page/agent не отправляют невалидные числовые параметры.

### B23. Отделить основные данные от необязательных изображений

**Priority:** P2\
**Severity:** Medium\
**Effort:** Medium\
**Risk:** Medium

**Проблема**\
getUser/getProfileUser отклоняют успешное чтение пользователя из-за metadata аватара. Счётчики header ждут metadata заказов/собственных товаров, хотя не используют изображения. Отказ core query при ошибке аватара воспроизведён. Источники: S11, P5.

**Где**\
[userApi.ts](../../src/entities/user/api/userApi.ts), [useUserQueries.ts](../../src/entities/user/model/useUserQueries.ts); [orderApi.ts](../../src/entities/order/api/orderApi.ts), [productApi.ts](../../src/entities/product/api/productApi.ts), [attachImages.ts](../../src/entities/image/lib/attachImages.ts); [useUserPendingActions.ts](../../src/widgets/header/model/pendingActions/useUserPendingActions.ts).

**Почему это проблема**\
Необязательная картинка блокирует кабинет/проверку владельца и увеличивает сетевую работу счётчиков.

**Root cause**\
Core DTO и визуальное enrichment имеют общий успешный/ошибочный результат query.

**Что нужно изменить**\
Кэшировать основные данные независимо; metadata загружать отдельным существующим image query, когда UI показывает изображения. Для картинки иметь локальные loading/error/fallback. Сохранить общий core cache для списка и счётчика, не дублировать основной запрос и не придумывать count endpoint. Сопоставление фото редактора остаётся по B04.

**Зависимости**\
B02, B04, B08: scope, безопасная неполная metadata и сохранение draft при refetch уже определены.

**Definition of Done**

- Успешный core profile + image failure не блокирует проверку sellerId, но ошибка самого профиля продолжает блокировать её.
- Header-only сценарий не загружает ненужные metadata; основное чтение не дублируется.
- Переход к страницам с картинками загружает их с локальным fallback/retry.
- Public API/DTO composition и query keys документированы в рамках изменения.

### B24. Восстановить актуальный assertion мобильного SSR-теста

**Priority:** P2\
**Severity:** Medium\
**Effort:** Small\
**Risk:** Low

**Проблема**\
SSR test требует подстроку `site` в src логотипа, тогда как Header импортирует `logo.svg`. Проверка прерывается до полезных assertions при включённом fixture. Источник: Q3; новый browser-прогон в этом аудите не выполнялся.

**Где**\
[mobile-rendering.mobile.spec.ts](../../tests/e2e/mobile-rendering.mobile.spec.ts), тест `mobile streamed SSR fallback exposes progressive navigation without JavaScript`; [Header.tsx](../../src/widgets/header/ui/Header.tsx).

**Почему это проблема**\
Устаревшее ожидание мешает использовать SSR-regression как проверку следующих изменений.

**Root cause**\
Тест закрепил старое имя asset вместо актуального пользовательского поведения.

**Что нужно изменить**\
Проверять доступную именованную ссылку, присутствие/загрузку действующего mobile logo без generated hash. Сохранить остальные SSR assertions и fixture coverage.

**Зависимости**\
Нет. Выполнить в начале реализации; согласовать asset assertion с B34.

**Definition of Done**

- Целевой тест проходит с включённым fixture и JavaScript disabled.
- Assertions навигации, skeleton и геометрии действительно исполняются; skip/ослабление coverage не добавлены.

### B25. Передать политику возврата после входа из shared в auth-сценарий

**Priority:** P2\
**Severity:** Medium\
**Effort:** Small\
**Risk:** Low

**Проблема**\
Shared `AuthRequiredDialog` самостоятельно отправляет на bare `/auth/login`; guest add-to-cart/favorite теряют текущую страницу, в отличие от RequireAuth. Источник: A3.

**Где**\
[AuthRequiredDialog.tsx](../../src/shared/ui/auth-required-dialog/AuthRequiredDialog.tsx); features `add-to-cart`, `toggle-favorite`, `auth`; [authRedirect.ts](../../src/entities/session/model/authRedirect.ts), [LoginPageClient.tsx](../../app/auth/login/LoginPageClient.tsx).

**Почему это проблема**\
После входа пользователь оказывается на главной, теряя место начатого сценария; auth-политика продублирована в нижнем слое.

**Root cause**\
Shared UI владеет бизнес-навигацией вместо получения нейтрального href/callback.

**Что нужно изменить**\
Передавать контекст и onLogin/href из разрешённой композиции с существующим sanitizer. Сохранить route/query возврата; автоматическое повторение покупки/добавления после входа не требуется.

**Зависимости**\
B01/B02 для стабильного входа и смены аккаунта.

**Definition of Done**

- Guest cart/favorite → login/register → исходная страница с query.
- External/protocol-relative/auth-loop redirect отклоняется существующими правилами.
- Shared dialog не импортирует auth entity/feature и не выбирает маршрут самостоятельно.

### B26. Согласовать локальное состояние поиска с асинхронными обновлениями

**Priority:** P2\
**Severity:** Medium\
**Effort:** Small\
**Risk:** Medium

**Проблема**\
AdminProducts берёт controlled value только из URL и меняет его через async router.replace. В header выбранный индекс подсказки не сбрасывается при сокращении массива того же query; Enter передаёт undefined в `.trim()`. Источники: R1, T10.

**Где**\
[AdminProducts.tsx](../../src/widgets/admin-products/ui/AdminProducts.tsx), [useUrlState.ts](../../src/shared/lib/navigation/useUrlState.ts); [useSearch.ts](../../src/widgets/header/model/useSearch.ts), `productNameSuggestions/handleSearchKeyDown`.

**Почему это проблема**\
Быстрый ввод теряет символы, а refetch ломает клавиатурный выбор корректно полученных подсказок.

**Root cause**\
Локальный ввод/выбор зависят от запаздывающего внешнего snapshot без согласования актуальности.

**Что нужно изменить**\
В admin синхронно обновлять local input, согласовывать URL через debounce/submit и обрабатывать внешние Back/Forward без отката новым вводом старой навигации. Для подсказок ограничивать/сбрасывать индекс при изменении данных и проверять выбранную строку непосредственно при Enter.

**Зависимости**\
Нет.

**Definition of Done**

- Задержка навигации и быстрый ввод не теряют символы; остальные query params и сброс страницы корректны.
- Back/Forward обновляют draft; старое подтверждение URL не перезаписывает новый ввод.
- Список 3 → 1 между ArrowDown и Enter не вызывает исключения и выполняет понятное действие.

### B27. Привязать retry к ошибочному источнику данных

**Priority:** P2\
**Severity:** Medium\
**Effort:** Small\
**Risk:** Low

**Проблема**\
Retry деталей вызывает только router.refresh; новые initialData не исправляют существующий ошибочный query, что проверено QueryObserver. Desktop error профиля не передаёт имеющийся refetch в ErrorState. Источники: R3, U12.

**Где**\
[ProductDetailsWidget.tsx](../../src/widgets/product-details/ui/ProductDetailsWidget.tsx), [useProductDetails.ts](../../src/entities/product/model/useProductDetails.ts); [DashboardHomeWidget.tsx](../../src/widgets/dashboard-home/ui/DashboardHomeWidget.tsx).

**Почему это проблема**\
Видимое восстановление не повторяет упавший запрос либо вообще недоступно без перезагрузки документа.

**Root cause**\
Error UI не связан с владельцем ошибки: серверным route или клиентским query.

**Что нужно изменить**\
Отдать client refetch/fetching из hook, использовать его для client error; для initial SSR error сохранить route refresh. Передать refetch в desktop profile error; показывать pending повторной загрузки.

**Зависимости**\
B22, B23, чтобы постоянные invalid routes и ошибки optional images не маскировались общим retry.

**Definition of Done**

- Client failure → API recovery → Retry действительно делает GET и возвращает карточку.
- Initial SSR failure восстанавливается своим путём; invalid ID не предлагает бесполезный retry.
- Desktop/mobile профиль имеют рабочий retry без повторных нажатий во время pending.

## P3

### B28. Убрать повторную синхронизацию всей корзины из consumers карточек

**Priority:** P3\
**Severity:** Medium\
**Effort:** Medium\
**Risk:** Medium

**Проблема**\
Каждый `useCartProducts` выполняет effect → syncWithServer → persist; товарная кнопка приходит к нему двумя путями. `useCartChecks` вычисляет два totals с вложенным find для consumers, использующих только membership/count. Источники: P1, P2 отчёта 05.

**Где**\
[useCartQueries.ts](../../src/entities/cart/model/useCartQueries.ts), [useCartChecks.ts](../../src/entities/cart/model/useCartChecks.ts), [cartQuantityStore.ts](../../src/entities/cart/model/cartQuantityStore.ts); [useAddToCartFeature.ts](../../src/features/add-to-cart/model/useAddToCartFeature.ts), [useCartQuantity.ts](../../src/entities/cart/model/useCartQuantity.ts).

**Почему это проблема**\
Число синхронных storage writes и обходов всей корзины растёт с числом карточек, хотя серверный snapshot один. Измеренного production latency нет; основание — конкретное размножение одинаковых операций.

**Root cause**\
Читающий consumer одновременно владеет reconciliation и ненужными общими агрегатами.

**Что нужно изменить**\
Оставить одного владельца query → quantity projection на сессию/корзину; одинаковое подтверждение делать no-op. Разделить membership/count и используемые totals; для reconciliation/агрегаций индексировать quantities один раз. Сохранить optimistic revisions и обязательную серверную сверку; не добавлять второй cache DTO.

**Зависимости**\
B02. Общую очередь подтверждающих GET в этой задаче не перестраивать.

**Definition of Done**

- Один snapshot синхронизируется один раз независимо от числа карточек; identical snapshot не вызывает persist.
- Кнопка товара не вычисляет totals, которых не показывает.
- Pending/rollback/stock validation и logout остаются корректны; тесты quantity revisions проходят.
- Сравнение counters до/после фиксирует снижение работы без заявления неподтверждённого выигрыша в миллисекундах.

### B29. Исправить состояние и доступность фильтра цены

**Priority:** P3\
**Severity:** Medium\
**Effort:** Medium\
**Risk:** Low

**Проблема**\
Draft предпочитает availableRange уже применённому value. Desktop Popper находится в portal, не получает фокус и закрывается при уходе с trigger по Tab. Mobile Drawer имеет фиксированную высоту 189.2 px с overflow:hidden и не объявлен диалогом. Источники: U2, U3, U4, часть U8.

**Где**\
[usePriceRangeFilter.ts](../../src/widgets/product-catalog/ui/price-range-filter/usePriceRangeFilter.ts), [PriceRangeDesktopPanel.tsx](../../src/widgets/product-catalog/ui/price-range-filter/PriceRangeDesktopPanel.tsx), [PriceRangeMobileDrawer.tsx](../../src/widgets/product-catalog/ui/price-range-filter/PriceRangeMobileDrawer.tsx).

**Почему это проблема**\
Повторное открытие подменяет выбранный диапазон; keyboard-пользователь не достигает полей, увеличенный текст может скрыть действия.

**Root cause**\
У кастомного фильтра не определены согласованные правила draft, focus и адаптации модальной поверхности.

**Что нужно изменить**\
Инициализировать draft из применённого значения, availableRange использовать как подсказку без молчаливой подстановки незаданной границы. Обеспечить вход/возврат фокуса, Tab/Shift+Tab/Escape. Mobile surface дать dialog semantics/name, высоту по содержимому и ограниченную прокрутку.

**Зависимости**\
B18 для parsing конечных чисел.

**Definition of Done**

- Повторное открытие сохраняет полный/односторонний диапазон; Apply без изменений не меняет его.
- Все действия доступны клавиатурой; Escape возвращает фокус trigger.
- На 320 px, коротком viewport и увеличенном тексте поля/действия достижимы; dialog имеет accessible name.

### B30. Связать RHF refs, видимые подписи и ошибки с настоящими controls

**Priority:** P3\
**Severity:** Medium\
**Effort:** Small\
**Risk:** Low

**Проблема**\
Controller spread передаёт field.ref корневому MUI TextField вместо inputRef; submit не фокусирует невалидный input. В review видимые подписи/ошибка рейтинга программно не связаны с controls. Связь TextField ref/inputRef проверена и в установленном MUI. Источники: U5, U10.

**Где**\
[ChangePasswordForm.tsx](../../src/widgets/dashboard-security/ui/ChangePasswordForm.tsx), [AddressForm.tsx](../../src/entities/address/ui/AddressForm.tsx), [ProfileForm.tsx](../../src/widgets/dashboard-home/ui/ProfileForm.tsx); [LeaveReviewDialog.tsx](../../src/widgets/orders/ui/LeaveReviewDialog.tsx).

**Почему это проблема**\
Пользователю клавиатуры/assistive technology трудно найти и исправить ошибку; placeholder не заменяет связанную видимую подпись.

**Root cause**\
Контракт формы/доступности не доведён через MUI wrapper до нативного элемента.

**Что нужно изменить**\
Отделить ref от field и передать inputRef в действующих затронутых формах. Связать review textarea с label, Rating — с именованной группой и ошибкой. Без нового общего form framework и изменения validation/payload.

**Зависимости**\
B07, B21 перед доработкой тех же форм.

**Definition of Done**

- Invalid submit переводит фокус на первый ошибочный input, включая компактный адрес.
- Review comment/rating имеют связанные подписи и описания ошибок.
- Keyboard submit, password visibility и autofill сохраняют работу.

### B31. Убрать действие продления из ссылки карточки товара

**Priority:** P3\
**Severity:** Medium\
**Effort:** Small\
**Risk:** Low

**Проблема**\
Кнопка продления находится внутри Link карточки, а обработчик обёртки лишь подавляет click. Источник: U7.

**Где**\
[UserProductCard.tsx](../../src/widgets/user-products/ui/UserProductCard.tsx), участок `shouldShowExtendButton` внутри Link.

**Почему это проблема**\
Вложенные интерактивные элементы имеют неоднозначную нативную keyboard/link-семантику; stopPropagation не исправляет DOM.

**Root cause**\
Зона навигации включает самостоятельное действие записи.

**Что нужно изменить**\
Вынести кнопку за Link, сохранив вид и отдельные фокусируемые targets без изменения API продления.

**Зависимости**\
B17 для актуализации результата продления.

**Definition of Done**

- DOM не содержит button внутри anchor; navigation и renewal доступны отдельными Tab stops.
- Enter/Space продлевают один раз без перехода; modified click ссылки сохраняет стандартное поведение.

### B32. Сделать полный отзыв доступным и устойчивым к невалидной дате

**Priority:** P3\
**Severity:** Medium\
**Effort:** Small\
**Risk:** Low

**Проблема**\
Desktop/tablet ReviewCard обрезает текст фиксированной высотой 180 px без доступного раскрытия. Mobile reviews Drawer не имеет dialog semantics. `formatReviewDate` бросает RangeError на невалидной строке, что воспроизведено; production-данные с такой датой не обнаружены. Источники: U6, часть U8, T11.

**Где**\
[ProductReviewsSection.tsx](../../src/widgets/product-details/ui/ProductReviewsSection.tsx), `ReviewCard/Drawer`; [productDetailsFormatters.ts](../../src/widgets/product-details/ui/productDetailsFormatters.ts), `formatReviewDate`.

**Почему это проблема**\
Часть отзыва недоступна; единичная нераспознаваемая дата способна прервать render страницы товара.

**Root cause**\
Представление внешнего текста/даты не имеет безопасного полного отображения и fallback.

**Что нужно изменить**\
Дать отзывам высоту по содержимому либо доступное раскрытие на всех ширинах. У reviews surface задать dialog role/name/modal semantics. Перед форматированием проверять timestamp и показывать нейтральный fallback; новые форматы дат не угадывать.

**Зависимости**\
B10, поскольку меняется тот же formatter-модуль.

**Definition of Done**

- Длинный отзыв полностью читается на mobile/tablet/desktop с клавиатуры.
- Drawer имеет имя/семантику и возвращает фокус после закрытия.
- ISO, пустая и невалидная дата не рушат страницу; существующий текст отзыва сохраняется.

### B33. Исправить контраст кнопки меню кабинета

**Priority:** P3\
**Severity:** Low\
**Effort:** Small\
**Risk:** Low

**Проблема**\
AppLayout задаёт белый Menu icon поверх `secondary.main=#54C5E5`. Эта пара даёт около 2:1; у темы уже есть тёмный `secondary.contrastText`. Источник: U9.

**Где**\
[AppLayout.tsx](../../src/app/layouts/AppLayout.tsx), `accountMenuAction`; [Header.tsx](../../src/widgets/header/ui/Header.tsx), [theme.ts](../../src/app/config/theme.ts).

**Почему это проблема**\
Единственный trigger меню вложенных страниц кабинета трудно различим при сниженном зрении.

**Root cause**\
Локальный цвет игнорирует заданную темой пару foreground/background.

**Что нужно изменить**\
Использовать существующий contrastText и сохранить focus-visible/accessible name; тему целиком не перерабатывать.

**Зависимости**\
Нет.

**Definition of Done**

- Контраст фактических цветов значимой иконки не ниже 3:1.
- Проверены normal/focus/hover и touch target не меньше 44×44 px.

### B34. Согласовать загрузку изображений с их реальными размерами

**Priority:** P3\
**Severity:** Low\
**Effort:** Small\
**Risk:** Low

**Проблема**\
Карточка объявляет `33vw` после 600 px, хотя grid auto-fill формирует больше трёх колонок. Mobile logo использует SVG 143 854 B для 44×44 px; SVG не получает уменьшенный raster srcset. Источники: P6, P7.

**Где**\
[ProductCard.tsx](../../src/entities/product/ui/ProductCard.tsx), `sizes`; [ProductGrid.tsx](../../src/entities/product/ui/ProductGrid.tsx), Container в [theme.ts](../../src/app/config/theme.ts); [logo.svg](../../src/shared/assets/logo/logo.svg), [Header.tsx](../../src/widgets/header/ui/Header.tsx).

**Почему это проблема**\
Браузеру сообщается завышенный размер карточки; общий mobile asset имеет подтверждённый избыточный исходный объём. Конкретный transfer/LCP выигрыш пока не измерен.

**Root cause**\
Параметры/asset изображения не согласованы с размером его отображения.

**Что нужно изменить**\
Согласовать sizes с реальной сеткой, padding/gaps/max-width. Оптимизировать тот же mobile знак с визуальной проверкой 44/88 px; не заменять его другой desktop-композицией. Не добавлять dependency без согласования.

**Зависимости**\
B24, чтобы asset checks уже проверяли актуальный контракт.

**Definition of Done**

- На 600/900/1376/1504 px и DPR 1/2 зафиксированы clientWidth/currentSrc/transfer до и после, без ухудшения чёткости.
- Логотип сохраняет вид и геометрию, становится меньше; mobile не загружает desktop-вариант и наоборот.
- Нет CLS/hydration регрессии; обещания скорости подкреплены фактическим замером.

### B35. Показывать ошибку удаления позиции корзины

**Priority:** P3\
**Severity:** Medium\
**Effort:** Small\
**Risk:** Low

**Проблема**\
Removal hook обрабатывает только onSettled; rollback/refetch возвращают товар без объяснения mutation failure. Источник: оставшаяся cart-часть S8; favorite-часть включена в B16.

**Где**\
[useCartItemRemoval.ts](../../src/entities/cart/model/useCartItemRemoval.ts), [useCartMutations.ts](../../src/entities/cart/model/useCartMutations.ts); consumers add-to-cart и [CheckoutCartSection.tsx](../../src/widgets/checkout/ui/CheckoutCartSection.tsx).

**Почему это проблема**\
Пользователь не понимает, почему удалённая позиция вернулась, даже если следующий GET успешен.

**Root cause**\
Ошибка mutation не передаётся из entity action в пользовательский сценарий.

**Что нужно изменить**\
Передать нормализованную ошибку/callback через public API и показать её на уровне feature/widget существующим NotificationProvider. Не вносить UI-сервисы в entity и не заменять ошибку мутации ошибкой чтения.

**Зависимости**\
B02; можно выполнять рядом с B16.

**Definition of Done**

- DELETE failure + успешный GET даёт одно понятное уведомление и корректную позицию.
- Pending очищается, повтор доступен; успешное удаление и cancellation не показывают ложную ошибку.

### B36. Исправить контекст пустого каталога

**Priority:** P3\
**Severity:** Low\
**Effort:** Small\
**Risk:** Low

**Проблема**\
Общий ProductCatalog при пустой выдаче сообщает об отсутствии предзаказов, включая обычный поиск и категории. Источник: U11.

**Где**\
[ProductCatalog.tsx](../../src/widgets/product-catalog/ui/ProductCatalog.tsx), `EmptyCatalogState`; consumers SearchProducts/CategoryProducts/HomeProducts.

**Почему это проблема**\
Текст неверно объясняет результат фильтрации и предлагает ждать вместо изменения поиска.

**Root cause**\
Специфическое содержание предзаказов зафиксировано в общей композиции каталога.

**Что нужно изменить**\
Передавать контекст empty state из consumer либо использовать нейтральный корректный текст; поиск/фильтр должны предлагать доступное изменение или сброс условий. Не менять API-фильтрацию.

**Зависимости**\
B09 разделяет ошибку и настоящий empty result.

**Definition of Done**

- Пустые поиск, категория и предзаказы имеют корректное описание и осмысленное действие.
- Error/loading не отображаются как empty; leadingContent сохраняет предусмотренное поведение.

# Implementation Plan

Каждый этап — отдельная ограниченная задача реализации без попутного рефакторинга. B24 выполняется первым, поскольку восстанавливает проверку последующих этапов; B18/B22 предшествуют B05, чтобы submit сразу использовал окончательные границы данных. Большая B02 остаётся одним согласованным изменением владельца приватного состояния: частичная миграция ключей без callbacks/cleanup не считается завершением.

Для каждого этапа обязательны `npm run lint`, `npm run typecheck`, `npm run architecture:check` и перечисленные ниже целевые проверки. Для user-facing этапов выполнить `npm run build`, затем HTTP smoke на запущенном приложении. Тесты операций записи используют mock API. Новые зависимости и изменения backend не требуются.

| Этап | Задачи и порядок | Почему объединены / почему здесь | Проверки после этапа сверх обязательных |
| --- | --- | --- | --- |
| 01. Рабочий SSR gate | B24 | Убирает подтверждённый устаревший assertion до изменения UI | Целевой mobile SSR spec с fixture и JS disabled; убедиться, что последующие assertions исполнены |
| 02. Безопасная диагностика | B12 | Следующие auth/HTTP tests не должны печатать raw config | Synthetic secrets через все logger paths в dev/production |
| 03. Refresh и очередь | B01 | Устраняет поздние побочные эффекты до защиты data flow | `session-lifecycle.spec.ts` плюс новые logout/login races, timer/init/401 single-flight, timeout/abort replay с контролируемыми promises |
| 04. Устойчивые auth boundaries | B13 → B19 | Локальный storage и специальные error responses не должны ломать auth lifecycle | Storage get/set/remove failure; login/verify/resend с null/невалидным cooldown; существующие auth scenarios |
| 05. Подготовка HTTP | B14 → B15 | Один участок interceptor/config; проверяется ограниченность и повторяемость подготовки запроса | Зависшие config headers/body, concurrent config, retry после сбоя; absolute/relative base, leader/queue replay |
| 06. Владение приватными данными | B02 | Стабильное поколение сессии уже задано; дальше mutations/forms используют один scope | A → logout → B и automatic expiry; delayed GET/mutation/rollback; draft reload/legacy; refresh того же аккаунта; cart/session specs |
| 07. Финансовое отображение | B10 | Самостоятельная correctness-правка до сверки checkout | Матрица currency/decimal/preorder в карточке, деталях, checkout/payment; order financial model tests |
| 08. Состав и повтор заказа | B11 → B03 | Readiness/retry должны опираться на окончательное правило selection | `checkout-submit-model.spec.ts`, `checkout-stock.spec.ts`, address/delivery scenarios плюс lost response, partial success, changed payload и закрытие/возврат к результату |
| 09. Идентичность изображений | B04 | До cleanup и submit необходимо гарантировать правильные IDs | Partial metadata, failed restore + upload, delayed restore, empty upload в product/payment, edit unmount и create draft blob lifecycle |
| 10. Подтверждение сохранения | B06 → B17 | После разделения PUT/cleanup фиксируется полный набор invalidation | PUT success/DELETE fail и обратные случаи; cleanup-only retry; возврат в каталог после delete/extend |
| 11. Границы редактора | B18 → B22 | Сначала точные значения формы, затем допустимый route/загруженный target | Product form mapping/contract specs; count 0/null, admin nullable prepayment; нечисловые/огромные money values; invalid route/page/agent, отсутствие PUT; SSR metadata/not-found |
| 12. Lifecycle публикации | B05 | Использует завершённые image/save/value/route контракты | `create-product.mobile.spec.ts` плюс delayed response, двойной submit, late success/unmount, блокировка всех controls и новый baseline |
| 13. Замена аватара | B07 | Использует проверенный upload и частичный результат сохранения | A success → B fail, invalid file, reset во время upload, явное удаление; profile save/error/retry |
| 14. Жизнь открытых форм | B08 → B21 | Сначала предотвращается внешний unmount, затем собственный close/reset | Reconnect/refetch failure с открытой оплатой и dirty admin editor; Escape/backdrop/cross при pending cancel/review; reopen быстрее reset timer |
| 15. Основные DTO и картинки | B23 | Scope и устойчивость форм уже заданы; image failure становится локальным | Core success/image failure; ownership checks; badges без metadata; отсутствие повторного core GET; страницы профиля/заказов/товаров с image retry |
| 16. Восстановление чтений | B09 → B27 | Корректные initial/background/tail error states и привязка retry | Успешная первая страница + устойчивый tail failure, ограниченный счётчик запросов, все infinite consumers; SSR/client product retry и desktop profile retry |
| 17. Уход с dirty-форм | B20 | Признаки pending/dirty и mount lifecycle стабилизированы | Browser Link/Back/Forward/local close/reload на settings/address/profile/edit; accept/cancel; отсутствие sensitive persistence |
| 18. Малые mutations списков | B16 → B35 | Приведение optimistic settlement и пользовательских ошибок к одному существующему UI-механизму | Overlapping favorite mutations, infinite optimistic add; cart DELETE failure + successful GET; отсутствие дублей уведомлений |
| 19. Возврат в auth-сценарий | B25 | Ограниченная архитектурная правка shared/dialog и caller | Guest cart/favorite → login/register → исходный route/query; redirect sanitizer regression; FSD check |
| 20. Поисковый ввод | B26 | Один этап для согласования локального ввода и внешнего snapshot поиска | Delayed navigation + rapid typing, Back/Forward; suggestions shrink между ArrowDown/Enter |
| 21. Работа корзины на карточках | B28 | Оптимизация только после scope/revisions; не перестраивает очередь записей | Cart quantity model/browser specs; counters effects/persist/агрегатов при нескольких десятках карточек; pending stock/rollback/logout |
| 22. Фильтр и пустая выдача | B29 → B36 | Один небольшой каталоговый UX этап после parsing/error-state fixes | Односторонний range, reopen/apply/cancel/reset; keyboard; 320 px/короткий экран/увеличение текста; search/category empty |
| 23. Фокус и семантика controls | B30 → B31 → B33 | Локальные исправления нативных controls, без изменения data flow | Invalid submit focus в password/address/profile; review labels; keyboard renewal/link; computed contrast и 44×44 targets |
| 24. Чтение отзывов | B32 | Один ограниченный блок product details | Длинные тексты на mobile/tablet/desktop, Drawer focus/semantics, invalid date fallback без route crash |
| 25. Размеры изображений | B34 | После функциональных изменений; есть рабочий SSR gate | currentSrc/clientWidth/transfer при DPR 1/2, сравнение logo 44/88 px, cold mobile/desktop loading, CLS/hydration/mobile SSR |

После этапов 08, 12–17 и перед завершением всей серии выполнить полный `npm run test:e2e`; для изменений order flow также соблюдать полный набор из [docs/testing.md](../testing.md). Не объявлять mock-прогон проверкой реального backend. После каждого этапа обновлять только затронутые правила в `docs/architecture.md`, `docs/api-and-auth.md`, `docs/testing.md` или `AGENTS.md`: новые scope/ключи, публичные API, формы, UI states и regression coverage. Критерии обновления документации входят в готовность этапа.

Документация этого аудита обновлена только данным backlog. Базовые четыре документа не изменены: текущие архитектура, код, контракты, команды и workflow этим аудитом не меняются. Production-код, тесты и исходные восемь отчётов в рамках аудита не редактировались. Во время работы обнаружены сторонние изменения `AdminAgents.tsx`, `AdminOrderDetail.tsx`, `AdminOrders.tsx`; они не перезаписывались, актуальный parsing `AdminOrders` перепроверен. Финальная проверка документа включает структуру задач, порядок зависимостей, существование ссылок и ограниченность собственного diff.

### Rejected findings

| Вывод предыдущих отчётов | Решение после проверки |
| --- | --- |
| A4: отдельная задача на устранение self-barrel циклов | **Исключено как самостоятельный рефакторинг.** Циклы `cart/index → hooks → cart/index` и favorite подтверждаются импортами, но текущий сбой инициализации не найден: значения читаются из функций позднее. Локальные imports можно поправить при B16/B28, без отдельной миграции графа. |
| A5 и Q6: отдельный backlog удаления старых товарных реализаций и form-hooks | **Исключено как необязательная уборка.** Повторный поиск показывает определения/реэкспорты `useCreateProductForm`, `ProductFormFields`, `ExternalPurchaseButton`, `useBatchForm`, `useFormInitializer`, но не действующих consumers. Их предполагаемые runtime-дефекты не относятся к текущему UI. Наличие dead exports само по себе не доказывает bundle/load проблему. |
| P3 отчёта 05: немедленно объединять все подтверждающие чтения корзины | **Отложено вне обязательного backlog как преждевременная оптимизация.** Очередь действительно делает GET после каждого PUT, но одновременно подтверждает revisions/остатки. Не измерена пользовательская задержка, оправдывающая изменение гарантий подтверждения. B28 устраняет прямое размножение локальной работы, сохраняя этот механизм. |
| G1/G2 отчёта 05: виртуализация/локальная пагинация больших каталогов и двух responsive списков заказов | **Исключено до измерения реальной деградации.** Неограниченный DOM и две CSS-ветки существуют; значимый ущерб в текущих сценариях не доказан. Windowing, maxPages и выбор JSX по viewport несут риски scroll/focus/hydration и сохранения форм. |
| S13: обязательно протянуть AbortSignal через все обычные API | **Отклонено как массовая самостоятельная задача.** Отсутствие signal подтверждено, но завершение неактивного query с наполнением своего cache не означает stale overwrite другого ключа. Отмена необходима в затронутых приватных цепочках B02; переписывать справочники/все публичные чтения без конкретного ущерба не требуется. |
| U1: High для одного pagination failure | **Severity снижена до Medium, задача сохранена в P1/B09.** Подтверждены исчезновение загруженного каталога и цикл запросов, но не security/data loss. R4/P4/U1 — один дефект, не три задачи. |
| P6: Medium severity по расчётному несоответствию sizes | **Снижено до Low и объединено с P7 в B34.** Неверный sizes и размер SVG проверяемы, но пользовательская задержка/transfer не измерены. Исходные отчёты также оговаривают отсутствие network trace; B34 сохраняет это ограничение и требует замера. |
| Q4: отдельная задача «добавить больше тестов» | **Не является самостоятельным дефектом.** Конкретные regression cases встроены в B01–B05 и этапы. Новый runner, coverage threshold и тесты ради количества не нужны. |
| Повторы session/draft/cleanup/checkout в нескольких отчётах | **Объединены, не отвергнуты.** A1/S1/F1 → B02; S2/S3/T2 → B01; S4/F3/T3 → B03; A2/S6 → B06; R2/F11 → B08; R4/P4/U1 → B09; Q1/Q2 → B10. Повторное описание не повышает severity. |
| Снижение всех staleTime, повсеместные memo/selector refactors, переписывание больших компонентов, новая общая form/state инфраструктура | **Не включены.** Размер модуля, число ветвлений, CSS-first responsive composition и разрешённые `@x`-импорты сами по себе не доказывают дефекта. Исправления ограничены наблюдаемыми последствиями. |

Backend-авторизация, серверная идемпотентность, новые count/pagination endpoints, ограничения БД и изменение password payload не включены. B03 исправляет решение frontend о повторе, B12 — его логирование; эти задачи не обещают серверных гарантий.

T9 после дополнительной проверки не отклонён: seed-скрипт использует именно `/admin/actions/agents/{id}/products`, что связывает документированный null с общим admin read DTO. Числовой тип/fixtures расходятся с этим свидетельством. В B18 сохранена frontend-коррекция модели и явного mapping; реальный отказ detail endpoint с null не заявляется. Оговорка R5 о streaming и возможном HTTP 200 также сохранена в B22, а не представлена как ошибка предыдущего аудита.

### Overall root causes

1. **Не определён владелец асинхронной работы относительно сессии.** Refresh, timers, queue replay, ручные cache writes и draft живут дольше владельца; очистка привязана к отдельным кнопкам. B01/B02/B13.
2. **Неатомарные и неопределённые операции описаны как единый success/error.** Потеря ответа допускает повтор, успешный PUT скрывается ошибкой cleanup, submit завершается раньше lifecycle формы. B03/B05/B06/B21.
3. **Не сохранены идентичность и намерение пользователя при преобразованиях.** Индекс подменяет image ID, отсутствие metadata — удаление, ошибочная замена — сброс аватара, пустой selection — первоначальную загрузку, 0/null — пустую строку. B04/B07/B11/B18.
4. **Состояние запроса управляет слишком большой частью UI.** Optional image определяет успех core DTO; background error размонтирует форму; tail error скрывает страницы; retry обращается не к владельцу ошибки. B08/B09/B23/B27.
5. **Подтверждённые данные и оптимистические изменения согласуются без полного settlement-контракта.** Rollback заменяет чужие изменения, invalidation не охватывает представления, consumers повторяют reconciliation. B16/B17/B28.
6. **Типы и UI wrappers принимаются за runtime-гарантии.** `as`, `Number`, unchecked array indexing, неверный ref и произвольная композиция Link/Drawer оставляют реальные данные и нативную семантику непроверенными. B14/B19/B22/B26/B29–B33.
7. **Дублирующие представления теряют доменный контекст.** Валюта/точность, auth return и текст empty state различаются между экранами вместо использования существующих правил. B10/B25/B36.
