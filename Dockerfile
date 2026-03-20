FROM nginx:alpine

COPY nginx.conf /etc/nginx/nginx.conf
COPY index.html /usr/share/nginx/html/
COPY js/ /usr/share/nginx/html/js/

EXPOSE 8080
