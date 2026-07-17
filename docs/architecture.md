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

| Слой | Ответственность | Допустимые зависимости |
| --- | --- | --- |
| `shared` | HTTP clients, config, общие hooks, types, UI | только внешние пакеты |
| `entities` | доменные API, query keys, модели, небольшой UI | `shared` |
| `features` | действия, формы и сценарии | `entities`, `shared` |
| `widgets` | композиция экранных блоков | `features`, `entities`, `shared` |
| `app` | routes, providers и app config | все нижние слои |

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

Server state хранится в TanStack Query. Zustand используется только для клиентского состояния; query data в него не дублируется.

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

## Проверки

После кодовых и архитектурных изменений:

```bash
npm run lint
npm run typecheck
npm run architecture:check
```

Дополнительные проверки описаны в [testing.md](./testing.md).
