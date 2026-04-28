FROM node:20-alpine AS builder

WORKDIR /app

# Копируем package files
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# Копируем исходники и собираем
COPY . .
RUN npm run build

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Копируем только необходимое для standalone
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000

# Переменная окружения по умолчанию (DevOps переопределит)
ENV API_BASE_URL=
ENV NEXT_PUBLIC_API_URL=

# Запускаем напрямую через node
CMD ["node", "server.js"]


