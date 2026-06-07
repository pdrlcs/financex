# Financex frontend — build estático (Vite) servido por nginx.
# Estágio 1: instala deps e gera /dist. Estágio 2: nginx:alpine serve o
# estático e faz reverse proxy de /api -> backend (ver nginx.conf).

# ---- build ----
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .
RUN npm run build

# ---- runtime ----
FROM nginx:alpine AS runtime
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
