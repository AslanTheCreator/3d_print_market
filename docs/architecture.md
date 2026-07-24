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
  - Ответственность: HTTP clients, config, общие hooks, types и UI.
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

Проверка границ настроена в `steiger.config.mjs`; `app/api/**` исключён как зона route handlers.

## Размещение кода

- route, layout, metadata, error page — `app/`;
- provider, theme, analytics — `src/app/`;
- крупный блок страницы — `src/widgets/<slice>`;
- пользовательское действие — `src/features/<slice>`;
- доменная модель, API, query hooks — `src/entities/<slice>`;
- общая утилита или нейтральный UI — `src/shared`.

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

## Известные отклонения

Эти отклонения описывают текущее состояние, но не являются разрешением расширять паттерн:

- `home-products`, `category-products` и `search-products` импортируют `widgets/product-catalog`; формальная матрица не предусматривает widget-to-widget dependencies, а Steiger это правило сейчас не контролирует;
- часть доменных DTO находится в `src/shared/model`, а auth/image API — в `src/shared/api`, хотя целевая ответственность домена описана для `entities`;
- `features/auth` частично реэкспортирует реализацию из `shared`;
- автоматическая архитектурная проверка не заменяет review public API и фактического направления зависимостей.

Перед масштабным переносом этих модулей нужен отдельный refactor scope. Новые отклонения без архитектурного решения не добавляются.

## Проверки

После кодовых и архитектурных изменений:

```bash
npm run lint
npm run typecheck
npm run architecture:check
```

Дополнительные проверки описаны в [testing.md](./testing.md).
