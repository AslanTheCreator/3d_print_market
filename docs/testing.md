# Testing

## Команды

- **`npm run lint`** — ESLint для `app` и `src`.
- **`npm run typecheck`** — `next typegen` и TypeScript.
- **`npm run architecture:check`** — FSD-проверка Steiger.
- **`npm run build`** — production build.
- **`npm run test:smoke`** — HTTP smoke для уже запущенного приложения.
- **`npm run test:e2e`** — Playwright; без `TEST_BASE_URL` запускает dev server.
- **`npm run test:standalone`** — smoke и e2e на standalone build.
- **`npm run test:e2e:ui`** — интерактивный Playwright UI.

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

## Границы текущего набора

Состояние на 2026-07-23:

- standalone-прогон: `15` smoke и `68` Playwright tests;
- browser project: только `Desktop Chrome`;
- browser-сценарии в основном подменяют API и auth cookies;
- часть `*.spec.ts` является model/contract tests без browser flow, но запускается через Playwright;
- CI задаёт недоступный API `127.0.0.1:9`, поэтому успешный real-backend сценарий не проверяется;
- coverage threshold, mobile project, Firefox/WebKit и automated accessibility gate отсутствуют;
- trace, screenshot и video настраиваются локально, но CI workflow не публикует `playwright-report` и `test-results` как artifacts.

Эти тесты хорошо ловят frontend regressions, но не являются production acceptance.

## Release acceptance на staging

Перед публичным MVP один release candidate должен пройти на staging с совместимым backend и изолированными тестовыми данными:

1. register, consent, verify, login, refresh, logout и password reset;
2. seller settings с success, empty и каждой ошибкой загрузки;
3. create/edit обычного, preorder и external товара без потери contract fields;
4. image upload и приватный доступ к payment proof;
5. cart, остатки, доставка по продавцам и полный checkout;
6. buyer/seller order lifecycle, payment, shipping, cancel, review и role-based details;
7. timeout/retry/idempotency и запрет покупки собственного товара на backend;
8. anonymous adult product на главной, search, seller, related, direct detail и sitemap;
9. auth redirect sanitizer, session teardown и отсутствие cross-account cache/draft;
10. HTTP status, canonical и `noindex` для invalid/private/adult routes.

Минимальная browser-матрица публичного релиза:

- desktop Chromium;
- mobile Chromium на поддерживаемом viewport;
- WebKit/Safari для критичных buyer/auth flows;
- automated accessibility scan плюс keyboard smoke;
- отдельный mobile/desktop performance замер.

Результат staging acceptance должен быть привязан к Git SHA и immutable image digest. Без этой связи локальный или CI-прогон не является доказательством готовности конкретного production artifact.

## Documentation-only

Если менялись только Markdown-файлы, достаточно проверить diff, ссылки и соответствие коду. Полный test suite не требуется.
