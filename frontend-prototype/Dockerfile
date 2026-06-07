# Financex frontend — protótipo estático (browser-Babel).
# Sem build: o navegador baixa React/Babel/Chart.js via CDN e transpila os
# .jsx em runtime. O container só precisa servir os arquivos por HTTP
# (file:// quebra o fetch do Babel).
FROM nginx:alpine

# A config default do nginx:alpine já serve /usr/share/nginx/html com
# "index index.html;" — nenhum nginx.conf custom é necessário.
COPY . /usr/share/nginx/html

EXPOSE 80
