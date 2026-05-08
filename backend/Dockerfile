FROM node:20-alpine
RUN apk add --no-cache openssl postgresql-client
WORKDIR /app
COPY package*.json ./
RUN npm install --include=dev
COPY . .
RUN npx prisma generate
RUN node node_modules/@nestjs/cli/bin/nest.js build
RUN chmod +x /app/scripts/entrypoint.sh
EXPOSE 3000
ENTRYPOINT ["/app/scripts/entrypoint.sh"]