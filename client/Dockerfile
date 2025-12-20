# Этап сборки
FROM oven/bun:latest AS builder

ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .
RUN bun run build

# Этап деплоя с nginx
FROM nginx:alpine

# Удаляем дефолтный конфиг nginx
RUN rm /etc/nginx/conf.d/default.conf

# Копируем собранные файлы фронта
COPY --from=builder /app/dist /usr/share/nginx/html

# Копируем конфигурацию nginx для статики
COPY nginx.conf /etc/nginx/conf.d/

EXPOSE 3400

CMD ["nginx", "-g", "daemon off;"]