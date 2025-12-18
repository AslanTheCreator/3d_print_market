FROM node:18-alpine AS builder

WORKDIR /app

# Копируем package files
COPY package.json package-lock.json ./
RUN npm ci --frozen-lockfile

# Копируем исходники и собираем
COPY . .
RUN npm run build

# Production stage
FROM node:18-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Копируем только необходимое для standalone
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Копируем package.json (если нужен для standalone)
COPY --from=builder /app/package.json ./

EXPOSE 3000

# Переменная окружения по умолчанию (DevOps переопределит)
ENV API_BASE_URL=http://localhost:8081

# Запускаем напрямую через node
CMD ["node", "server.js"]


