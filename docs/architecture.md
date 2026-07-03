# Архитектура frontend-приложения

Документ описывает текущую архитектуру Figurzilla frontend. Он фиксирует только то, что подтверждается структурой репозитория, конфигами и кодом.

## Назначение

Frontend отвечает за пользовательский интерфейс marketplace-приложения:

- публичный каталог и карточки товаров;
- авторизацию и регистрацию;
- избранное, корзину и checkout;
- личный кабинет покупателя и продавца;
- управление товарами продавца;
- информационные и юридические страницы.

Backend находится вне этого репозитория. Frontend не должен сам вводить новые backend fields, endpoints, статусы или правила валидации.

## Стек

- Next.js App Router
- React
- TypeScript strict mode
- Material UI
- кастомная MUI-тема
- TanStack Query
- Zustand
- React Hook Form
- Axios
- Playwright
- Steiger
- npm

## Верхнеуровневая структура

```txt
app/
  Next.js routes, layouts, error pages, metadata, route handlers

src/
  app/
  widgets/
  features/
  entities/
  shared/

tests/
docs/
public/
```

Ключевое разделение:

- `app/` — route tree Next.js App Router;
- `src/app/` — internal app layer FSD.

Route-level файлы в `app/` должны быть тонкими. Они выбирают страницу/виджет, работают с params/search params и metadata, но не должны содержать сложную бизнес-логику.

`src/app/` содержит инфраструктуру приложения:

- providers;
- app layouts;
- theme/config;
- analytics integration.

## FSD-слои

Проект использует Feature-Sliced Design.

Направление зависимостей:

```txt
app -> widgets -> features -> entities -> shared
```

### `shared`

Общий слой без знания бизнес-домена.

Содержит:

- HTTP clients и общие API helpers;
- env/config helpers;
- общие hooks и utilities;
- общие типы;
- нейтральный UI;
- assets.

`shared` не должен импортировать `entities`, `features`, `widgets` или `app`.

### `entities`

Доменный слой.

Содержит:

- типы сущностей;
- API-модули сущностей;
- query keys;
- query/mutation hooks;
- небольшие entity-specific UI-компоненты;
- доменные helpers.

`entities` могут импортировать только `shared`.

### `features`

Пользовательские действия и сценарии.

Содержит:

- action hooks;
- scenario-specific UI;
- формы и диалоги конкретного сценария;
- orchestration над entity queries/mutations.

`features` могут импортировать `entities` и `shared`.

### `widgets`

Крупные блоки страниц.

Содержит:

- композицию UI;
- связывание нескольких features/entities;
- локальную orchestration логику экранного блока;
- loading/error/empty/success states на уровне блока.

`widgets` могут импортировать `features`, `entities` и `shared`.

Глобальный shell (`Header`, `Footer`, app layout) должен оставаться визуально и функционально единым для всех страниц. Тяжелые скрытые части shell, например drawer-меню, popover-ы и большие icon maps, нужно загружать как lazy client chunks, если они не нужны до пользовательского взаимодействия. Модельные файлы shell не должны импортировать UI icon components, когда достаточно легкого идентификатора для последующего маппинга внутри UI.

### `app`

App layer собирает приложение.

Содержит:

- routes в корневом `app/`;
- providers и layouts в `src/app/`;
- app-level config;
- route handlers.

`app` может импортировать нижние слои.

## Правила зависимостей

- Не импортировать верхний слой в нижний.
- Не создавать cross-feature зависимости без необходимости.
- Не импортировать внутренности чужого слайса при наличии public API.
- Не размещать business logic в `shared`.
- Не размещать route-specific logic в `entities` или `shared`.
- После изменений границ слоев запускать `npm run architecture:check`.

Архитектурная проверка настроена в `steiger.config.mjs`. Используется `@feature-sliced/steiger-plugin`; `app/api/**` исключен из проверки как зона route handlers.

## Public API слайсов

Слайсы обычно экспортируют внешний контракт через `index.ts`.

Правила:

- импортировать слайс через public API, если он есть;
- экспортировать только то, что реально нужно внешним слоям;
- не превращать `index.ts` в дамп всех внутренних файлов;
- изменение public API считать изменением контракта слайса;
- internal imports внутри слайса могут быть относительными.

В проекте встречается FSD cross-import notation `@x`, например для ограниченного доступа между entity-слайсами. Использовать этот прием точечно, когда общий public API был бы слишком широким.

## Алиасы импортов

Алиасы заданы в `tsconfig.json`:

```json
{
  "@/shared/hooks": ["./src/shared/lib/hooks"],
  "@/shared/types": ["./src/shared/model"],
  "@/*": ["./src/*"]
}
```

Правила:

- для импортов из `src/` использовать `@/...`;
- не добавлять новые aliases без отдельного решения;
- не использовать aliases для обхода FSD-границ;
- внутри одного слайса можно использовать короткие относительные импорты.

## Размещение новой функциональности

Выбор слоя:

- новая route page, layout, error page или metadata — `app/`;
- app-level provider, theme, global layout — `src/app/`;
- крупный блок страницы — `src/widgets/<slice>`;
- пользовательское действие — `src/features/<slice>`;
- доменная модель, API, query hooks — `src/entities/<slice>`;
- общая утилита, нейтральный UI, общий hook — `src/shared`.

Перед созданием нового слайса:

- найти похожий существующий пример;
- проверить public API нужных слайсов;
- определить подтвержденные API-типы и payloads;
- не добавлять универсальную абстракцию заранее;
- держать diff ограниченным задачей.

Типичная entity-структура:

```txt
entity/
  api/
  model/
  lib/
  ui/
  index.ts
```

Не все сегменты обязательны. Структура должна соответствовать реальной сложности.

Типичная feature-структура:

```txt
feature/
  model/
  ui/
  index.ts
```

Если feature не имеет UI, достаточно `model` и public API.

Типичная widget-структура:

```txt
widget/
  model/
  ui/
  index.ts
```

Widget не должен становиться глобальным сервисом. Сценарные действия выносить в `features`, доменные запросы — в `entities`.

## UI

Material UI — основной UI-инструмент. Тема находится в `src/app/config/theme.ts` и подключается через `AppProviders`.

Глобальный `MuiContainer` в теме использует `maxWidth="lg"` до `1504px` и горизонтальные отступы `32px` начиная с `sm`. Значения breakpoint'ов не используются как источник ширины контейнера: их нельзя менять только ради расширения контента, чтобы не сдвинуть responsive-переключения сеток и layouts.

Правила:

- использовать существующую MUI-тему;
- не добавлять новый UI-kit без отдельного решения;
- не добавлять Tailwind, SCSS или CSS Modules без явной задачи;
- перед новым общим компонентом проверить `src/shared/ui`;
- shared UI должен быть нейтральным и без бизнес-логики;
- entity-specific UI размещать в `entities`;
- scenario-specific UI размещать в `features`;
- композицию экранов размещать в `widgets`.

`shared/ui` подходит для:

- универсальных состояний;
- skeletons;
- нейтральных controls;
- общих layout primitives;
- UI без доменных типов.

`shared/ui` не подходит для:

- API-вызовов;
- работы с заказами, товарами, пользователями как доменными объектами;
- checkout/auth/order бизнес-логики.

## Состояния API-зависимого UI

Компоненты, зависящие от backend data, должны обрабатывать:

- loading;
- error;
- empty;
- success.

Рекомендуемое распределение:

- entity hook возвращает query/mutation state;
- feature или widget решает сценарное поведение;
- UI показывает существующий shared state или локальный вариант;
- route page не должна оставаться пустой при ошибке или пустом ответе.

## State management

TanStack Query используется для server state:

- backend data;
- loading/error states запросов;
- cache;
- invalidation.

Zustand используется для client state:

- auth state;
- локальное клиентское состояние корзины;
- UI-состояние, если оно реально нужно вне одного компонента.

Нельзя переносить query data в Zustand только ради удобства доступа.

## Формы

Для нетривиальных форм используется React Hook Form.

Правила:

- form model держать рядом со сценарием;
- доменные form helpers допустимы в `entities`;
- validation rules должны быть подтверждены существующим кодом или контрактом;
- submit должен обрабатывать loading/error states;
- payload shape не менять без backend-контракта.

## Что нельзя делать архитектурно

- Импортировать верхние слои в нижние.
- Создавать второй HTTP client.
- Дублировать server state в Zustand.
- Класть business logic в `shared/ui`.
- Придумывать backend fields, statuses или endpoints.
- Делать массовые переезды файлов без явной задачи.
- Расширять public API слайсов без необходимости.
- Менять routing structure без явного требования.
- Добавлять зависимости для мелких задач без согласования.
- Оставлять API UI без loading/error/empty/success states.

## Проверки

Минимум для архитектурных и кодовых изменений:

```bash
npm run lint
npm run typecheck
npm run architecture:check
```

Для user-facing изменений дополнительно рассматривать:

```bash
npm run build
npm run test:smoke
npm run test:e2e
```

Документационные изменения обычно не требуют полного test suite, если не меняют код, конфиги и package scripts.
