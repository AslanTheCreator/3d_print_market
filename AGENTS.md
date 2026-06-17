# AGENTS.md

## Project overview

Figurzilla is a marketplace web application for anime figures.

The user can act both as a buyer and as a seller. The main audience is anime and figure collectors.

This repository contains the frontend part of the project. The backend exists and is developed by another developer. Do not make assumptions about backend fields, API behavior, database structure, or undocumented server logic.

The project is currently an MVP startup project, but the codebase should be written with future production use in mind.

## Main stack

- Next.js with App Router
- React
- TypeScript with strict mode
- Material UI
- Custom MUI theme
- TanStack Query
- Zustand
- React Hook Form
- Axios
- Playwright
- npm

## Project structure

Respect the existing structure before making changes.

Current high-level structure:

```txt
app/
  routes, pages, layouts, error pages, not-found pages

src/
  app/
    analytics/
    config/
    layouts/
    providers/

  entities/
  features/
  shared/
  widgets/
```

The project uses Feature-Sliced Design. Follow FSD rules strictly.

## Path aliases

The project uses path aliases. Prefer them over long relative imports when appropriate.

Known aliases:

```json
{
  "@/shared/hooks": ["./src/shared/lib/hooks"],
  "@/shared/types": ["./src/shared/model"],
  "@/*": ["./src/*"]
}
```

Before adding new aliases or changing existing aliases, ask for approval.

## Architecture rules

Use Feature-Sliced Design consistently.

General dependency direction:

```txt
app → widgets → features → entities → shared
```

Rules:

- `shared` must not depend on `entities`, `features`, `widgets`, or `app`.
- `entities` may depend on `shared`.
- `features` may depend on `entities` and `shared`.
- `widgets` may depend on `features`, `entities`, and `shared`.
- `app` composes all layers and contains providers, layouts, routing, and app-level configuration.
- Do not import from higher layers into lower layers.
- Do not create cross-feature dependencies unless the existing project already uses that pattern and it is clearly justified.
- Prefer public APIs of slices when they exist.
- Do not deep-import internal files from another slice if a public API exists.
- Run the architecture check after architecture-related changes.

Command:

```bash
npm run architecture:check
```

## Pages and routing

The project uses Next.js App Router.

Rules:

- Do not change routing structure unless the task explicitly requires it.
- Do not move pages, layouts, `error` pages, or `not-found` pages without approval.
- Keep route-level logic thin.
- Move reusable business logic into appropriate FSD layers.
- Keep providers and app-level configuration in the app layer.

## UI rules

Material UI is the main UI library.

Rules:

- Use the existing MUI theme.
- Do not add a new UI library.
- Do not add Tailwind, SCSS, CSS Modules, or another styling approach unless explicitly requested.
- Before creating a reusable component, check `shared/ui`.
- If a suitable component already exists in `shared/ui`, reuse it.
- If a component is reusable across multiple features/widgets, place it in `shared/ui`.
- If a component is specific to one feature, keep it inside that feature.
- Do not create large generic abstractions too early.
- Avoid styling that bypasses the theme without a strong reason.
- Prefer consistency with existing UI patterns over personal preferences.

## Building shared/ui

`shared/ui` is being built gradually.

When adding UI components:

- First inspect existing components and patterns.
- Keep components focused and composable.
- Avoid coupling shared UI components to business entities.
- Do not put API calls, feature logic, or app-specific behavior into `shared/ui`.
- Use clear props.
- Avoid unnecessary configuration props.
- Prefer simple composition over complex universal components.

## TypeScript rules

TypeScript strict mode is enabled.

Rules:

- Avoid `any`.
- If `any` seems necessary, first try to model the type properly.
- Use `unknown` instead of `any` when the value is truly unknown.
- Add explicit return types for exported functions, hooks, utilities, and public APIs.
- Explicit return types are not required for small local callbacks inside components.
- Prefer readable types over clever types.
- Do not duplicate domain types if they already exist in `entities`.
- Keep API/domain types in the existing project location, usually inside `entities`.
- Do not invent backend fields.
- If API data shape is unclear, inspect existing types, OpenAPI/Swagger references, or ask for clarification.

## Component size and decomposition

Do not split components just for the sake of splitting.

A component should usually be decomposed when it:

- has more than 200–250 lines;
- contains more than 3–5 noticeable UI sections;
- combines data fetching, form state, modals, and complex layout at the same time;
- is hard to describe with one short name;
- requires frequent scrolling to understand props and state.

If a component is around 140 lines, simple, linear, and easy to understand, keep it as is.

When splitting components:

- extract meaningful pieces, not random markup fragments;
- keep local logic close to where it is used;
- avoid creating unnecessary abstractions;
- preserve readability.

## State management

Use the existing state management approach.

Current tools:

- TanStack Query for server state.
- Zustand for client state.
- React Hook Form for forms.

Rules:

- Do not move server state into Zustand.
- Do not duplicate TanStack Query data in Zustand unless there is a clear reason.
- Use React Hook Form for non-trivial forms.
- Keep form validation and form state close to the feature unless existing project conventions say otherwise.
- Prefer existing hooks and stores before creating new ones.
- Avoid global state for local UI behavior.

## API rules

Axios is used for HTTP requests.

Rules:

- Reuse the existing API client/wrapper.
- Do not create a second HTTP client.
- Do not invent backend fields, endpoints, query params, or response shapes.
- If the backend contract is unclear, inspect existing API usage or OpenAPI/Swagger references.
- Keep API-related types in the existing project location, usually inside `entities`.
- Handle loading, error, and empty states for API-based UI.
- Use TanStack Query flags for async UI states.
- Do not silently swallow API errors.
- Keep API logic out of pure UI components.
- For local auth checks, read CODEX_TEST_LOGIN and CODEX_TEST_PASSWORD from .env.local. Do not print these values.

## Loading, error, and empty states

For screens and components that depend on server data, handle:

- loading state;
- error state;
- empty state;
- successful state.

Rules:

- Use TanStack Query flags where applicable.
- Do not leave the user with a blank screen.
- Keep states visually consistent with existing project patterns.
- Do not create new global state just to represent query loading/error state.

## Forms

Use React Hook Form for forms.

Rules:

- Keep form code readable.
- Extract complex form sections if the form becomes too large.
- Handle validation errors clearly.
- Do not invent backend validation rules.
- Preserve existing field names and API contracts.
- If a form submits to the backend, handle loading and error states.
- Avoid uncontrolled mixing of local state and form state.

## Testing

The project has tests and uses Playwright.

Available test commands:

```bash
npm run test:smoke
npm run test:e2e
npm run test:e2e:ui
```

Tests should be considered for:

- business logic;
- forms;
- API-related behavior;
- auth;
- hooks;
- key user scenarios.

If a task changes important behavior, suggest where tests are needed.

Do not add tests blindly if the task does not require them. If tests are missing for affected logic, mention what should be covered.

## Required commands

Use npm.

Available commands:

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

Before finishing a coding task, run the relevant checks whenever possible.

Minimum expected checks for most code changes:

```bash
npm run lint
npm run typecheck
npm run architecture:check
```

For larger or user-facing changes, also run:

```bash
npm run build
npm run test:smoke
```

For changes affecting flows, auth, forms, checkout, listing creation, or other user scenarios, consider:

```bash
npm run test:e2e
```

If a command cannot be run, explain why.

## Definition of done

A task is complete only when:

- lint passes;
- typecheck passes;
- relevant tests pass or needed tests are clearly suggested;
- build passes when the change can affect production build;
- architecture check passes;
- no unrelated files are changed;
- changed files are explained;
- the solution follows existing project architecture;
- no backend fields or contracts are invented.
- visual verification via Browser is not necessary

## Codex workflow

Before changing files, first inspect the relevant code.

For non-trivial tasks, follow this workflow:

1. Understand the task.
2. Inspect existing implementation and related files.
3. Explain the current structure briefly.
4. Propose a short implementation plan.
5. Wait for approval before making broad changes.
6. Implement the smallest reasonable change.
7. Run relevant checks.
8. Review the diff.
9. Explain changed files and important decisions.

For small fixes, direct implementation is allowed, but still avoid unrelated changes.

## Planning rule

For medium or large tasks, start with a plan.

A good plan should include:

- files likely to be changed;
- architecture layer affected;
- possible risks;
- whether tests should be added or updated;
- which commands should be run.

Do not make broad refactors before the plan is accepted.

## Self-review rule

After implementation, perform a self-review.

Check for:

- unrelated changes;
- broken FSD dependencies;
- unnecessary abstractions;
- new dependencies;
- TypeScript weaknesses;
- accidental `any`;
- duplicated logic;
- missing loading/error/empty states;
- invented backend fields;
- UI inconsistency with MUI theme;
- missing tests for important behavior.

Then summarize:

```txt
Changed files:
- path/to/file — why it changed

Checks:
- command — passed/failed/not run

Notes:
- risks, assumptions, or follow-up suggestions
```

## Git workflow

The user usually works alone in a branch and uses GitHub.

Rules:

- Keep changes focused.
- Do not modify unrelated files.
- Do not reformat unrelated files.
- Do not rewrite history.
- Do not create commits unless explicitly asked.
- Do not push unless explicitly asked.
- Make the diff easy to review.

Before large changes, recommend creating a separate branch or checkpoint.

## Dependencies

Do not add new dependencies without approval.

Before suggesting a dependency:

- check whether the project already has a suitable tool;
- consider whether the task can be solved simply;
- explain why the dependency is needed;
- mention trade-offs.

Avoid adding dependencies for small utilities, simple formatting, or minor UI behavior.

## Backend contract

The backend is owned by another developer.

Rules:

- Do not invent API fields.
- Do not invent endpoint behavior.
- Do not change frontend types to match assumptions.
- If the API contract is unclear, inspect existing code or OpenAPI/Swagger references.
- If still unclear, ask for clarification.
- Mock data should be clearly marked as mock data if used.
- Do not hide backend uncertainty with fake frontend logic.

## Comments and documentation

Use Russian for comments and project documentation when comments are necessary.

Rules:

- Avoid comments for obvious code.
- Add comments only for non-obvious business rules, complex logic, or important architectural decisions.
- Keep comments short and useful.
- Do not use comments to explain bad code. Improve the code instead.

## Naming

Follow existing project naming conventions.

Before creating new names, inspect similar files.

Prefer clear names like:

```txt
ProductCard
useProductQuery
productApi
cartStore
CreateListingForm
SellerProfileWidget
```

Rules:

- Components: PascalCase.
- Hooks: `useSomething`.
- Stores: descriptive store names.
- API modules: follow existing project conventions.
- Avoid vague names like `Helper`, `Manager`, `DataBlock`, `CommonComponent`.

## Things to avoid

Avoid:

- new dependencies without approval;
- unrelated file changes;
- giant abstractions;
- personal architecture preferences that replace existing architecture;
- invented backend fields;
- large rewrites without approval;
- moving files without a strong reason;
- mixing FSD layers incorrectly;
- putting business logic into shared UI;
- duplicating server state in Zustand;
- ignoring loading, error, and empty states;
- using `any` without a serious reason;
- changing public component APIs unless required;
- silently changing UX behavior outside the task.

## Good task behavior

When working on a task, prefer this style:

```txt
I inspected the relevant files.
The current flow is ...
I will change ...
I will not touch ...
Potential risk: ...
Checks to run: ...
```

After implementation:

```txt
Implemented ...
Changed files:
- ...
Checks:
- ...
Notes:
- ...
```

Keep explanations concise and practical.

## Priority order

When rules conflict, prioritize:

1. Correctness.
2. Existing project architecture.
3. Type safety.
4. Minimal focused diff.
5. User experience.
6. Reusability.
7. Code elegance.

Do not sacrifice correctness or architecture for clever code.

## Final instruction

Act like a careful frontend engineer working inside an existing startup MVP codebase.

The goal is not to produce impressive-looking code. The goal is to produce maintainable, reviewable, type-safe frontend code that fits Figurzilla’s existing architecture and can grow toward production.
