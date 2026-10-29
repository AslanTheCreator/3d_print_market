# 3D Print Market

Frontend marketplace for collectible figures and 3D printing products.

Stack: Next.js 15, React 19, TypeScript, Feature-Sliced Design, MUI, React Query, Zustand.

Current public launch status: **NO-GO**. See the [MVP and production readiness audit](./docs/production-readiness-audit-2026-06-17.md).

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
CLIENT_API_BASE_URL=https://api.example.com
NEXT_PUBLIC_API_URL=https://api.example.com
API_BASE_URL=http://backend:8081
ALLOW_LOCAL_API_URL=false
```

`CLIENT_API_BASE_URL` is returned by `/api/config` at runtime and is used by the browser. `NEXT_PUBLIC_API_URL` is a build-time fallback. `API_BASE_URL` is optional and is used by the Next.js server when it must call an internal backend address.

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
npm run test:smoke
npm run test:e2e
npm run build
npm run test:standalone
```

`architecture:check` runs Steiger against the FSD layers in `src`. The
`fsd/insignificant-slice` rule is disabled because the Next.js root `app`
directory lives outside `src`; imports and composition in that root layer
require manual review.
`test:smoke` expects a running app and reads `TEST_BASE_URL`, defaulting to `http://localhost:3000`.
`test:e2e` starts Playwright's local web server automatically unless `TEST_BASE_URL` is set.

## Architecture

The project follows Feature-Sliced Design:

- `app` - Next.js routes, layouts, metadata and providers
- `src/widgets` - composed page blocks
- `src/features` - user scenarios and actions
- `src/entities` - domain models, DTOs and API logic, including image and session
- `src/shared` - generic UI, hooks, config, HTTP infrastructure and utilities

Upper layers depend on lower layers only. Prefer public API imports between slices.
The `@/shared/types` alias contains only the neutral `Currency` type.

## Docker

Build image:

```bash
docker build -f Dockerfile -t figurzilla-frontend:latest .
```

Run image directly:

```bash
docker run --rm -p 3000:3000 --env-file .env.local figurzilla-frontend:latest
```

Run the local backend infrastructure from the frontend directory:

```bash
docker compose -f ../docker-compose.yml up -d
```

The main Compose file lives in the parent `3D_print_market` directory, outside this frontend repository. It starts PostgreSQL, MinIO and backend; run the frontend separately with `npm run dev` or the Docker commands above. The frontend runtime image uses Next.js standalone output and runs as the non-root `node` user.

For a frontend container connected to the local API, set runtime values:

```bash
CLIENT_API_BASE_URL=http://localhost:8081
API_BASE_URL=http://host.docker.internal:8081
ALLOW_LOCAL_API_URL=true
```

These values assume Docker Desktop. The parent Compose file uses `init-scripts/`, `data/`, `keys/` and `.env` relative to its own directory. It is local-only and must not be used as a production template. A standalone frontend clone does not include this infrastructure.

The backend image tag does not validate compatibility with the current frontend release. Choose compatible image tags or digests for a release-candidate check.

The former tracked Compose file has a known plaintext credential incident. Removing the file from this repository does not rotate the exposed secret or remove it from Git history.

The frontend keeps `docker-compose.integration.yml` as a test overlay for the external backend stack; see [testing.md](./docs/testing.md).

## CI

GitHub Actions runs:

- dependency install with `npm ci`
- production dependency audit
- typecheck
- ESLint
- FSD architecture check
- Next.js build
- production smoke tests
- Playwright e2e tests
- Docker image build
