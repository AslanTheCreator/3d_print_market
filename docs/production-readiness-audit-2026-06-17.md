# Production readiness

Первичный аудит: 2026-06-17. Статус сверен с кодом: 2026-07-17.

## Вывод

Проект имеет рабочую MVP-базу, но пока не готов к публичному production. Открыты четыре блокера: секреты в репозитории, JS-readable auth tokens, отсутствие backend-идемпотентности заказов и production observability.

## Блокеры

| Пункт | Статус | Факт |
| --- | --- | --- |
| Секреты | открыт | `docker-compose.yml` содержит hardcoded credentials; реальные значения нужно удалить и ротировать |
| Auth | открыт | access и refresh tokens хранятся через `js-cookie` и отправляются как bearer/header |
| Checkout | открыт на backend | frontend исключает повтор успешных позиций, но timeout с неизвестным результатом может создать дубль |
| Observability | открыт | есть `console.error` и Метрика, но нет error tracking, release tags и алертов |
| Standalone tests | закрыт 2026-07-17 | `test:standalone` подготавливает assets и запускает smoke/e2e; CI использует этот сценарий |

## До публичного MVP

| Пункт | Статус |
| --- | --- |
| E2E | частично: есть anonymous access, adult gate, checkout models/retry, own-product и registration consent; auth и реальные order flows требуют test backend/data |
| CSP | частично: headers есть, но остаются `'unsafe-inline'`, широкие network sources и production HTTP image origin |
| Compose | только local; не использовать как production template |
| Performance | нет budget и актуального production/mobile замера |
| Type safety | остаются два явных `any`: account query keys и password reset dialog |
| Компоненты | крупные формы и widgets декомпозированы; отдельный массовый рефактор не требуется |

## Минимум перед production

1. Удалить и ротировать секреты, подключить secret storage.
2. Согласовать HttpOnly auth, CSRF и server-side session check.
3. Реализовать backend-идемпотентность checkout.
4. Подключить error tracking, uptime и алерты.
5. Прогнать standalone smoke/e2e на staging с реальным backend и тестовыми данными.
6. Ужесточить CSP после фиксации production origins.

Backend в рамках аудита не проверялся. Требования к его изменениям перечислены в [backend-contract.md](./backend-contract.md).
