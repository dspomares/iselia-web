FROM nginx:alpine

COPY index.html /usr/share/nginx/html/index.html
COPY styles.css /usr/share/nginx/html/styles.css
COPY i18n.js    /usr/share/nginx/html/i18n.js
COPY main.js    /usr/share/nginx/html/main.js

EXPOSE 80
