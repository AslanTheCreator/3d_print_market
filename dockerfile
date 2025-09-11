# Stage 1: Build
FROM node:18-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install --frozen-lockfile
COPY . .

RUN npm run build

# Stage 2: Runner
FROM node:18-alpine AS runner
WORKDIR /app
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public

# Устанавливаем переменные окружения
ENV NODE_ENV=production
ENV PORT=3000

# Подстановка API URL в config.json при старте контейнера
ARG API_URL
RUN if [ -n "$API_URL" ]; then \
      sed "s|__API_URL__|$API_URL|g" public/config.template.json > public/config.json; \
    else \
      cp public/config.template.json public/config.json; \
    fi

EXPOSE 3000
CMD ["npm", "run", "start"]

