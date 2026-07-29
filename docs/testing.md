# Testing

## Команды

- **`npm run lint`** — ESLint для `app` и `src`.
- **`npm run typecheck`** — `next typegen` и TypeScript.
- **`npm run architecture:check`** — FSD-проверка Steiger для `src`.
- **`npm run build`** — production build.
- **`npm run test:smoke`** — HTTP smoke для уже запущенного приложения.
- **`npm run test:e2e`** — Playwright; без `TEST_BASE_URL` запускает dev server.
- **`npm run test:e2e:mobile`** — только curated mobile Chromium scenarios.
- **`npm run test:standalone`** — smoke и e2e на standalone build.
- **`npm run test:e2e:ui`** — интерактивный Playwright UI.

Steiger применяет к `src` recommended FSD rules, кроме
`fsd/insignificant-slice`: эвристика неприменима, поскольку фактический app
layer находится в корневом `app/`. Этот каталог не входит в автоматическую
проверку, поэтому его импорты и route-композиция проверяются вручную.

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

`test:standalone` копирует `public` и `.next/static` в standalone runtime,
поднимает локальный SSR API fixture и сервер приложения, запускает smoke и
оба Playwright-проекта, затем останавливает оба процесса.

## Smoke и E2E

Smoke находятся в `tests/smoke`, e2e — в `tests/e2e`.

`test:smoke` ожидает запущенное приложение и по умолчанию использует `http://localhost:3000`. Другой стенд задаётся через `TEST_BASE_URL`:

```powershell
$env:TEST_BASE_URL="https://test.example.com"
npm run test:smoke
npm run test:e2e
```

Локальный Playwright server можно переопределить через
`PLAYWRIGHT_WEB_SERVER_COMMAND`, порт — через `PLAYWRIGHT_PORT`. Готовность
сервера проверяется по нейтральному runtime route `/api/config`.
Порт SSR fixture задаётся через `PLAYWRIGHT_FIXTURE_API_PORT`, по умолчанию это
порт приложения плюс один. Fixture реализует только подтверждённые контрактом
`GET /product/901` и `GET /images/metadata`; неизвестные запросы возвращают
JSON `404`. При запуске против произвольного `TEST_BASE_URL` зависящие от
fixture сценарии пропускаются, если `PLAYWRIGHT_FIXTURE_API_URL` не задан явно.

Тесты с реальным backend требуют подходящих env и тестовых данных. Секреты из `.env.local` не выводятся в логи.

## Границы текущего набора

Состояние на 2026-07-28:

- набор: `15` smoke и `90` Playwright tests — `82` desktop и `8` mobile;
- browser projects: Desktop Chrome и `mobile-chromium` на профиле Pixel 5
  (`393×727`, mobile UA, touch);
- `*.mobile.spec.ts` запускаются только в mobile project; desktop suite в нём
  не дублируется;
- mobile rendering покрывает SSR без JavaScript, hydration diagnostics,
  сохранение DOM/state на `599/600`, `899/900`, `1375/1376`, смену ориентации,
  horizontal overflow и overlay interactions;
- Lab CLS вычисляется через `PerformanceObserver` по session-window алгоритму;
  CI gate — `≤0.1`. LCP и transfer size сохраняются как диагностика, но пока
  не имеют hard budget;
- standalone-прогон 2026-07-28 дал CLS `0` для `/about` под Slow 4G /
  CPU ×4 и CLS `0` для fixture product detail. Диагностические значения этого
  запуска: LCP `784 ms` / transfer `447,368 B` для `/about` и LCP `224 ms` /
  transfer `626,659 B` для product detail; это локальные Lab-данные, не
  production field p75. Внешний тег Яндекс Метрики в E2E заменяется локальным
  пустым ответом и в transfer size не входит;
- browser-сценарии в основном подменяют API и auth cookies;
- session lifecycle покрывает initialization, login/logout, общий refresh для
  конкурентных `401`, один retry и redirect при refresh failure;
- часть `*.spec.ts` является model/contract tests без browser flow, но запускается через Playwright;
- browser API по умолчанию остаётся недоступным `127.0.0.1:9`, а SSR success
  product detail проверяется локальным fixture; real-backend сценарий не
  проверяется;
- coverage threshold, Firefox/WebKit и automated accessibility gate отсутствуют;
- CI публикует `playwright-report` и `test-results` с retention `7` дней.

Lab CLS не заменяет production field p75. Набор хорошо ловит frontend
regressions, но не является production acceptance.

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
