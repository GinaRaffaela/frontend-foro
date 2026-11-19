# =====================================================================
# Etapa 1: Construcción de la aplicación Angular
# =====================================================================
FROM node:20-alpine AS build
WORKDIR /app

COPY package.json ./
RUN npm install

COPY . .
RUN npm run build -- --configuration=production

# =====================================================================
# Etapa 2: Servidor Nginx para producción en contenedor
# =====================================================================
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/frontend-foro/browser /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
