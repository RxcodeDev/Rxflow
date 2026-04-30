FROM node:20-alpine
RUN apk add --no-cache openssl
WORKDIR /app
COPY package*.json ./
RUN npm install --include=dev
COPY . .
RUN node node_modules/@nestjs/cli/bin/nest.js build
EXPOSE 3000
CMD ["node", "dist/main"]