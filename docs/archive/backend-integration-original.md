1. Что изменить в существующей логике
   Заказы и их статусы
1. Добавить отображение CANCELLED во всех списках заказов, деталях, истории и фильтрах. Теперь это обычная отмена заказа; FAILED остаётся отдельным итогом спора в пользу покупателя. Миграция также переводит часть исторических заказов из FAILED в CANCELLED.
2. Для DISPUTED показывать, что по заказу идёт разбирательство, и блокировать обычные действия, которые уже не соответствуют текущему статусу. После решения администратора обновлять данные заказа и обращения.
3. Поменять прямую отмену: POST /order/{orderId}/FAILED заменён на POST /order/{orderId}/CANCELLED. В теле больше не нужен orderId; остаются closureReason и comment, причём текущая реализация использует именно comment. Прямая отмена доступна только для заказа в BOOKED.
4. Удалить старый вызов закрытия спора POST /order/orders/{orderId}/dispute/COMPLETED. Теперь спор завершает администратор через обращение.
5. Проверить экран подтверждения оплаты: если заказ перешёл в DISPUTED из AWAITING_PAYMENT, покупатель всё ещё может отправить подтверждение через существующий POST /order/{orderId}/ASSEMBLING; оно добавляется к открытому спору, а статус остаётся DISPUTED. Это отдельное состояние интерфейса, не обычный переход к сборке.
   Основание: [OrderController.java (line 123)](C:/Users/skura/IdeaProjects/model-store/src/main/java/com/model_store/controller/OrderController.java:123), [OrderServiceImpl.java (line 199)](C:/Users/skura/IdeaProjects/model-store/src/main/java/com/model_store/service/impl/OrderServiceImpl.java:199), [OrderStatus.java (line 3)](C:/Users/skura/IdeaProjects/model-store/src/main/java/com/model_store/model/constant/OrderStatus.java:3).
   Товары и изображения
1. Обновить клиентские типы: ProductAvailabilityType получил GIVEAWAY, ProductStatus — AWAITING_GIVEAWAY. Для обычного пользователя тип розыгрыша не должен появляться в форме создания товара: сервер разрешает его администратору.
2. Не пытаться открывать розыгрыш через обычный GET /product/{id}: этот endpoint исключает GIVEAWAY. Для него есть отдельный публичный API.
3. Для изображений заказа передавать Authorization в GET /images?ids=.... Публичный GET /images/metadata изображения заказа не возвращает. В существующем компоненте изображений лучше разделить загрузку карточек товара и доказательств по заказу.
4. Не показывать удаление загруженных изображений заказа: DELETE /images для tag=ORDER запрещён. При выборе файлов до отправки можно удалять их из локального предпросмотра.
   Основание: [ProductRepository.java (line 220)](C:/Users/skura/IdeaProjects/model-store/src/main/java/com/model_store/repository/ProductRepository.java:220), [ImageController.java (line 30)](C:/Users/skura/IdeaProjects/model-store/src/main/java/com/model_store/controller/ImageController.java:30).
2. Что добавить: обращения по заказам
   Интерфейс покупателя и продавца
   Добавить в детали заказа блок «Обращения» с историей по GET /order/{orderId}/cases. Ответ содержит массив OrderCaseDetail: объект orderCase, текущий orderStatus, участников, суммы, paymentProofImageId, orderImages и caseImages. В карточке обращения нужны тип, автор, причина, дата, состояние, ссылка на Telegram, а после решения — исход и комментарий администратора.
   Предусмотреть три действия:
   Действие	Когда доступно	Запрос	Что показать после отправки
   Открыть спор	Покупателю или продавцу после заявленной оплаты и при наличии подтверждения оплаты	POST /order/orders/{orderId}/DISPUTED?comment=...&imageIds=...	Заказ становится DISPUTED, обращение — OPEN
   Попросить отменить неоплаченный заказ	Покупателю или продавцу в допустимых неоплаченных состояниях	POST /order/{orderId}/cancellation-request?comment=...	Обращение — OPEN; статус заказа пока не меняется
   Сообщить об оплате после отмены	Только покупателю для CANCELLED	POST /order/{orderId}/payment-appeal?comment=...&imageIds=...	Заказ становится DISPUTED, обращение — OPEN


comment обязателен во всех трёх случаях. Для доказательств сначала загрузить файлы через POST /images?tag=ORDER&entityId={orderId}, затем передать полученные ID как imageIds. Запрос отмены доказательств не принимает. После создания обращения повторно загрузить заказ и список обращений. Для одного заказа одновременно допускается только одно открытое обращение; конфликт следует объяснять пользователю и обновлять экран. [OrderCaseService.java (line 50)](C:/Users/skura/IdeaProjects/model-store/src/main/java/com/model_store/service/impl/OrderCaseService.java:50).
Важная деталь для интерфейса: открытый запрос на отмену не виден по actualStatus заказа — статус не меняется. На странице заказа состояние нужно брать из /order/{orderId}/cases. Делать такой запрос для каждой строки большого списка заказов может быть дорого; если значок обращения нужен прямо в списке, лучше сначала добавить признак открытого обращения в ответ списка заказов на бэкенде.
Панель администратора
Добавить очередь обращений:
- GET /admin/actions/order-cases?state=OPEN&limit=50&offset=0 — список OrderCaseSummary. Поддержать вкладки OPEN и RESOLVED, пагинацию; limit допустим от 1 до 100.
- GET /admin/actions/order-cases/{caseId} — детали OrderCaseDetail. Именно здесь показывать участников, суммы и изображения.
- PUT /admin/actions/order-cases/{caseId}/telegram-url?url=... — прикрепление ссылки обсуждения. Допускается HTTPS-ссылка t.me или telegram.me.
- POST /admin/actions/order-cases/{caseId}/resolve?outcome=...&comment=... — решение с обязательным комментарием.
  Форму решения строить по orderCase.kind, а не из общего списка всех значений enum:
  Тип обращения	Доступные решения	Результат для заказа
  CANCELLATION_REQUEST	CANCELLED, REJECTED	Отмена заказа либо сохранение текущего статуса
  DISPUTE	BUYER; SELLER только если спор открыт из ON_THE_WAY	FAILED либо COMPLETED
  PAYMENT_APPEAL	BUYER, SELLER	В обоих случаях заказ возвращается в CANCELLED; исход фиксирует решение по обращению


LEGACY может встретиться у перенесённых старых споров, но отправлять его при новом решении нельзя. state и outcome в JSON выглядят строками, однако их набор ограничен enum; клиенту нужны соответствующие типы и подписи. Администратор проводит возможный возврат самостоятельно через прикреплённое обсуждение в Telegram: API автоматического возврата в этих коммитах нет. [AdminController.java (line 39)](C:/Users/skura/IdeaProjects/model-store/src/main/java/com/model_store/controller/AdminController.java:39), [OrderCaseService.java (line 141)](C:/Users/skura/IdeaProjects/model-store/src/main/java/com/model_store/service/impl/OrderCaseService.java:141).
3. Что добавить: розыгрыши
   Публичная часть
1. Добавить блок или страницу розыгрыша на основе GET /giveaways/active. Несмотря на имя, запрос возвращает также ближайший запланированный розыгрыш; его status будет AWAITING_GIVEAWAY. Если подходящего розыгрыша нет, сервер отвечает 404 — это нормальное пустое состояние.
2. Добавить страницу по прямой ссылке GET /giveaways/products/{productId}. Она доступна для включённого розыгрыша до endAt; после окончания или отключения запрос вернёт 404.
3. Показывать изображения, описание, homeText, rules, число победителей, даты и ссылку telegramUrl. Для запланированного розыгрыша показывать время до старта, для идущего — до завершения. Участие происходит по ссылке Telegram: в этих коммитах нет API регистрации участников или выбора победителей.
4. Обновлять данные при открытии страницы и на границах startAt/endAt. Сервер вычисляет публичную доступность по датам при запросе; постоянный опрос каждые несколько секунд не требуется. После завершения нужно перейти в состояние «розыгрыш окончен» или убрать блок после повторного запроса.
   Основание: [GiveawayController.java (line 17)](C:/Users/skura/IdeaProjects/model-store/src/main/java/com/model_store/controller/GiveawayController.java:17), [GiveawayResponse.java (line 7)](C:/Users/skura/IdeaProjects/model-store/src/main/java/com/model_store/model/dto/GiveawayResponse.java:7), [ProductRepository.java (line 246)](C:/Users/skura/IdeaProjects/model-store/src/main/java/com/model_store/repository/ProductRepository.java:246).
   Панель администратора
1. Расширить существующую форму создания товара: для availability=GIVEAWAY добавить вложенный объект giveaway с полями enabled, telegramUrl, startAt, endAt, winnersCount, rules, homeText. Даты отправлять как ISO 8601 с часовым поясом. Проверять Telegram URL, startAt < endAt, положительное число победителей и заполненные тексты.
2. Добавить управление розыгрышами: GET /admin/actions/giveaways/history?page=0&size=50, GET /admin/actions/giveaways/{productId}, PUT /admin/actions/giveaways/{productId}. История включает запланированные, идущие, завершённые и отключённые записи; ответ деталей содержит product, imageIds, categories. PUT принимает объект настроек giveaway без дополнительной обёртки.
3. Отображать giveawayEnabled отдельно от статуса. При enabled=false публичный розыгрыш скрывается. При повторном включении дата окончания должна оставаться в будущем. Пересекающиеся периоды включённых розыгрышей сервер отклоняет — такую ошибку стоит выводить рядом с датами.
4. Если в панели уже есть редактирование товаров бота, поддержать перевод его товара в розыгрыш через существующий PUT /admin/actions/agents/{agentId}/products/{productId}. Администратор также может создать собственный товар-розыгрыш через POST /products.
   Основание: [AdminGiveawayController.java (line 25)](C:/Users/skura/IdeaProjects/model-store/src/main/java/com/model_store/controller/AdminGiveawayController.java:25), [GiveawaySettingsRequest.java (line 8)](C:/Users/skura/IdeaProjects/model-store/src/main/java/com/model_store/model/GiveawaySettingsRequest.java:8), [ProductServiceImpl.java (line 362)](C:/Users/skura/IdeaProjects/model-store/src/main/java/com/model_store/service/impl/ProductServiceImpl.java:362).
4. Порядок реализации и проверки
1. Контракты и существующие экраны: обновить клиентские enum, подписи статусов, отмену заказа, обработку изображений заказа и убрать старое закрытие спора.
2. Обращения пользователя: блок истории в заказе, три формы открытия обращения, загрузка доказательств, обновление состояния после отправки.
3. Очередь администратора: список, детали, Telegram-ссылка, форма решения с вариантами по типу обращения.
4. Розыгрыши: публичный блок и страница, затем создание и управление в панели администратора.
5. Проверка сквозных сценариев: отмена BOOKED; запрос отмены с решением и отказом; спор с обоими допустимыми исходами; оплата после отмены; розыгрыш до старта, во время, после окончания и при отключении; доступ к изображениям под разными ролями.
   До реализации списка заказов стоит решить один вопрос по API: фронт сейчас не получает в FindOrderResponse признак открытого обращения и paymentProofImageId. Поэтому он не сможет точно показать все доступные действия и статус запроса отмены без дополнительного запроса на каждый заказ. Ещё одна особенность контракта — фактический путь открытия спора содержит двойное /order/orders/...; его следует использовать как есть либо отдельно исправить на бэкенде с согласованным изменением клиента.