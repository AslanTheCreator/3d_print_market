# AGENTS.md

Production marketplace frontend on Next.js, TypeScript, Zustand, MUI, FSD.

Rules:

- Keep diffs minimal and task-focused.
- Do not refactor unrelated code.
- Reuse existing patterns.
- Prefer simple production-ready solutions.
- Do not add dependencies without strong reason.

Architecture:

- Follow FSD strictly.
- Upper layers depend on lower layers only.
- `shared` is only for generic UI/hooks/utils/config.
- Do not place business logic into `shared`.
- Do not break slice boundaries.
- Prefer public API imports.

Code:

- Use TypeScript strictly.
- Avoid `any`.
- Prefer named exports.
- Keep components small and focused.
- Keep Zustand stores domain-based and only for real global state.
- Keep local UI state local.

Behavior:

- Preserve existing API patterns.
- Do not invent backend fields.
- Do not break filters, sorting, pagination, or URL sync.
- Always handle loading, error, empty, and success states.

Do not:

- perform broad refactors
- touch unrelated files
- create giant abstractions
- leave debug/commented code
- replace existing architecture with personal preference

For every task:

- identify the correct layer/slice
- implement the smallest correct solution
- keep typing strict
- preserve architecture
- keep the final diff small
