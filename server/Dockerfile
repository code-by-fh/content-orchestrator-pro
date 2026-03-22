FROM node:20-alpine AS builder

WORKDIR /app

RUN apk add --no-cache openssl python3 py3-pip

COPY package*.json ./
RUN npm ci

COPY prisma ./prisma/
RUN npx prisma generate

COPY . .
RUN npm run build

FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

RUN apk add --no-cache openssl python3 py3-pip && \
    pip install --no-cache-dir --break-system-packages youtube-transcript-api

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/prisma ./prisma

EXPOSE 3003

CMD ["sh", "-c", "npx prisma migrate deploy && npm start"]