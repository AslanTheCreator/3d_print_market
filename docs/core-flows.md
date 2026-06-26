# Core flows

Документ описывает основные MVP-сценарии frontend. Он фиксирует только то, что видно из текущих routes, widgets, features и entities.

## Общие правила flows

- Route files в `app/` остаются тонкими.
- Композиция сценариев находится в `widgets`.
- Пользовательские действия находятся в `features`.
- Данные и API сущностей находятся в `entities`.
- API-зависимый UI должен иметь loading, error, empty и success states.
- Backend-поведение не описывать как факт, если оно не подтверждено кодом или контрактом.

## Публичный каталог

Входные точки:

- `/`
- `/catalog/category/[...slug]`
- `/catalog/search`

Основные слои:

- routes: `app/page.tsx`, `app/(catalog)/catalog/category/[...slug]/page.tsx`, `app/(catalog)/catalog/search/page.tsx`;
- widgets: `home-products`, `category-products`, `search-products`, `product-catalog`;
- entities: `product`, `category`;
- feature: `age-verification` для adult category.

Поведение:

- главная и category page получают initial products на сервере;
- search работает через клиентский widget;
- category metadata строится по category path;
- adult category не индексируется и требует отдельной обработки доступа;
- каталог должен показывать loading/error/empty/success states.

## Карточка товара

Входная точка:

- `/catalog/[id]/detail`

Основные слои:

- route: `app/(catalog)/catalog/[id]/detail/page.tsx`;
- widget: `product-details`;
- entities: `product`, `review`, `user`;
- features: `add-to-cart`, `toggle-favorite`.

Поведение:

- route валидирует numeric product id;
- initial product загружается на сервере;
- metadata строится из product data;
- при ошибке товар считается не найденным для metadata;
- UI деталки отвечает за состояние загрузки/ошибки/успеха.

## Auth

Входные точки:

- `/auth/login`
- `/auth/register`

Основные слои:

- routes: `app/auth/login`, `app/auth/register`;
- widget: `auth-form`;
- feature: `auth`;
- shared: `authStore`, `tokenStorage`, notification provider.

Поведение:

- login и register используют общий `AuthForm`;
- после auth используется безопасный redirect из query `redirect`;
- redirect не допускает внешние URL и `/auth`;
- register открывает verification dialog после успешной регистрации;
- login может открыть verification dialog, если backend вернул ожидаемую ошибку подтверждения email;
- password reset доступен на login flow.

## Protected routes

Входные точки:

- `/dashboard`
- `/dashboard/*`

Основные слои:

- `middleware.ts`;
- `app/(user)/dashboard/layout.tsx`;
- feature: `RequireAuth`;
- widget: `dashboard-home`.

Поведение:

- middleware редиректит анонима на `/auth/login?redirect=...`;
- dashboard layout дополнительно проверяет auth cookies на сервере;
- `RequireAuth` защищает клиентскую часть dashboard;
- проверка основана на наличии `access_token` или `refresh_token` cookie.

## Избранное

Входная точка:

- `/favorites`

Основные слои:

- route: `app/favorites/page.tsx`;
- client page: `FavoritesPageClient`;
- entities: `favorite`, `product`;
- feature: `toggle-favorite`;
- widget: `product-catalog`.

Поведение:

- страница публично открывается, но для анонима показывает unauthorized state;
- авторизованный пользователь видит список избранных товаров;
- пустой список показывает empty state;
- ошибки и retry обрабатываются через catalog widget.

## Корзина и checkout

Входная точка:

- `/checkout`

Основные слои:

- route: `app/checkout/page.tsx`;
- client page: `CheckoutPageClient`;
- widget: `checkout`;
- entities: `cart`, `order`, `address`, `transfer`, `user`;
- features: `order-create`, `add-to-cart`.

Поведение:

- страница публично открывается, но для анонима показывает unauthorized state;
- checkout загружает корзину и текущего пользователя;
- пустая корзина показывает empty state;
- ошибка корзины показывает error state с retry;
- успешное оформление показывает result dialog или success state;
- после полного успеха переход ведет в `/dashboard/purchase`.

## Личный кабинет

Входные точки:

- `/dashboard`
- `/dashboard/settings`
- `/dashboard/security`

Основные слои:

- widget: `dashboard-home`;
- widgets: `dashboard-settings`, `dashboard-security`;
- entities: `user`, `address`, `account`, `transfer`, `social-network`.

Поведение:

- `/dashboard` показывает домашний dashboard;
- settings управляет профильными настройками, адресами, способами доставки, платежными аккаунтами и соцсетями, если это доступно текущими widgets;
- security содержит изменение пароля;
- все dashboard pages требуют auth.

## Товары продавца

Входные точки:

- `/dashboard/products`
- `/dashboard/products/new`
- `/dashboard/products/[id]/edit`

Основные слои:

- widgets: `dashboard-products`, `user-products`, `create-product-form`;
- entity: `product`;
- features: `image-upload`;

Поведение:

- список товаров продавца показывает user products;
- создание товара использует `CreateProductForm`;
- редактирование использует тот же form в `mode="edit"` с `productId`;
- удаление и продление публикации идут через product mutations;
- форма не должна придумывать backend fields и должна использовать существующие product form helpers.

## Заказы

Входные точки:

- `/dashboard/purchase`
- `/dashboard/sales`

Основные слои:

- widget: `orders`;
- entity: `order`;
- features: `order-cancel`, `order-confirmation`, `order-payment`, `order-receipt`, `order-shipping`.

Поведение:

- purchase показывает заказы покупателя;
- sales показывает заказы продавца;
- действия с заказами вынесены в features;
- после mutations должны инвалидироваться списки заказов;
- UI должен различать loading, error, empty и success states.

## Минимальные сценарии для проверки

Для MVP критичны:

- публичный каталог открывается;
- карточка товара открывается или корректно показывает ошибку;
- login/register обрабатывают loading и ошибки;
- protected dashboard routes редиректят анонима;
- избранное и checkout показывают unauthorized state для анонима;
- авторизованный checkout не падает на пустой корзине;
- создание/редактирование товара не меняет backend contract;
- списки заказов покупателя и продавца показывают состояния загрузки/ошибки/пустого списка.
