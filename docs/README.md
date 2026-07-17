# Документация

## Актуальные документы

- [architecture.md](./architecture.md) — структура и FSD-границы.
- [api-and-auth.md](./api-and-auth.md) — текущая HTTP- и auth-реализация.
- [core-flows.md](./core-flows.md) — основные пользовательские сценарии.
- [testing.md](./testing.md) — команды и выбор проверок.
- [deployment.md](./deployment.md) — env, standalone, Docker и CI.

## Согласование с backend

- [backend-contract.md](./backend-contract.md) — открытые production-требования; это не подтверждённый контракт.
- [backend-checkout-idempotency.md](./backend-checkout-idempotency.md) — предложение по идемпотентности заказов.

## Аудиты

- [production-readiness-audit-2026-06-17.md](./production-readiness-audit-2026-06-17.md) — статус production-блокеров.
- [performance-audit.md](./performance-audit.md) — исторический замер и актуальный список открытых пунктов.

Для текущего поведения источником истины остаются код, конфигурация и `package.json`.
