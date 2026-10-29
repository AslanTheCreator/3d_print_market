# Документация

## Актуальные документы

- [architecture.md](./architecture.md) — структура и FSD-границы.
- [api-and-auth.md](./api-and-auth.md) — текущая HTTP- и auth-реализация.
- [core-flows.md](./core-flows.md) — основные пользовательские сценарии.
- [testing.md](./testing.md) — команды и выбор проверок.
- [deployment.md](./deployment.md) — env, standalone, Docker, выпуск версий и CI.
- [CHANGELOG.md](../CHANGELOG.md) — значимые изменения между production-релизами.

## Согласование с backend

- [backend-plan.md](./backend-plan.md) — единый план доработок, проверок и предложений backend по приоритетам P0–P2.
- [backend-integration-contracts.md](./backend-integration-contracts.md) — подтверждённые контракты интеграции обращений и розыгрышей.

## Предложения и исходные заметки

- [plans/auth-security-requirements.md](./plans/auth-security-requirements.md) — предложения по целевой безопасности auth; не описание реализованного контракта.
- [plans/ui-notes.md](./plans/ui-notes.md) — предложения по UI.
- [archive/README.md](./archive/README.md) — исходный план интеграции, старые задачи и размеры хедера с указанием статуса.

## Аудиты

- [production-readiness-audit-2026-06-17.md](./production-readiness-audit-2026-06-17.md) — актуальная на 2026-07-23 оценка MVP/public production и release gates.
- [frontend-audit/00-final-backlog.md](./frontend-audit/00-final-backlog.md) — итоговый backlog frontend-аудита; тематические отчёты находятся в той же папке.
- [audits/frontend-tests-audit.md](./audits/frontend-tests-audit.md) — аудит тестов frontend.
- [audits/frontend-tests-refactoring-plan.md](./audits/frontend-tests-refactoring-plan.md) — план упорядочивания тестов.

Для текущего поведения источником истины остаются код, конфигурация и `package.json`.
