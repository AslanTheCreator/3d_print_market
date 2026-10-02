# Аудит frontend: UX, responsive и accessibility

Дата: 02.10.2026. Проект: Figurzilla, версия `package.json` — 1.27.0.
Ревизия: `8377939`. До начала работы каталог `docs/frontend-audit/` уже
содержал untracked-отчёты; они не изменялись.

## 1. Результат

Подтверждено 12 замечаний этого этапа: 1 High, 9 Medium, 2 Low.
Critical-проблем не обнаружено. Дополнительно в разделе 4 отмечены три
сохраняющихся риска из предыдущих этапов, важные для UX; они не входят
повторно в эти 12 замечаний. Все рекомендации выполнимы на frontend
с существующими API. Это технический аудит, а не предложение редизайна.

| ID | Severity | Проблема | Effort |
| --- | --- | --- | --- |
| U1 | High | Ошибка пагинации скрывает каталог и запускает цикл запросов | Small |
| U2 | Medium | Повторное открытие фильтра заменяет выбранные границы цены | Small |
| U3 | Medium | Desktop-фильтр цены недоступен через последовательный Tab | Small |
| U4 | Medium | Мобильный фильтр обрезает действия при увеличении текста | Small |
| U5 | Medium | Ошибки RHF-форм не переводят фокус в невалидное поле | Small |
| U6 | Medium | На tablet/desktop нельзя прочитать полный текст длинного отзыва | Small |
| U7 | Medium | Действие продления товара вложено в ссылку карточки | Small |
| U8 | Medium | Модальные панели цены и отзывов не имеют семантики диалога | Small |
| U9 | Medium | Иконка меню кабинета имеет недостаточный контраст | Small |
| U10 | Medium | Видимые подписи формы отзыва не связаны с контролами | Small |
| U11 | Low | Empty state поиска ошибочно сообщает об отсутствии предзаказов | Small |
| U12 | Low | Desktop-ошибка профиля не предлагает повтор загрузки | Small |

Приоритет: остановить цикл U1; устранить подмену фильтра U2;
исправить keyboard/focus U3/U5; затем responsive- и semantic-дефекты.
Риски повторной записи и потери ввода из раздела 4 сохраняют свой приоритет.

## 2. Discovery, scope и метод

До глубокого анализа изучены `AGENTS.md`, `package.json`, `tsconfig.json`,
`next.config.mjs`, `.eslintrc.json`, `steiger.config.mjs`,
`playwright.config.ts` и релевантные разделы `docs/architecture.md`,
`docs/api-and-auth.md`, `docs/testing.md`. Поиск routes, UI-компонентов,
responsive-стилей, overlays и тестов определил следующие связи:

| Область | Основная цепочка |
| --- | --- |
| Общий интерфейс | `app/layout.tsx` → `AppLayout` → Header, Footer, MobileBottomNavigation; общие offsets и MUI-тема |
| Каталог и поиск | HomeProducts / CategoryProducts / SearchProducts → InfiniteScroll → ProductCatalog → ProductCard и purchase/favorite actions |
| Цена | PriceRangeFilter → usePriceRangeFilter → trigger, desktop Popper, mobile Drawer, PriceInput |
| Товар | ProductDetailsWidget → ProductDetailsContent → галерея, описание, покупка, отзывы, RelatedProducts |
| Корзина и checkout | Checkout → CheckoutContent → адрес, группы продавцов/доставка, карточки количества, summary; order-create → result dialog |
| Кабинет и продавец | DashboardHomeWidget/ProfileForm, dashboard-settings/security, UserProductsList/UserProductCard, CreateProductForm и draft/publish hooks |
| Заказы | OrdersWidget → desktop/mobile controls и списки → details, payment, shipping, cancel, receipt, review |
| Администрирование | AdminShell, списки и Drawer заказа; дополнительно проверены явные имена действий и структура панели |

Стек: Next.js App Router, React, TypeScript strict, Material UI,
TanStack Query, Zustand, React Hook Form, Axios, npm, Playwright.
Установленные версии, проверенные через локальные `package.json`:
Next.js 15.5.21, React 19.2.4, MUI 5.18.0, RHF 7.71.1,
Playwright 1.60.0. Диапазон Next.js в корневом `package.json` —
`^15.5.24`; наблюдения относятся к установленной среде.

Методы: статический анализ связанных frontend-модулей, существующих
регрессий и точечные headless Chromium-проверки локального dev-приложения.
Использовались существующие fixture и mock API; записи на реальный backend
не выполнялись. Production build не запускался.

Проверены compact, tablet и desktop-ветки. Для списка продавца отдельно
измерены ширины 320/375/393/599/600/768/899/900/1376 px;
для отзывов — 600/768/1376 px; для фильтра — desktop и 393×727.
Проверка увеличенного текста меняла корневой font-size с 16 до 32 px:
это проверка reflow текста, а не имитация реальной экранной клавиатуры.

Safari/WebKit, физические устройства, реальная мобильная клавиатура,
screen reader и production CLS в этот запуск не входили. Наличие
правильных aria-атрибутов не приравнивается к испытанию screen reader.
Backend, доступность его возможностей и неподтверждённые контракты
не являются объектом замечаний.

## 3. Подтверждённые проблемы

### U1. Ошибка следующей страницы скрывает карточки и запускает цикл запросов

**Severity:** High. **Effort:** Small.

**Файлы и место:** [InfiniteScroll.tsx](../../src/shared/ui/infinite-scroll/InfiniteScroll.tsx),
строки 26–30; [ProductCatalog.tsx](../../src/widgets/product-catalog/ui/ProductCatalog.tsx),
строки 55–56; [SearchProducts.tsx](../../src/widgets/product-catalog/ui/SearchProducts.tsx),
строки 90–109. Такая же композиция используется HomeProducts и CategoryProducts.

**Проблема:** `InfiniteScroll` запускает загрузку, если sentinel виден,
`hasNextPage=true` и `isFetchingNextPage=false`, без учёта ошибки.
После неуспешного fetch следующий эффект снова выполняет запрос.
`ProductCatalog` одновременно заменяет уже полученные карточки на ErrorState,
потому что общий `isError` проверяется раньше наличия данных.

**Доказательство:** mock первой страницы вернул 10 товаров; следующая
страница отвечала HTTP 400. После прокрутки карточка первой страницы исчезла
из DOM, ErrorState появился, счётчик запросов вырос с 6 до 32 за одну секунду
без нажатия «Обновить». Это цикл frontend, а не отсутствие endpoint.

**Почему и последствия:** локальный сбой дозагрузки делает весь каталог
недоступным, нарушает scroll context и создаёт неконтролируемую нагрузку
запросами. Пользователь не управляет восстановлением.

**Исправление на frontend:** разделить initial error и next-page/refetch
error; сохранить загруженные карточки. При ошибке остановить observer-загрузку
до явного retry, показать ошибку и кнопку дозагрузки после списка. Использовать
существующие query-флаги `isFetchNextPageError`/`isRefetchError` в композиции,
передавая shared-компоненту нейтральное разрешение загрузки. Retry должен
повторять конкретную неудачную дозагрузку, без бесконечного эффекта.

### U2. Фильтр подменяет применённый диапазон ценами текущей страницы

**Severity:** Medium. **Effort:** Small.

**Файлы и место:** [usePriceRangeFilter.ts](../../src/widgets/product-catalog/ui/price-range-filter/usePriceRangeFilter.ts),
строки 54–66, 213–216; [SearchProducts.tsx](../../src/widgets/product-catalog/ui/SearchProducts.tsx),
расчёт `availablePriceRange`; CategoryProducts использует тот же подход.

**Проблема:** `syncDraftValues` выбирает `availableRange` раньше `value`.
При этом available range вычисляется только из уже загруженных результатов,
включая результаты применённого фильтра. Это не сохранённый выбор пользователя
и не общий диапазон каталога.

**Доказательство:** применены 1000–9000 ₽, выдача содержит товар 1500 ₽.
После открытия кнопка сохраняет текст «Цена: от 1 000 до 9 000»,
а оба поля показывают «1 500». Нажатие «Готово» без изменения полей
отправит другой фильтр. При односторонней границе добавляется и вторая.

**Почему и последствия:** UI незаметно изменяет намерение пользователя;
последующие запросы исключают подходящие товары вне нового диапазона.

**Исправление на frontend:** при открытии заполнять draft из `value`,
сохраняя отсутствующие границы пустыми. Цены текущей страницы использовать
только как явно обозначенные подсказки, а не как введённые значения.
Новый backend endpoint диапазона для этого не нужен.

### U3. Tab не позволяет перейти в desktop-панель фильтра

**Severity:** Medium. **Effort:** Small.

**Файлы и место:** [usePriceRangeFilter.ts](../../src/widgets/product-catalog/ui/price-range-filter/usePriceRangeFilter.ts),
`handleTriggerFocus`, `handleTriggerBlur`, `handlePopoverBlur`;
[PriceRangeDesktopPanel.tsx](../../src/widgets/product-catalog/ui/price-range-filter/PriceRangeDesktopPanel.tsx),
строки 37–57; [PriceRangeTrigger.tsx](../../src/widgets/product-catalog/ui/price-range-filter/PriceRangeTrigger.tsx),
обработчики focus/blur.

**Проблема:** открытая через focus/Enter панель находится в portal Popper.
При Tab фокус идёт к следующей карточке в основном DOM, trigger blur
закрывает панель. Передачи фокуса в поле нет; Escape также не обрабатывается.

**Доказательство:** на desktop focus → Enter → Tab закрыл поля,
`document.activeElement` стал ссылкой товара. При открытой панели и
фокусе в поле Escape оставил её открытой. Существующий keyboard-тест
фильтра заполняет поле через `locator.fill()` и переводит фокус напрямую
через `.focus()`, поэтому не проверяет реальный путь Tab.

**Почему и последствия:** пользователь клавиатуры не может последовательно
достичь основных полей фильтра; focus management не соответствует открытому
интерактивному элементу.

**Исправление на frontend:** обеспечить последовательный вход в панель
из trigger и выход назад, Escape с восстановлением фокуса; связать trigger
с ID панели. Подойдёт существующий MUI Popover/Dialog с корректным управлением
фокусом либо Popper без portal с продуманным tab order. Проверять именно
Tab/Shift+Tab, без программного обхода маршрута.

### U4. Мобильная панель цены обрезает кнопку при увеличении текста

**Severity:** Medium. **Effort:** Small.

**Файл и место:** [PriceRangeMobileDrawer.tsx](../../src/widgets/product-catalog/ui/price-range-filter/PriceRangeMobileDrawer.tsx),
строки 34–53: `height: "189.2px"`, `overflow: "hidden"`, фиксированный padding.

**Проблема:** высота панели жёстко задана и не зависит от размеров текста;
контент не прокручивается. Нижний padding не учитывает safe-area.

**Доказательство:** на 393×727 при font-size 16 px низ кнопки «Готово» —
725.78 px, низ панели — 727 px: почти нет свободного пространства.
При font-size 32 px кнопка высотой 44 px заканчивается на 767.77 px,
за границей панели; большая часть действия скрыта `overflow: hidden`.

**Почему и последствия:** увеличение текста для читаемости лишает пользователя
доступной кнопки применения. Поведение на реальном устройстве с клавиатурой
не проверялось; отсутствие safe-area — дополнительный риск по коду,
а не утверждение о воспроизведённом сбое Safari.

**Исправление на frontend:** заменить фиксированную высоту на высоту контента,
ограничить её доступным `dvh`, разрешить scroll при недостатке места,
сохранить доступность actions и добавить `safe-area-inset-bottom`.

### U5. Ошибки формы не переводят фокус на невалидный input

**Severity:** Medium. **Effort:** Small.

**Файлы и место:** [ChangePasswordForm.tsx](../../src/widgets/dashboard-security/ui/ChangePasswordForm.tsx),
строки 142–145, 191–194, 267–270;
[ProfileForm.tsx](../../src/widgets/dashboard-home/ui/ProfileForm.tsx),
Controller/TextField для login, fullName, phoneNumber;
[ProductMainInfoFields.tsx](../../src/widgets/create-product-form/ui/components/ProductMainInfoFields.tsx),
Controller/TextField имени и описания. Общий паттерн — `<TextField {...field}>`.

**Проблема:** `field.ref` попадает на корневой элемент TextField,
а не на input/textarea через `inputRef`. Автоматический focus RHF
при отказе валидации поэтому не достигает поля.

**Доказательство:** в форме безопасности заполнен текущий пароль,
нажато «Изменить пароль» при пустых новых паролях. Два input получили
`aria-invalid=true`, но фокус остался на submit-кнопке.
Остальные перечисленные формы имеют тот же wiring; их каждый сценарий
отдельно не воспроизводился.

**Почему и последствия:** пользователи клавиатуры и screen reader остаются
внизу формы без перехода к месту исправления; на длинной мобильной форме
ошибка может находиться за пределами viewport.

**Исправление на frontend:** отделять `ref` от `field`, передавать его
в `inputRef`; для составных picker обеспечить ref доступного control.
Сохранить существующую связь helperText и ошибок, проверить submit с ошибкой
и попадание фокуса в первый input. При прокрутке учитывать fixed header.

### U6. Полный текст отзыва недоступен на tablet/desktop

**Severity:** Medium. **Effort:** Small.

**Файл и место:** [ProductReviewsSection.tsx](../../src/widgets/product-details/ui/ProductReviewsSection.tsx),
`ReviewCard`, строки 58–72; desktop Swiper, строки 365–393;
кнопка «Все» находится только в ветке `<600 px`.

**Проблема:** у обычного ReviewCard высота 180 px и `overflow: hidden`.
Ширина каждого slide всегда равна одной трети контейнера даже на tablet.
При длинном тексте нет раскрытия, scroll или доступного перехода к полному
отзыву на ширине ≥600 px.

**Доказательство:** существующий fixture-отзыв дал `clientHeight=178`
и `scrollHeight=281` при 600 px, `178/214` при 768 px.
Обрезание подтверждено без искусственного длинного текста.
При 1376 px этот короткий fixture помещается; более длинный текст
по тем же стилям также будет обрезан.

**Почему и последствия:** сведения об опыте покупки, включая возможные
недостатки товара, скрываются в существующем marketplace-интерфейсе.
Пользователь мыши/клавиатуры не может прочитать их целиком.

**Исправление на frontend:** сделать высоту по содержимому либо дать
доступное раскрытие/открытие полного отзыва на всех viewport.
Количество колонок менять по существующим breakpoints, если требуется
сохранить карточную композицию. Все нужные данные уже загружены.

### U7. Кнопка продления вложена в ссылку товара

**Severity:** Medium. **Effort:** Small.

**Файлы и место:** [UserProductCard.tsx](../../src/widgets/user-products/ui/UserProductCard.tsx),
ссылка со строки 145 и ExtendProductButton со строки 317;
[ExtendProductButton.tsx](../../src/widgets/user-products/ui/ExtendProductButton.tsx),
строки 77–100.

**Проблема:** у товара, требующего продления, нативный Button находится
внутри Next Link. Это вложение самостоятельного интерактивного control
в другой интерактивный control. Mouse preventDefault на wrapper
не исправляет структуру HTML или accessibility tree.

**Доказательство:** fixture списка с 12 товарами, истекающими 03.10.2026,
дал 12 элементов `a button`. Enter на кнопке в Chromium открыл диалог
без навигации — случайный переход в этом запуске не воспроизведён.

**Почему и последствия:** ссылка и действие образуют неоднозначную
интерактивную область, усложняют tab order и интерпретацию для assistive
technology; поведение зависит от подавления всплывающих событий.

**Исправление на frontend:** вынести действие продления за пределы Link,
как уже сделано для редактирования. Сохранить самостоятельные ссылку и кнопку,
проверить Enter/Space и доступные имена без вложения controls.

### U8. Панели цены и отзывов не объявлены как модальные диалоги

**Severity:** Medium. **Effort:** Small.

**Файлы и место:** [PriceRangeMobileDrawer.tsx](../../src/widgets/product-catalog/ui/price-range-filter/PriceRangeMobileDrawer.tsx),
Drawer со строки 34;
[ProductReviewsSection.tsx](../../src/widgets/product-details/ui/ProductReviewsSection.tsx),
Drawer со строки 398.

**Проблема:** Drawer создаёт modal surface, но его Paper не имеет
`role="dialog"`, `aria-modal` и привязанного имени. В панели цены нет
связи с заголовком; у отзывов `aria-labelledby` передан внешнему Drawer,
а не семантическому dialog surface.

**Доказательство:** в открытом mobile price Drawer у `.MuiDrawer-paper`
`role=null`, `aria-labelledby=null`. У отзывов отсутствие роли и её wiring
подтверждены кодом и устройством установленного MUI Drawer.
Это не относится к уже именованным Dialog категорий/аккаунта/доставки
и к admin order Drawer, где Paper явно имеет `role="dialog"`.

**Почему и последствия:** удержание фокуса есть, но контекст нового
модального окна и его название не представлены соответствующей семантикой.

**Исправление на frontend:** использовать MUI Dialog с тем же bottom-sheet
оформлением либо назначить Paper роль dialog, `aria-modal=true`,
`aria-labelledby` на ID заголовка. Проверить объявление имени,
Escape и возврат фокуса; не отключать существующий focus trap.

### U9. Иконка меню кабинета недостаточно контрастна

**Severity:** Medium. **Effort:** Small.

**Файлы и место:** [AppLayout.tsx](../../src/app/layouts/AppLayout.tsx),
строки 40–51; [theme.ts](../../src/app/config/theme.ts), `secondary.main`;
[Header.tsx](../../src/widgets/header/ui/Header.tsx), голубой фон header.

**Проблема и доказательство:** кнопка «Открыть меню разделов профиля»
задаёт белую иконку на `#54C5E5`. На `/dashboard/security` Chromium
подтвердил `rgb(255,255,255)` поверх `rgb(84,197,229)`.
Расчёт относительной яркости этих конкретных цветов даёт контраст 2.001:1,
ниже 3:1 для значимого графического control. Измерение не зависит
от изображений, opacity, неподтверждённого фона или вкусовой оценки.

**Почему и последствия:** единственный trigger меню на вложенных mobile/tablet
страницах кабинета труднее различать пользователям со сниженным зрением.

**Исправление на frontend:** использовать существующий
`secondary.contrastText=#212121`, как у Back и заголовка этой же панели.
Новый цвет или переработка темы не нужны.

### U10. Подписи формы отзыва не связаны с полями

**Severity:** Medium. **Effort:** Small.

**Файл и место:** [LeaveReviewDialog.tsx](../../src/widgets/orders/ui/LeaveReviewDialog.tsx),
строки 281–315, 343–368.

**Проблема:** «Ваша оценка» и «Комментарий» — отдельные Typography
без связи с Rating и textarea. У textarea нет label/aria-labelledby;
ошибка оценки тоже не привязана к группе контролов.

**Доказательство:** открытая форма отзыва по mock завершённому заказу:
`textarea.labels.length=0`, `aria-label=null`, `aria-labelledby=null`.
Placeholder существует, поэтому не утверждается полное отсутствие
accessible name во всех браузерах; он не заменяет видимую связанную подпись.

**Почему и последствия:** инструкции, выбранная оценка и validation feedback
не объединены программно; пользователю assistive technology сложнее понять
контекст и исправить ошибку формы.

**Исправление на frontend:** для комментария использовать `TextField label`
либо ID подписи и `aria-labelledby`; рейтинг объединить в именованную группу
через FormControl/FormLabel или fieldset/legend, связать ошибку
`aria-describedby`, локализовать имена вариантов средствами MUI.
Payload и validation rules менять не требуется.

### U11. Пустой поиск сообщает об отсутствии предзаказов

**Severity:** Low. **Effort:** Small.

**Файлы и место:** [ProductCatalog.tsx](../../src/widgets/product-catalog/ui/ProductCatalog.tsx),
строки 59–75; SearchProducts/CategoryProducts передают сюда любой каталог.

**Проблема:** одинаковый empty state сообщает «нет доступных предзаказов»
для любого поиска, категории и диапазона цены. Доступное действие —
перечитать тот же запрос, без объяснения влияния фильтра.

**Почему и последствия:** отсутствие совпадений трактуется как отсутствие
определённого типа товаров; покупателю предлагают малоэффективное обновление
вместо изменения условий. Это неверный текст состояния, а не нехватка данных API.

**Исправление на frontend:** передавать контекст empty state из композиции:
«По этому запросу ничего не найдено», «Измените запрос или цену»;
при активном фильтре предложить его сброс через уже существующее действие.
Для действительно пустой категории оставить нейтральное объяснение.

### U12. На desktop нельзя повторить загрузку профиля из error state

**Severity:** Low. **Effort:** Small.

**Файлы и место:** [DashboardHomeWidget.tsx](../../src/widgets/dashboard-home/ui/DashboardHomeWidget.tsx),
ветка `error || !userData`;
[ErrorState.tsx](../../src/shared/ui/states/ErrorState.tsx), условие `!hideRetry && onRetry`.

**Проблема и доказательство:** mobile-ветка выводит кнопку, вызывающую
существующий `refetch`, а desktop-ветка передаёт только `type="profile"`.
ErrorState без onRetry не создаёт кнопку повтора. Подтверждено кодом;
отдельный browser-сценарий desktop-ошибки не запускался.

**Почему и последствия:** после временного сбоя пользователь desktop
должен самостоятельно перезагрузить страницу или уйти и вернуться,
хотя компонент уже располагает безопасным способом восстановить данные.

**Исправление на frontend:** передать имеющийся `refetch` в onRetry
desktop ErrorState и состояние `isFetching` для блокировки повторов.
Контракт профиля менять не требуется.

## 4. Сохраняющиеся UX-риски предыдущих этапов

Эти замечания повторно сверены с текущим кодом. Ссылки указывают на подробные
доказательства; исправления не требуют новых backend-возможностей.

### Неопределённый результат checkout предлагается повторить

**Severity:** High. **Effort:** Medium. Подробности:
[02-server-state.md, S4](./02-server-state.md#s4-checkout-разрешает-повтор-записи-с-неизвестным-результатом).

**Файлы/место:** `features/order-create/model/useOrderCreateSubmit.ts`,
`submitSingleOrder`/`retryFailed`; `widgets/checkout/ui/CheckoutResultDialog.tsx`,
строки 62–64, 86–104, кнопка повтора со строки 272.
Transport failure остаётся retryable, а UI утверждает «Заказы не были оформлены».
Потеря ответа не доказывает отказ записи; повтор может создать дубль,
если исходная операция завершилась. Frontend должен показать неизвестный
результат, заблокировать слепой повтор, предложить открыть/перечитать
существующие покупки; отсутствие уверенного совпадения не превращать в отказ.
Обычный double-click уже защищён ref-lock: это отдельный сценарий.

### Клиентская навигация уничтожает dirty-ввод

**Severity:** Medium. **Effort:** Medium. Подробности:
[03-state-and-forms.md, F8](./03-state-and-forms.md).

**Файлы/место:** `widgets/create-product-form/model/useProductForm.tsx`,
`handleBack` и edit-режим без сохранения draft;
`widgets/dashboard-home/ui/ProfileForm.tsx`, `onBack`;
`widgets/dashboard-settings/ui/DashboardSettingsWidget.tsx`, beforeunload;
`widgets/header/ui/Header.tsx`, `handleBack`.
SPA Back/ссылки обходят beforeunload, формы размонтируются. Значительные правки
товара или настроек теряются без подтверждения. Защищать явные внутренние
переходы dirty-форм; при отказе сохранять маршрут и ввод. Создание товара
уже имеет local draft, поэтому универсальная confirmation каждого перехода
там не требуется. Пароли и платёжные данные не сохранять в browser storage.

### Закрытие cancel/review во время запроса теряет ввод и контекст результата

**Severity:** Medium. **Effort:** Small. Подробности:
[03-state-and-forms.md, F10](./03-state-and-forms.md).

**Файлы/место:** `widgets/orders/ui/CancelOrderDialog.tsx`, `handleClose`;
`widgets/orders/ui/LeaveReviewDialog.tsx`, `handleClose`/onClose/верхний крестик;
`widgets/orders/model/useLeaveReview.ts`, reset через 300 мс.
Submit disabled, но закрытие через Escape/backdrop/крестик остаётся доступным.
После отказа пользователь теряет текст; таймер от прошлого закрытия
может сбросить уже повторно открытую форму. Проверять pending во всех путях
закрытия; отменять устаревший reset или привязать его к завершению transition
и revision открытия. Сохранять draft до подтверждённого исхода операции.

## 5. Остальные области и границы выводов

| Область | Что установлено |
| --- | --- |
| Viewport и shell | `lang=ru`, device-width, initialScale=1, viewportFit=cover; запрета zoom нет. Responsive offsets, safe-area и reserve под bottom navigation реализованы. Общей серьёзной проблемы shell не обнаружено. |
| Horizontal overflow | В точечном browser-прогоне списка продавца document scrollWidth равен clientWidth на всех девяти проверенных ширинах. Это не гарантия для всех данных и routes. |
| Mobile navigation | Основная навигация использует именованный nav, нативные ссылки, aria-current; категории/аккаунт открываются именованными Dialog. Существенного нового блокера не найдено. |
| Touch targets | Тема задаёт минимум 44 px для Button/IconButton/Checkbox/Radio/Tab/Rating labels; счётчики явно соблюдают 44×44. Глобальное уменьшение targets не подтверждено. Наличие минимума не исправляет обрезание U4 или вложение U7. |
| Sticky/fixed и scroll | Layout резервирует shell offsets. Publish/settings bars используют Visual Viewport и ResizeObserver, резервируют высоту и прокручивают активное поле. Реальная экранная клавиатура не проверена; подтверждённый дефект — U4. |
| Формы | Auth имеет labels, autocomplete и именованные password actions; адрес использует address autocomplete; numeric/decimal/tel inputMode применён в соответствующих полях. Оставшиеся defects — U5/U10 и риски раздела 4. |
| Loading/skeletons | Каталог, товар, корзина, заказы и кабинет имеют skeleton-компоненты с responsive геометрией; изображения резервируют размер/aspectRatio. По коду нового существенного layout shift не подтверждено. Production CLS не измерялся. |
| Error/empty/success | Состояния имеются, checkout различает полный/частичный успех, настройки сохраняют ввод при ошибке записи. Конкретные недостатки — U1/U11/U12 и неопределённый checkout-result. |
| Mutations/disabled | Order-create имеет ref-lock; payment/shipping/receipt проверяют pending и актуальный статус. Это не распространяется автоматически на close/retry: соответствующие риски приведены отдельно. |
| Destructive actions | Удаление товара/адреса и очистка product draft имеют confirmation; получение заказа подтверждается диалогом. Требования подтверждать каждое обратимое действие не добавлялись. |
| Product details | Native gallery controls именованы, fullscreen использует Dialog, описание безопасно выводится текстом и раскрывается через aria-expanded/controls. Дефект чтения отзывов — U6; metadata/backend completeness не оценивались. |
| Контраст | Тема уже использует primary.dark/accent для текста и заливок; warning имеет тёмный contrastText. Подтверждённое исключение — U9. Контраст фотографий и неизвестных фонов не оценивался. |
| Admin | Order Drawer явно именован и имеет role=dialog; actions и список используют нативные controls. Полного browser acceptance админки в этом этапе не было; ограничения её API не записаны как UX-дефекты. |

## 6. Проверки, ограничения и документация

Запущена существующая регрессия:

```text
npx playwright test accessibility-interactions.spec.ts accessibility-authenticated-controls.spec.ts mobile-rendering.mobile.spec.ts --workers=2
```

Прогон не является успешным: `test-results/.last-run.json` зафиксировал
`status=failed` и один failed test. В сохранённом error-context это
`mobile streamed SSR fallback exposes progressive navigation without JavaScript`:
assertion ожидает в пути изображения `site`, получен
`/_next/static/media/logo.<hash>.svg`. Код Header и `docs/testing.md`
подтверждают текущий SVG mobile logo. Это устаревшее ожидание теста,
а не доказательство поломки UI. Тест в рамках аудита не изменялся.

Дополнительно выполнены три временных browser probe на localhost dev server
с существующим SSR fixture и перехватом browser API. Они подтвердили:

- U1: исчезновение полученных карточек и рост счётчика запросов 6 → 32 за 1 с;
- U2/U3: подмену диапазона, закрытие по Tab и отсутствие закрытия по Escape;
- U4: выход кнопки применения за границу панели при увеличении текста;
- U5: сохранение фокуса на submit при невалидных полях смены пароля;
- U6: обрезание существующего fixture-отзыва при 600/768 px;
- U7: наличие `a button` у товаров с действием продления;
- U8/U9/U10: DOM-атрибуты панели/textarea и конкретные computed colors;
- отсутствие horizontal overflow списка продавца на перечисленных ширинах.

Эти измерения доказывают конкретные frontend-сценарии, а не покрытие
всего интерфейса или правильность реального backend. Для исправлений нужны
регрессии реального Tab-path, error-pagination, text reflow, сохранения
dirty-ввода и pending-close; добавление библиотеки не требуется.

Production-код, конфигурация и существующие тесты не изменялись.
Production build, lint, typecheck и architecture:check не запускались:
результат задачи — Markdown-отчёт, изменения runtime отсутствуют.
Проверены ссылки отчёта и ограниченность изменений.

**Документация:** добавлен только этот отчёт. `AGENTS.md`,
`docs/architecture.md`, `docs/api-and-auth.md`, `docs/testing.md`
не обновлялись: аудит не меняет действующие правила, API, UI-поведение,
структуру проекта или workflow. Замечания описывают необходимые исправления,
а не уже выполненные изменения.
