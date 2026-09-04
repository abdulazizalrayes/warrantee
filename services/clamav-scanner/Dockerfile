FROM node:22.19.0-alpine3.22
WORKDIR /service
COPY server.mjs ./
USER node
EXPOSE 8080
CMD ["node", "server.mjs"]
