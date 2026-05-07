# 3D Print Market

Frontend production marketplace for 3D printing products.

Stack: Next.js 15, React 19, TypeScript, Feature-Sliced Design, MUI, React Query, Zustand.

## Requirements

- Node.js 24.15.0
- npm 11

Use the project Node version:

```bash
nvm use
```

## Environment

Create `.env.local` from `.env.example` and set API URLs:

```bash
NEXT_PUBLIC_API_URL=https://api.example.com
API_BASE_URL=http://backend:8081
ALLOW_LOCAL_API_URL=false
```

`NEXT_PUBLIC_API_URL` is used by the browser. `API_BASE_URL` is optional and is used by the Next.js server when it must call an internal backend address.

## Development

```bash
npm ci
npm run dev
```

Local app URL: http://localhost:3000

## Checks

```bash
npm run typecheck
npm run lint
npm run architecture:check
npm run build
```

`architecture:check` runs Steiger against the real project root, including `app` and `src`.

## Architecture

The project follows Feature-Sliced Design:

- `app` - Next.js routes, layouts, metadata and providers
- `src/widgets` - composed page blocks
- `src/features` - user scenarios and actions
- `src/entities` - domain models and API logic
- `src/shared` - generic UI, hooks, config and utilities

Upper layers depend on lower layers only. Prefer public API imports between slices.

## Docker

Build:

```bash
docker build -f dockerfile -t 3d-print-market-frontend .
```

Run:

```bash
docker run --rm -p 3000:3000 --env-file .env.local 3d-print-market-frontend
```

The runtime image uses Next.js standalone output and runs as the non-root `node` user.

## CI

GitHub Actions runs:

- dependency install with `npm ci`
- production dependency audit
- typecheck
- ESLint
- FSD architecture check
- Next.js build
