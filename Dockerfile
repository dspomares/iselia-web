FROM nginx:alpine

COPY index.html       /usr/share/nginx/html/index.html
COPY privacidad.html  /usr/share/nginx/html/privacidad.html
COPY aviso-legal.html /usr/share/nginx/html/aviso-legal.html
COPY cookies.html     /usr/share/nginx/html/cookies.html
COPY styles.css       /usr/share/nginx/html/styles.css
COPY i18n.js          /usr/share/nginx/html/i18n.js
COPY main.js          /usr/share/nginx/html/main.js
COPY assets/          /usr/share/nginx/html/assets/

EXPOSE 80
