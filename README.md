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

Build image:

```bash
docker build -f Dockerfile -t figurzilla-frontend:latest .
```

Run image directly:

```bash
docker run --rm -p 3000:3000 --env-file .env.local figurzilla-frontend:latest
```

Run with Docker Compose:

```bash
docker compose up -d
```

The runtime image uses Next.js standalone output and runs as the non-root `node` user.

Docker Compose reads runtime variables from the shell or `.env` file. For local backend usage:

```bash
FRONTEND_IMAGE=figurzilla-frontend:latest
FRONTEND_PORT=3000
CLIENT_API_BASE_URL=http://localhost:8081
API_BASE_URL=http://host.docker.internal:8081
ALLOW_LOCAL_API_URL=true
```

For a shared Docker network with backend service named `backend`, keep `CLIENT_API_BASE_URL` accessible from the browser and set `API_BASE_URL=http://backend:8081`.

## CI

GitHub Actions runs:

- dependency install with `npm ci`
- production dependency audit
- typecheck
- ESLint
- FSD architecture check
- Next.js build
