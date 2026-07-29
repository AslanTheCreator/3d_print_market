# Архитектура

Figurzilla — frontend marketplace на Next.js App Router. Backend находится в отдельном проекте, поэтому новые endpoint'ы, поля и статусы добавляются только по подтверждённому контракту.

## Структура

```txt
app/          Next.js routes, layouts, metadata, errors, route handlers
src/app/      providers, theme, app-level config и analytics
src/widgets/  крупные блоки страниц
src/features/ пользовательские сценарии и действия
src/entities/ доменные модели, API и entity UI
src/shared/   общая инфраструктура, utilities и нейтральный UI
tests/        smoke и e2e
docs/         документация
```

Корневой `app/` отвечает за маршрутизацию. Route-файлы должны оставаться тонкими: получать параметры, настраивать metadata и собирать нижние слои.

## FSD-границы

```txt
app -> widgets -> features -> entities -> shared
```

- **`shared`**
  - Ответственность: HTTP clients, config, общие hooks, нейтральные types и UI.
  - Зависимости: только внешние пакеты.
- **`entities`**
  - Ответственность: доменные API, query keys, модели и небольшой UI.
  - Зависимости: `shared`.
- **`features`**
  - Ответственность: действия, формы и сценарии.
  - Зависимости: `entities`, `shared`.
- **`widgets`**
  - Ответственность: композиция экранных блоков.
  - Зависимости: `features`, `entities`, `shared`.
- **`app`**
  - Ответственность: routes, providers и app config.
  - Зависимости: все нижние слои.

Правила:

- не импортировать верхний слой в нижний;
- между слайсами использовать `index.ts`, если public API существует;
- не делать cross-feature imports без существующего обоснованного паттерна;
- внутри слайса допустимы короткие относительные imports;
- `@x` использовать только для узкого межслайсового контракта entities.

Проверка границ настроена в `steiger.config.mjs`. `npm run architecture:check`
запускает Steiger для `src`; все recommended rules обязательны, кроме
`fsd/insignificant-slice`. Эта эвристика отключена, потому что фактический
app layer находится в корневом `app/`, вне `src`.

Корневой `app/` не входит в автоматическую область Steiger. Направление его
импортов, тонкость route-файлов и композиция нижних слоёв проверяются вручную
при review.

## Размещение кода

- route, layout, metadata, error page — `app/`;
- provider, theme, analytics — `src/app/`;
- крупный блок страницы — `src/widgets/<slice>`;
- пользовательское действие — `src/features/<slice>`;
- доменная модель, API, query hooks — `src/entities/<slice>`;
- общая утилита или нейтральный UI — `src/shared`.

Доменные DTO размещаются в `model` соответствующих entities. `entities/image`
владеет image DTO, API, query hooks и связыванием изображений с доменными
данными. `entities/session` владеет auth API, Zustand store, auth hooks,
инициализацией и refresh lifecycle. В `src/shared/model`, доступном через
`@/shared/types`, остаётся только нейтральный тип `Currency`.

Axios clients остаются в `shared`. Они не импортируют session store:
`AuthProvider` регистрирует `AuthSessionAdapter`, через который interceptor
запрашивает refresh и сообщает об истечении сессии.

Server state хранится в TanStack Query. Zustand используется для клиентского состояния.

Подтверждённое исключение — `cartQuantityStore`: он хранит optimistic projection количества, revisions, sync status и последнее подтверждённое значение, синхронизируясь с cart query. Источником истины об актуальной корзине и остатках остаётся backend/TanStack Query; Zustand не должен превращаться во второй независимый cache.

## Импорты

Алиасы из `tsconfig.json`:

```json
{
  "@/shared/hooks": ["./src/shared/lib/hooks"],
  "@/shared/types": ["./src/shared/model"],
  "@/*": ["./src/*"]
}
```

Для кода из `src/` предпочтителен `@/...`. Новые aliases не добавляются без отдельного решения.

## UI и формы

- использовать Material UI и тему из `src/app/config/theme.ts`;
- сначала проверять готовые компоненты в `src/shared/ui`;
- не размещать API-вызовы и бизнес-логику в `shared/ui`;
- для нетривиальных форм использовать React Hook Form;
- API-зависимый UI должен обрабатывать loading, error, empty и success;
- payload и validation rules не менять без подтверждённого backend-контракта.

## Responsive rendering

Тема задаёт единый набор breakpoints: `xs=0`, `sm=600`, `md=900`,
`lg=1376`, `xl=1536`. Для описания режимов используются границы compact
`<600`, medium `600–899` и wide `>=900`; двухколоночная карточка товара
включается с `lg=1376`.

SSR-visible UI строится CSS-first: сервер и первый клиентский render должны
иметь одно DOM-дерево, а размеры, порядок и видимость представительных
элементов задаются responsive `sx`, Grid/Flex и media queries в CSS.
`useMediaQuery`, UA detection и серверное угадывание viewport не используются
для выбора JSX-ветки, текста, количества детей или загружаемого asset.

`window.matchMedia` допустим только после mount для поведения без изменения
первоначального DOM, например для scroll listener, либо в момент открытия
разных overlay surfaces. Responsive изображения с разными файлами оформляются
через art direction (`picture`/`source`), чтобы браузер не загружал оба варианта.

## Статус прежних отклонений

Ранее зафиксированные отклонения устранены:

- home, category и search варианты объединены в `widgets/product-catalog`;
  widget-to-widget dependencies удалены;
- доменные DTO и image-реализация перенесены в соответствующие entities;
- auth API, store и hooks перенесены в `entities/session`; `features/auth`
  содержит сценарный UI без проксирующих реэкспортов из `shared`;
- Axios отделён от session store через adapter, регистрируемый в app layer.

Автоматическая проверка не заменяет review public API, `@x`-контрактов и
корневого `app/`. Новые отклонения без архитектурного решения не добавляются.

## Проверки

После кодовых и архитектурных изменений:

```bash
npm run lint
npm run typecheck
npm run architecture:check
```

Дополнительные проверки описаны в [testing.md](./testing.md).
