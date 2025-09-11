#!/bin/sh

# Подставляем API_URL в config.json при старте контейнера
if [ -n "$API_URL" ]; then
  sed "s|__API_URL__|$API_URL|g" /app/public/config.template.json > /app/public/config.json
else
  cp /app/public/config.template.json /app/public/config.json
fi

# Запуск Next.js
npm run start