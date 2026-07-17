# Testing

## Команды

| Команда | Назначение |
| --- | --- |
| `npm run lint` | ESLint для `app` и `src` |
| `npm run typecheck` | `next typegen` и TypeScript |
| `npm run architecture:check` | FSD-проверка Steiger |
| `npm run build` | production build |
| `npm run test:smoke` | HTTP smoke для уже запущенного приложения |
| `npm run test:e2e` | Playwright; без `TEST_BASE_URL` запускает dev server |
| `npm run test:standalone` | smoke и e2e на standalone build |
| `npm run test:e2e:ui` | интерактивный Playwright UI |

## Выбор проверок

Для большинства code changes:

```bash
npm run lint
npm run typecheck
npm run architecture:check
```

Для routes, server/client boundaries, env и production behavior дополнительно:

```bash
npm run build
```

Для auth, checkout, форм, redirects и browser behavior запускать релевантные e2e. Production-like полный прогон:

```bash
npm run build
npm run test:standalone
```

`test:standalone` копирует `public` и `.next/static` в standalone runtime, поднимает сервер, запускает smoke и e2e, затем останавливает его.

## Smoke и E2E

Smoke находятся в `tests/smoke`, e2e — в `tests/e2e`.

`test:smoke` ожидает запущенное приложение и по умолчанию использует `http://localhost:3000`. Другой стенд задаётся через `TEST_BASE_URL`:

```powershell
$env:TEST_BASE_URL="https://test.example.com"
npm run test:smoke
npm run test:e2e
```

Локальный Playwright server можно переопределить через `PLAYWRIGHT_WEB_SERVER_COMMAND`, порт — через `PLAYWRIGHT_PORT`.

Тесты с реальным backend требуют подходящих env и тестовых данных. Секреты из `.env.local` не выводятся в логи.

## Documentation-only

Если менялись только Markdown-файлы, достаточно проверить diff, ссылки и соответствие коду. Полный test suite не требуется.
