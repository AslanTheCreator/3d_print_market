# Аудит frontend: управление состоянием и формы

Дата: 01.10.2026. Проект: Figurzilla, `package.json` — 1.27.0.
Проверенная ревизия: `8377939`. До аудита уже существовали untracked-файлы
в `docs/frontend-audit/`; они не изменялись.

## 1. Результат

Найдено 11 проблем: 3 High и 8 Medium. Critical-проблем не подтверждено.
Основные риски — потеря незавершённого ввода, чужой черновик после смены
аккаунта и отправка payload, который уже не соответствует состоянию UI.
Все рекомендации реализуемы на frontend с существующими API.

| ID | Severity | Проблема | Effort |
| --- | --- | --- | --- |
| F1 | High | Черновик товара общий для разных аккаунтов | Medium |
| F2 | High | Успех сохранения товара уничтожает правки, сделанные во время запроса | Small |
| F3 | High | Retry checkout отправляет старый payload без полной проверки текущего состояния | Medium |
| F4 | Medium | Замена аватара рассинхронизирует preview, ID и намерение удалить фото | Medium |
| F5 | Medium | Добавление фото после ошибки восстановления теряет сохранённые ID | Medium |
| F6 | Medium | Редактор товара теряет различие между остатком 0 и null | Medium |
| F7 | Medium | Обновление корзины снова выбирает товары после явного снятия выбора | Small |
| F8 | Medium | Незавершённые формы теряются при клиентской навигации | Medium |
| F9 | Medium | Submit товара не защищён на уровне операции; edit можно отправить повторно после успеха | Small |
| F10 | Medium | Закрытие диалогов во время записи и отложенный reset теряют ввод | Small |
| F11 | Medium | Ошибка фонового чтения связей admin-товара размонтирует dirty-редактор | Small |

## 2. Discovery и scope

Прочитаны `AGENTS.md`, `package.json`, `tsconfig.json`, `next.config.mjs`,
`.eslintrc.json`, `steiger.config.mjs`, `playwright.config.ts` и относящиеся
к состоянию/формам разделы `docs/architecture.md`, `docs/api-and-auth.md`,
`docs/testing.md`. Предыдущий [аудит server state](./02-server-state.md)
использован для разграничения замечаний.

Стек: Next.js App Router, React, strict TypeScript, MUI, TanStack Query,
Zustand, React Hook Form, Axios, npm и Playwright. Проверки функций выполнялись
на установленном Node.js 24.15.0 с локальным TypeScript. Установлены React
19.2.4, RHF 7.71.1, Zustand 5.0.11 и TanStack Query 5.90.20; это версии
локального `node_modules`, а не обозначения диапазонов из `package.json`.

Сначала поиск `zustand`, `useForm`, `useWatch`, `useState`, `useEffect`,
`onSubmit`, `reset` и потребителей сформировал карту. Затем прослежены
связи store/query → hook → форма → callback успеха/ошибки/закрытия.
Глубокий анализ ограничен следующими сценариями:

| Область | Модули и источники состояния |
| --- | --- |
| Сессия | `entities/session/model/authStore.ts`, `useAuth.ts`, `useTokenRefresh.ts`, `app/providers/AuthProvider.tsx`; auth store + cookies, профиль отдельно в Query |
| Количество в корзине | `entities/cart/model/cartQuantityStore.ts`, `useCartQuantity.ts`, `useCartQueries.ts`, `useCartMutations.ts`; optimistic количество/revisions в Zustand, подтверждение через Query |
| Создание/редактирование товара | `widgets/create-product-form/model/useProductForm.tsx`, `productFormDraft.ts`, `useProductFormDraftState.ts`, `productFormSubmit.ts`; RHF + локальная модель изображений + baseline edit + browser draft |
| Изображения | `features/image-upload/model/useImageUpload.ts`, `useMultipleImageUpload.ts`; file/preview/upload status и ID вне RHF |
| Настройки продавца | `widgets/dashboard-settings/model/useSettingsDraft.ts`, формы `payment-accounts`, `shipping-methods`, `social-networks`; RHF и baseline, records/dictionaries в Query, visited tabs сохраняют mount |
| Профиль/адреса/пароль | `widgets/dashboard-home/ui/ProfileForm.tsx`, `entities/address/ui/AddressForm.tsx`, `widgets/dashboard-settings/ui/AddressManager.tsx`, `widgets/dashboard-security/ui/ChangePasswordForm.tsx`; RHF, локальный режим редактирования, mutations |
| Checkout | `widgets/checkout/model/useCheckoutState.ts`, `useCheckoutSelection.ts`, `useCheckoutAddress.ts`, `useCheckoutAddressCreation.ts`, `useCheckoutDelivery.ts`; локальные ID/выбор/комментарий, данные в Query, количество в cart projection |
| Создание заказов | `features/order-create/model/useOrderCreateSubmit.ts`; ref-lock, submitResult и сохранённые failed payloads |
| Действия с заказами | `features/order-payment`, `order-confirmation`, `order-shipping`, `order-cancel`, `order-receipt`; `widgets/orders/ui/*Dialog.tsx`, `model/useLeaveReview.ts`; mutations и состояние диалогов |
| Административные формы | `features/admin-product-management/ui/AdminProductEditor.tsx`, `admin-agent-settings/ui/AgentProfileForm.tsx`, `RecordSettings.tsx`, `admin-order-action/ui/AdminOrderActions.tsx`; RHF, locks, локальная сверка записи, session-scoped Query |
| Другой сложный local state | Выбор категорий, поиск, фильтр цены и фильтры заказов; отдельный черновик выбора до применения, URL/query или локальная подтверждённая величина |

В `src`/`app` найдены ровно два Zustand store. Глобального store форм,
каталога, адресов или настроек продавца не найдено. `useCreateProductForm`
экспортирован, но текущий UI использует `useProductForm`; старый hook не
считался действующим пользовательским сценарием. `useBatchForm` и
`useFormInitializer` также не имеют найденных потребителей, поэтому их
потенциальные дефекты не включены в замечания.

Backend, доступность endpoint, полнота серверных функций и изменения
контрактов вне scope. Production-код и комментарии не изменялись.

## 3. Подтверждённые проблемы

### F1. Черновик товара не изолирован между аккаунтами

**Severity:** High. **Effort:** Medium.

**Файлы и место:** [productFormDraft.ts](../../src/widgets/create-product-form/model/productFormDraft.ts),
строки 11–14, 138–176, 212–225;
[useProductFormDraftState.ts](../../src/widgets/create-product-form/model/useProductFormDraftState.ts),
строки 83–105;
[authStore.ts](../../src/entities/session/model/authStore.ts), строки 71–80.

**Проблема и почему:** browser key `create-product-form-draft` и module-level
memory draft не содержат владельца. Logout их не очищает. Создание товара
безусловно восстанавливает найденные values и imageIds.

**Сценарий:** пользователь A заполняет товар, выходит, пользователь B входит
в том же браузере и открывает создание товара. B получает черновик A.
Общий ключ подтверждён проверкой функций чтения/записи и поиском всех мест
очистки: они относятся к очистке формы/успешной публикации, а не logout.

**Последствия:** раскрытие незавершённых данных другому аккаунту,
перезапись чужого черновика и попытка публикации его изображений. Успешную
привязку чужого imageId backend-аудит не проверял и отчёт не предполагает.

**Исправление на frontend:** хранить черновик с подтверждённым account ID,
восстанавливать только после определения владельца; очищать memory и storage
при всех вариантах завершения/смены сессии. Старый общий ключ не переносить
автоматически неизвестному владельцу. Приватный Query cache и refresh race
уже рассмотрены как S1/S2 предыдущего отчёта; здесь оценивается именно draft.

### F2. Сохранение товара уничтожает новые правки, сделанные во время запроса

**Severity:** High. **Effort:** Small.

**Файлы и место:** [CreateProductFormContent.tsx](../../src/widgets/create-product-form/ui/components/CreateProductFormContent.tsx),
композиция формы и props полей;
[ProductMainInfoFields.tsx](../../src/widgets/create-product-form/ui/components/ProductMainInfoFields.tsx),
строки 49–128;
[ProductSaleFields.tsx](../../src/widgets/create-product-form/ui/components/ProductSaleFields.tsx),
поля продажи;
[MultiImageUpload.tsx](../../src/widgets/create-product-form/ui/components/MultiImageUpload.tsx),
строки 36–37, 219–220;
[productFormSubmit.ts](../../src/widgets/create-product-form/model/productFormSubmit.ts), строки 101–120.

**Проблема и почему:** pending блокирует действия сохранения/сброса, но не
поля, категории и изменения изображений. Запрос содержит snapshot на момент
submit. Успех create безусловно очищает черновик и делает reset всей формы;
успех edit запускает переход через 1500 мс независимо от последующих правок.

**Сценарий:** отправить товар на медленном соединении, затем изменить описание
или фото. Сервер получает прежнее значение. После успеха create новая правка
исчезает; edit уводит со страницы с ещё не отправленными изменениями.
В изолированной проверке submit callback выполнен после изменения draft:
успех сбросил новое значение в пустую форму.

**Последствия:** безвозвратная потеря ввода и ошибочное впечатление, что
последние видимые данные были сохранены. Загрузка нового фото во время
product mutation дополнительно рассинхронизирует image state и payload.

**Исправление на frontend:** блокировать все редактирующие controls,
включая picker и upload, на время записи и перехода после успеха. Если ввод
во время сохранения нужен, сравнивать revision формы со snapshot submit,
сохранять новые правки и не выполнять автоматический reset/уход для них.

### F3. Retry checkout использует устаревшие параметры заказа

**Severity:** High. **Effort:** Medium.

**Файлы и место:** [useOrderCreateSubmit.ts](../../src/features/order-create/model/useOrderCreateSubmit.ts),
строки 55–110, 130–138, 233–236, 256–283;
[orderCreatePayload.ts](../../src/features/order-create/model/orderCreatePayload.ts),
`buildOrderToCreate`, `getFailedOrders`.

**Проблема и почему:** `failedOrdersRef` сохраняет count/addressId/transferId/
comment исходной отправки. `retryFailed` проверяет наличие товара, sync status
и `enoughStock` текущей корзины, затем отправляет старый snapshot. Сравнения
его количества с подтверждённым количеством нет; текущий
`checkoutState.isReadyToSubmit` и актуальность адреса/доставки не проверяются.

**Сценарий и доказательство:** первая запись с count=5 отклонена mock-ошибкой
403. Затем подтверждённая корзина заменена на count=1, selectedAddress=null,
readiness=false. Вызов retry всё равно отправил count=5 и прежний addressId=2.
Проверка исполняла текущий hook и его payload/result helpers с mock Query/API.
Изменение состояния между попытками возможно при refetch или действиях
в другой вкладке; это не предположение о поведении endpoint.

**Последствия:** пользователь повторяет заказ в изменившемся UI, но отправляет
прежнее количество/назначение. `enoughStock` для текущего count не доказывает
достаточный остаток для count из старого payload.

**Исправление на frontend:** перед retry сравнивать сохранённые параметры
с актуальной подтверждённой корзиной, адресом и выбранной доставкой, проверять
общую readiness. При расхождении блокировать retry и возвращать пользователя
к проверке заказа; новый payload создавать после явного подтверждения.
Риск повторной записи после неизвестного сетевого результата — отдельный S4
в [02-server-state.md](./02-server-state.md), здесь он повторно не учитывается.

### F4. Preview аватара и отправляемый imageId расходятся после ошибки замены

**Severity:** Medium. **Effort:** Medium.

**Файлы и место:** [useImageUpload.ts](../../src/features/image-upload/model/useImageUpload.ts),
строки 36–44, 48–76;
[ProfileForm.tsx](../../src/widgets/dashboard-home/ui/ProfileForm.tsx),
строки 49–50, 76–109, 286–290.

**Проблема и почему:** начало нового upload меняет preview, но оставляет
предыдущие imageIds. Ошибка не отменяет эти ID. ProfileForm отдельно хранит
currentImageId и обновляет его effect только для непустого массива; пустой
массив после validation failure не очищает currentImageId. При этом wrapper
всегда ставит hasImageChanged=true, а save не учитывает imageError.

**Сценарии и доказательство:** после успешного A (ID 101) upload B завершился
ошибкой: preview остался B, imageIds=[101], isUploading=false. Для первой
невалидной замены существующего аватара currentImageId остаётся null,
hasImageChanged становится true: submit трактует ошибку выбора как удаление
прежнего фото и передаёт его в imageIdToDelete. Отдельная проверка показала,
что поздний upload после reset снова записывает ID при пустом preview;
revision/cancellation guard отсутствует.

**Последствия:** сохранение предыдущего изображения вместо видимого,
непреднамеренное удаление существующего аватара или ID без соответствующего
preview. Ошибка upload не препятствует сохранению профиля.

**Исправление на frontend:** использовать одну локальную модель
`unchanged / uploading / uploaded / failed / explicitlyRemoved` с парой
preview+ID и revision запроса. Не считать validation/upload failure явным
удалением, игнорировать поздние ответы после reset/замены. Передавать delete
только из явно выбранного удаления; блокировать submit незавершённой замены
либо явно возвращать подтверждённое изображение.

### F5. Новое фото молча заменяет все невосстановленные фото черновика

**Severity:** Medium. **Effort:** Medium.

**Файлы и место:** [useProductFormDraftState.ts](../../src/widgets/create-product-form/model/useProductFormDraftState.ts),
строки 53–58, 95–112, 128–142;
[CreateProductFormContent.tsx](../../src/widgets/create-product-form/ui/components/CreateProductFormContent.tsx),
передача uploadState без блокировки восстановления.

**Проблема и почему:** при ошибке восстановления старые IDs сохраняются
в preservedDraftImageIds. Как только imageUploadState содержит хотя бы один
новый ID, effectiveImageIds выбирает только этот массив, effect очищает
preserved IDs и снимает draftImageError. Явного отказа от старых фото нет.

**Сценарий и доказательство:** восстановление [77,88] не удалось, пользователь
добавил фото 99. Текущий hook вернул effectiveImageIds=[99], error=false;
следующая запись draft потеряла [77,88]. До завершения восстановления upload
также доступен: поздний setInitialImages может заменить уже добавленные фото.

**Последствия:** частичная потеря формы и публикация неполного набора
изображений с исчезнувшим предупреждением.

**Исправление на frontend:** отдельно учитывать сохранённые, восстановленные
и новые фото; добавление нового не должно означать удаление старых.
Блокировать изменения фото до окончания restore либо сливать результат
по ID с проверкой revision. Невосстановленные фото удалять только явным
действием; сохранять error/blocker до их восстановления или удаления.

### F6. Edit товара не сохраняет существующий остаток 0/null

**Severity:** Medium. **Effort:** Medium.

**Файлы и место:** [form.ts](../../src/entities/product/model/form.ts),
строки 61–79, 134, 173;
[productPublishRequirements.ts](../../src/widgets/create-product-form/model/productPublishRequirements.ts),
`hasCount`, `isReadyForProductPrimaryAction`;
[ProductSaleFields.tsx](../../src/widgets/create-product-form/ui/components/ProductSaleFields.tsx),
строки 166–186.

**Проблема и почему:** mapper переводит и count=0, и count=null в `""`.
Положительное количество обязательно для submit, nullable-переключателя нет.
Обратный mapper использует `parseInt(...) || null`, также теряя ноль.
Различие 0/null уже представлено в DTO (`number | null`), документации
и UI «Моих товаров»; это не предложенный новый backend-контракт.

**Сценарий и доказательство:** открыть внутренний товар с нулевым или
неограниченным остатком и исправить только название/описание. Count пуст,
readiness блокирует сохранение; ввод 0 отклоняется validation. Проверка
реального mapper подтвердила одинаковый `""` для обоих исходных значений.

**Последствия:** невозможно сохранить несвязанные правки без изменения
остатка; при обходе validation обратное преобразование не сохраняет 0.

**Исправление на frontend:** дать форме явное представление nullable count,
сохранять исходные 0/null при редактировании других полей, разделить правила
создания и редактирования согласно подтверждённому контракту. Не заменять
ноль на null через truthiness. Проверить round-trip для 0/null/положительного
значения. Возможные серверные ограничения отдельного PUT этот аудит не проверял.

### F7. Фоновое обновление корзины отменяет явное снятие выбора товаров

**Severity:** Medium. **Effort:** Small.

**Файл и место:** [useCheckoutSelection.ts](../../src/widgets/checkout/model/useCheckoutSelection.ts),
строки 31–57, 89–98.

**Проблема и почему:** effect считает любой пустой итоговый Set поводом выбрать
все текущие товары. Он не различает первоначальную загрузку и намерение
пользователя ничего не выбирать.

**Сценарий и доказательство:** снять выбор со всех товаров, затем изменить
количество/состав корзины и получить новый cartItems. Изолированная проверка
hook: selectedCount=0 стал 2 после изменения count в двух товарах.
Также удаление последнего выбранного товара автоматически выбирает оставшиеся,
которые пользователь ранее исключил.

**Последствия:** сумма и состав предполагаемого заказа меняются без выбора
пользователя; при следующем submit могут уйти нежелательные позиции.

**Исправление на frontend:** выбирать все только при первой успешной
инициализации. После взаимодействия сохранять пустой Set; при refetch
удалять исчезнувшие ID, не добавляя исключённые товары автоматически.

### F8. Защита незавершённого ввода не покрывает клиентскую навигацию

**Severity:** Medium. **Effort:** Medium.

**Файлы и место:** [DashboardSettingsWidget.tsx](../../src/widgets/dashboard-settings/ui/DashboardSettingsWidget.tsx),
строки 128–138;
[AddressManager.tsx](../../src/widgets/dashboard-settings/ui/AddressManager.tsx),
строки 177–198;
[useProductForm.tsx](../../src/widgets/create-product-form/model/useProductForm.tsx),
строки 142–172, 250–265;
[DashboardHomeWidget.tsx](../../src/widgets/dashboard-home/ui/DashboardHomeWidget.tsx),
строки 18–24;
[Header.tsx](../../src/widgets/header/ui/Header.tsx), строки 70–78;
[MobileBottomNavigation.tsx](../../src/widgets/mobile-navigation/ui/MobileBottomNavigation.tsx),
строки 144–145.

**Проблема и почему:** settings регистрируют только beforeunload. Link,
router.push/back в App Router выполняют переход без выгрузки документа и
теряют локальный RHF draft. Edit товара не сохраняется в browser draft
и защищён только во время upload; редактирование профиля также не защищено.
У edit AddressForm даже не передан onDirtyChange, в отличие от add-режима:
общий hasDraft не видит этот ввод и не включает beforeunload.

**Сценарий:** изменить реквизиты и уйти по нижней навигации; изменить товар
и нажать Back; изменить профиль и вернуться из редактора. Для edit адреса
риск распространяется и на reload/закрытие страницы. Вывод основан на
цепочке mount/unmount и обработчиков; браузерный сценарий не запускался.

**Последствия:** потеря текста, реквизитов и правок существующих сущностей.
Сохранение state при переключении settings tabs не защищает уход с route.

**Исправление на frontend:** сообщать dirty из обоих режимов адреса;
добавить согласованное подтверждение ухода для реальных Link/Back/закрытия
редакторов, сохранив beforeunload для полной навигации. Учитывать image dirty
и pending. Не персистить пароли/реквизиты ради решения этой проблемы.
Административная навигация использует нативные ссылки и собственную защиту;
это замечание не переносится автоматически на admin.

### F9. Submit товара не имеет блокировки жизненного цикла операции

**Severity:** Medium. **Effort:** Small.

**Файлы и место:** [productFormSubmit.ts](../../src/widgets/create-product-form/model/productFormSubmit.ts),
строки 50–126;
[useProductForm.tsx](../../src/widgets/create-product-form/model/useProductForm.tsx),
строки 267–309;
[CreateProductFormActions.tsx](../../src/widgets/create-product-form/ui/components/CreateProductFormActions.tsx),
строки 335–340.

**Проблема и почему:** submit handler не проверяет pending/upload/draft
readiness и не имеет ref-lock. RHF callback вызывает mutate и сразу возвращает
void, поэтому его завершение не означает завершение записи. Disabled кнопки
не является блокировкой самой операции. После успеха edit не обновляются
defaultValues/baseline, dirty остаётся true; между окончанием mutation
и отложенным переходом кнопка сохранения снова доступна.

**Сценарий и доказательство:** два вызова действующего handler привели к двум
mutate. Это проверка уровня функции, не доказательство двух обычных кликов
в браузере. Отдельно в edit можно нажать сохранение ещё раз в интервале
1500 мс после успеха: initializedProductIdRef не позволяет фоновому refetch
сбросить baseline и dirty, и handler принимает повтор.

**Последствия:** повторные PUT/cleanup и конкурирующие callbacks; при двух
вызовах create — два POST. Серверная идемпотентность здесь не предполагается.

**Исправление на frontend:** синхронно захватывать ref-lock до начала
async validation/записи, проверять readiness и использовать mutateAsync
с ожидаемым Promise. После подтверждения записи обновлять baseline,
блокировать повтор до выхода из success-state; освобождать lock при ошибке.

### F10. Диалоги отмены и отзыва могут очистить ввод до результата записи

**Severity:** Medium. **Effort:** Small.

**Файлы и место:** [CancelOrderDialog.tsx](../../src/widgets/orders/ui/CancelOrderDialog.tsx),
строки 60–67, 85–87, 104–110;
[LeaveReviewDialog.tsx](../../src/widgets/orders/ui/LeaveReviewDialog.tsx),
строки 224–233, 266–271;
[useLeaveReview.ts](../../src/widgets/orders/model/useLeaveReview.ts),
строки 40–47.

**Проблема и почему:** в cancel и review кнопка submit/часть действий disabled
при pending, но Escape/backdrop/верхний крестик по-прежнему вызывают close.
Cancel немедленно очищает reason/comment. Review через 300 мс делает reset
формы и mutation; таймер не отменяется при повторном открытии. `open` диалога
приходит из родительского local state, а hook содержит собственный
isDialogOpen, который не управляет отображением и не ограждает поздний reset.

**Сценарии:** отправить отмену/отзыв, закрыть крестиком до ответа, получить
ошибку — введённого текста уже нет. Закрыть отзыв, сразу открыть снова
и начать ввод — старый таймер сбросит новую форму. Изолированная проверка
close → reopen → delayed callback подтвердила выполнение reset после reopen.

**Последствия:** потеря текста при отказе записи; позднее закрытие/успех
может воздействовать на уже повторно открытый диалог. Пользователь лишается
контекста результата предыдущей попытки.

**Исправление на frontend:** использовать один источник open-state;
проверять pending во всех путях закрытия. Если закрытие во время записи
допускается, сохранять draft до подтверждённого результата и привязывать
callbacks к revision конкретного открытия. Сбрасывать форму через завершение
transition с проверкой текущего open либо отменять таймер при reopen/unmount.

### F11. Ошибка фонового запроса размонтирует административный редактор товара

**Severity:** Medium. **Effort:** Small.

**Файлы и место:** [AdminProductEditor.tsx](../../src/features/admin-product-management/ui/AdminProductEditor.tsx),
строки 19–23, 32–34, 40–55;
[adminQueries.ts](../../src/entities/product/model/adminQueries.ts),
строки 32–35;
[QueryProvider.tsx](../../src/app/providers/QueryProvider.tsx), строки 17–21.

**Проблема и почему:** ProductForm создаётся только при наличии editor;
editor вычисляется только если `!relations.error`. Ошибка refetch оставляет
прежние query data, но снимает editor и размонтирует компонент с useForm.
Локальный dirty-ввод уничтожается, а не просто временно блокируется.

**Сценарий и доказательство:** загрузить редактор, изменить поля, дождаться
устаревания query и пережить восстановление соединения с неуспешным чтением
связей. `refetchOnReconnect=true`, staleTime по умолчанию 30 секунд.
Проверка установленного TanStack QueryClient: после success → failed refetch
data остались, error установлен. При текущем условии родителя ProductForm
исчезает; после успешного retry он монтируется с серверными defaultValues.
Unmount следует из JSX; браузерный reconnect не воспроизводился.

**Последствия:** потеря названия, описания, ссылок и изменений фото без ухода
со страницы. Зарегистрированное предупреждение beforeunload не защищает
от внутреннего размонтирования и удаляется вместе с редактором.

**Исправление на frontend:** после первой успешной инициализации сохранять
экземпляр редактора и baseline при refetch error, показывая предупреждение
и блокируя запись при необходимости. Не заменять dirty-значения после retry;
первоначальную невозможность загрузить связи по-прежнему обрабатывать отдельно.

## 4. Что проверено без серьёзных замечаний

- **Оправданность глобального состояния.** Auth нужен между routes/providers;
  cart quantity — между карточкой товара, корзиной и checkout. Формы, фильтры,
  active tab и состояния диалогов остаются локальными. Необходимости переносить
  эти два store в отдельную feature или вводить новые глобальные stores нет.
- **Server state в Zustand.** Полного независимого cache доменных DTO нет.
  Cart хранит projection и последнее подтверждённое количество для rollback,
  что обосновано optimistic сценарием и описано в архитектуре. Проверяются
  revision/status, персистятся только items; после reload они требуют сверки.
  Наличие baseline в редактируемой форме не признано избыточной копией Query.
- **Selectors.** `useCartQuantity` подписывается на конкретные quantity/status
  и actions. Checkout summary подписан на все quantities для итогов, readiness
  — на syncStates. `useAuth()` и order-create hooks имеют подписки на весь store;
  это расширяет область возможных rerenders, но измеренного пользовательского
  замедления нет. Отдельное severity-замечание только ради оптимизации не создано.
- **Settings drafts.** `useSettingsDraft` задаёт defaultValues, защищает dirty
  от фонового reset, хранит baseline для diff, последовательно выполняет
  операции, сохраняет failed поля при частичном успехе и блокирует запись
  до перечитывания результата. Visited tabs не размонтируют RHF при переключении.
  Массивы form items индексируются стабильными ключами справочников, а не
  динамическими индексами; отсутствие useFieldArray само по себе не дефект.
- **Dirty/touched/validation.** RHF используется в товарах, настройках, адресах,
  профиле, смене пароля, отзыве и admin forms. Settings применяют onBlur /
  onChange revalidation, программные изменения доставки явно обновляют
  dirty/touched/validation. Существенного дефекта только из-за отсутствия
  touched indicator или другого validation mode не подтверждено.
- **Reset после ошибки.** AddressForm ловит rejected submit и сохраняет ввод;
  callers настроек пробрасывают ошибку. ChangePasswordForm очищает значения
  и видимость только после успеха, поля disabled при pending. ProfileForm
  и product form не сбрасывают текст при обычной ошибке mutation.
- **Первичная загрузка edit.** Профиль монтируется с userData; admin forms —
  с initial query data. Адресные редакторы имеют key по ID. Product edit
  инициализируется один раз на ID и не затирает ввод каждым refetch.
  Нужность безусловно синхронизировать defaultValues через useEffect не найдена.
- **Checkout.** Адрес выбирается ID и вычисляется из актуального списка ACTIVE
  адресов. Доставка сверяется с актуальными вариантами продавца. Первичный
  submit имеет ref-lock, проверку readiness, stock и quantity sync; создание
  адреса имеет отдельные editing/saving/resolving/error-фазы и защиту от повторов.
  Локальное хранение комментария/выбора вместо RHF не признано проблемой само
  по себе: конкретные дефекты приведены в F3/F7.
- **Admin.** Запись защищена ref-lock, поля блокируются на время операций,
  dirty/pending участвуют в предупреждении ухода. RecordSettings и order
  actions сверяют неопределённый результат без немедленного повторного submit;
  update профиля и восстановление товара различают запись и последующее чтение.
  Default values принимают исходные данные, включая count=0/null в admin editor.
  Исключение по сохранности dirty-ввода product editor — F11.
  Подтверждённых High/Critical дефектов состояния admin forms в этом scope нет.
- **Другой local state и effects.** Search debounce/URL sync, отдельный
  черновик категорий до «Готово» и черновики фильтров имеют функциональную
  причину. Derived totals/readiness преимущественно вычисляются. Массовое
  удаление effects или замена рабочего local state на RHF не обоснованы.

## 5. Проверки и ограничения доказательств

Выполнены discovery, чтение актуального кода и релевантных существующих тестов,
проверка call sites и изолированные исполнения через Node.js:
`typescript.transpileModule` → VM → действующие экспортируемые функции/hooks.
API, Query и React hooks подменены; для hooks использован минимальный
детерминированный runner состояния/effects с проверкой зависимостей.
Проверки ничего не отправляли на backend и не создавали сущности.

| Проверка | Результат |
| --- | --- |
| Mapper product count=0/null | Оба значения превратились в пустой обязательный count |
| Два вызова product submit handler | Два вызова mutate |
| Новая правка draft между submit и success | Успех очистил новую правку |
| Avatar A success → B failure | Preview B, imageIds A, upload уже не pending |
| Reset avatar → поздний upload success | ID появился снова при пустом preview |
| Checkout deselect all → новые cartItems | Выбраны все товары |
| Product draft storage | Один ключ без владельца и очистки на logout |
| Failed draft images [77,88] → новый upload 99 | Старые ID потеряны, error снят |
| Review close → reopen → старый timer | Reset выполнен после нового открытия |
| Checkout known rejection → count 1/readiness=false → retry | Отправлены прежние count 5/addressId 2 |
| Admin relations query success → failed refetch | Cached data сохранены, error установлен; условие родителя исключает редактор |

Эти проверки подтверждают логику переходов и payload, но не заменяют React
browser integration, реальное расписание событий или измерение rerenders.
Для проверки F11 использовался установленный TanStack QueryClient без подмены;
условие монтирования редактора прослежено статически.
Обычный double-click через браузер не воспроизводился; F9 разграничивает
отсутствие защиты handler и конкретное окно повторного edit после успеха.
Сценарии навигации F8 и непреднамеренного удаления существующего аватара F4
установлены статическим прослеживанием действующего кода.

Изучено покрытие `product-form-mapping.spec.ts`, `create-product.mobile.spec.ts`,
`settings-security.mobile.spec.ts`, `user-products-stock.spec.ts`, admin specs
и related order/auth tests. Оно проверяет основной restore/retry/settings
flow, но не даёт подтверждения устранения перечисленных крайних сценариев.
Эти suites в рамках аудита не запускались; новых постоянных тестов не добавлено.

Production build не выполнялся: найденные проблемы не зависят от сборки.
Lint/typecheck/architecture:check и полный smoke/e2e не запускались, поскольку
изменён только Markdown; для подтверждения выводов использованы описанные
точечные проверки. Проверены итоговый diff, ссылки отчёта и отсутствие
изменений production-файлов. Git читался с разовым `-c safe.directory=...`
из-за ownership checkout; глобальная Git-конфигурация не менялась.

## 6. Рекомендуемый порядок исправления и документация

1. Изоляция draft по владельцу (F1), сохранность ввода при записи товара (F2)
   и согласованность retry payload с актуальным checkout (F3).
2. Единая модель аватара и безопасное восстановление изображений (F4/F5),
   сохранение 0/null в edit (F6), сохранность явного выбора корзины (F7).
3. Защита ухода и жизненного цикла submit/диалогов (F8–F10), сохранение
   admin-редактора при ошибке фонового чтения (F11).

После исправлений нужны targeted browser regressions с задержками и отказами
mock API: смена аккаунта с draft, изменение формы во время записи, failed
avatar replacement, восстановление фото плюс новый upload, count round-trip,
пустой выбор после refetch, уход с dirty form, повтор edit после success,
закрытие/reopen диалога и изменение корзины/адреса перед retry.
Для admin editor — ошибка refetch связей при dirty-вводе и последующий retry.
Это рекомендации, а не утверждение о существующем покрытии.

Документация обновлена добавлением `docs/frontend-audit/03-state-and-forms.md`.
`AGENTS.md`, `docs/architecture.md`, `docs/api-and-auth.md` и `docs/testing.md`
не изменялись: аудит не меняет реализацию, архитектурные правила, API,
workflow или тестовую стратегию. Исправления остаются отдельными задачами.
