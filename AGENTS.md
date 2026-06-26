# AGENTS.md

Краткие правила для Codex и разработчиков frontend-проекта Figurzilla.

Подробности вынесены в:

- `docs/architecture.md`
- `docs/api-and-auth.md`
- `docs/testing.md`

## Проект

Figurzilla — frontend marketplace-приложения для коллекционных фигурок и связанных товаров. Пользователь может быть покупателем и продавцом.

Репозиторий содержит только frontend. Backend разрабатывается отдельно, поэтому нельзя придумывать поля, endpoint behavior, статусы, query params или структуру БД без подтверждения в коде, документации или контракте.

## Стек

- Next.js App Router
- React
- TypeScript strict mode
- Material UI и кастомная MUI-тема
- TanStack Query
- Zustand
- React Hook Form
- Axios
- Playwright
- npm

## Структура

```txt
app/       Next.js routes, layouts, errors, metadata, route handlers
src/app/   internal app layer: providers, layouts, config, analytics
src/widgets/
src/features/
src/entities/
src/shared/
tests/
docs/
```

Корневой `app/` — файловая маршрутизация Next.js.  
`src/app/` — FSD app layer для инфраструктуры приложения.

## FSD

Направление зависимостей:

```txt
app -> widgets -> features -> entities -> shared
```

Правила:

- `shared` не импортирует верхние слои.
- `entities` импортируют только `shared`.
- `features` импортируют `entities` и `shared`.
- `widgets` импортируют `features`, `entities`, `shared`.
- `app` собирает все слои.
- Не импортировать верхний слой в нижний.
- Между слайсами использовать public API через `index.ts`, если он есть.
- Не делать cross-feature зависимости без сильной причины и существующего паттерна.
- После архитектурных изменений запускать `npm run architecture:check`.

## Импорты

Алиасы из `tsconfig.json`:

```json
{
  "@/shared/hooks": ["./src/shared/lib/hooks"],
  "@/shared/types": ["./src/shared/model"],
  "@/*": ["./src/*"]
}
```

Правила:

- Для импортов из `src/` предпочитать `@/...`.
- Не добавлять и не менять aliases без отдельного решения.
- Внутри одного слайса допустимы короткие относительные импорты.
- Не deep-import internal files из чужого слайса, если есть public API.

## API и состояние

- Axios clients находятся в `src/shared/api`.
- Использовать существующие `publicClient` и `authClient`.
- Не создавать второй HTTP client.
- Защищенные запросы должны идти через `authClient`.
- API-типы и query hooks держать рядом с доменной сущностью, если они доменные.
- Server state хранить в TanStack Query.
- Zustand использовать только для клиентского состояния, не дублировать query data.
- Ошибки API не проглатывать.
- Для API-зависимого UI обрабатывать loading, error, empty и success states.

Подробнее: `docs/api-and-auth.md`.

## Формы

- Для нетривиальных форм использовать React Hook Form.
- Form state и validation держать рядом со сценарием.
- Не придумывать backend validation rules.
- Не менять имена полей и payload shape без подтвержденного контракта.
- Submit должен учитывать loading/error states.

## UI

- Использовать Material UI и существующую тему.
- Не добавлять новый UI-kit, Tailwind, SCSS или CSS Modules без явной задачи.
- Сначала проверять `src/shared/ui`.
- `shared/ui` не должен содержать бизнес-логику и API-вызовы.
- Entity-specific UI держать в `entities`.
- Scenario-specific UI держать в `features`.
- Композицию страниц и крупных блоков держать в `widgets`.

## Команды

Доступные команды:

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run typecheck
npm run architecture:check
npm run test:smoke
npm run test:e2e
npm run test:e2e:ui
```

Минимум для большинства code changes:

```bash
npm run lint
npm run typecheck
npm run architecture:check
```

Для user-facing изменений дополнительно рассмотреть:

```bash
npm run build
npm run test:smoke
npm run test:e2e
```

Подробнее: `docs/testing.md`.

## Нельзя

- Менять routing structure без явной задачи.
- Делать массовые рефакторы вне scope.
- Придумывать backend-контракты.
- Создавать новый HTTP client.
- Класть business logic в `shared/ui`.
- Дублировать server state в Zustand.
- Добавлять зависимости без согласования.
- Менять public API слайсов без необходимости.
- Оставлять API-зависимый UI без состояний загрузки/ошибки/пустого результата.
- Коммитить или пушить без прямой просьбы пользователя.

## Поддержка документации

Документация проекта должна оставаться актуальной. Перед завершением задачи проверь, влияет ли изменение на один из этих файлов:

- `AGENTS.md`
- `docs/architecture.md`
- `docs/testing.md`
- `docs/api-and-auth.md`

Обновляй документацию в том же изменении, если задача меняет:

- структуру проекта или границы FSD-слоев;
- public API слайсов;
- правила импортов или path aliases;
- маршрутизацию, layouts или route-level правила;
- API-клиенты, DTO mapping, query keys или правила работы с backend;
- авторизацию, хранение токенов, refresh flow или защищенные запросы;
- правила использования TanStack Query или Zustand;
- формы или правила валидации;
- UI-состояния: loading, error, empty, skeleton, success;
- тестовые команды, стратегию тестов, smoke/e2e-покрытие или CI-ожидания;
- package scripts, build commands, env-переменные или локальный setup.

Не обновляй документацию из-за локальных деталей реализации, которые не меняют архитектурные правила, публичное поведение, setup или workflow разработчика.

Если документация обновляется:

- пиши кратко и по делу;
- удаляй устаревшие утверждения, а не добавляй рядом противоречащие заметки;
- не дублируй одно и то же правило в нескольких файлах;
- не описывай будущие планы как текущую архитектуру;
- не придумывай backend-контракты, поля, статусы или поведение;
- лучше ссылайся на другой документ, чем повторяй длинное объяснение.

В финальном ответе по задаче обязательно укажи, обновлялась ли документация. Если обновление не потребовалось, кратко объясни почему.

## Definition of Done

Задача готова, когда:

- diff ограничен задачей;
- FSD-границы не нарушены;
- TypeScript strict не ослаблен;
- backend-контракты не придуманы;
- UI учитывает loading/error/empty/success states, если зависит от API;
- релевантные проверки запущены или явно объяснено, почему нет;
- измененные файлы и решения кратко описаны;
- документация обновлена, если изменение затронуло описанное поведение или правила проекта;
- нет несвязанных изменений.

Для documentation-only изменений обычно достаточно проверить diff и размеры файлов. Полный test suite не обязателен, если код и конфиги не менялись.
