#!/bin/sh

echo "Starting application setup..."

# Подставляем API_URL в config.json при старте контейнера
if [ -n "$API_URL" ]; then
  echo "Setting API_URL to: $API_URL"
  sed "s|__API_URL__|$API_URL|g" /app/public/config.template.json > /app/public/config.json
  echo "Generated config.json:"
  cat /app/public/config.json
else
  echo "No API_URL provided, using template as-is"
  cp /app/public/config.template.json /app/public/config.json
fi

echo "Starting Next.js application..."
# Запуск Next.js
npm run start