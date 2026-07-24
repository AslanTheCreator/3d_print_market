# Документация

## Актуальные документы

- [architecture.md](./architecture.md) — структура и FSD-границы.
- [api-and-auth.md](./api-and-auth.md) — текущая HTTP- и auth-реализация.
- [core-flows.md](./core-flows.md) — основные пользовательские сценарии.
- [testing.md](./testing.md) — команды и выбор проверок.
- [deployment.md](./deployment.md) — env, standalone, Docker, выпуск версий и CI.
- [CHANGELOG.md](../CHANGELOG.md) — значимые изменения между production-релизами.

## Согласование с backend

- [backend-contract.md](./backend-contract.md) — открытые production-требования; это не подтверждённый контракт.
- [auth-security-requirements.md](./auth-security-requirements.md) — риски JS-readable tokens и требования к безопасной production-сессии.
- [backend-checkout-idempotency.md](./backend-checkout-idempotency.md) — предложение по идемпотентности заказов.

## Аудиты

- [production-readiness-audit-2026-06-17.md](./production-readiness-audit-2026-06-17.md) — актуальная на 2026-07-23 оценка MVP/public production и release gates.
- [performance-audit.md](./performance-audit.md) — исторический замер и актуальный список открытых пунктов.

Для текущего поведения источником истины остаются код, конфигурация и `package.json`.
