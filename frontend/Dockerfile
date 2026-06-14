FROM node:22-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm ci --no-audit --no-fund

COPY . .

RUN npm run build

# ---------------------------
FROM nginx:1.27-alpine

RUN apk add --no-cache gettext

ENV BACKEND_ORIGIN=http://backend:80
ENV PUBLIC_BACKEND_ORIGIN=
ENV STRIPE_CURRENCY=EUR
ENV VITE_STRIPE_CURRENCY=EUR
ENV VITE_CAPTCHA_SITE_KEY=

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf.template /etc/nginx/conf.d/default.conf.template
COPY env.js.template /etc/nginx/conf.d/env.js.template

EXPOSE 80

CMD ["/bin/sh", "-c", "envsubst '${BACKEND_ORIGIN} ${PUBLIC_BACKEND_ORIGIN} ${STRIPE_CURRENCY} ${VITE_STRIPE_CURRENCY} ${VITE_CAPTCHA_SITE_KEY}' < /etc/nginx/conf.d/env.js.template > /usr/share/nginx/html/env.js && envsubst '${BACKEND_ORIGIN}' < /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'"]