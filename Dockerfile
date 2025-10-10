# ---- build ----
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
# Prefer ci when lockfile matches; fallback to install for local use
RUN npm ci || npm install
COPY . .
RUN npm run build

# ---- run (Nginx) ----
FROM nginx:1.27-alpine
# security headers + SPA fallback supplied by default.conf
COPY default.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx","-g","daemon off;"]

