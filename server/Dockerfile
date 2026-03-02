FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache openssl python3 py3-pip
RUN pip install --break-system-packages youtube-transcript-api
COPY package*.json ./
RUN npm install

COPY . .

RUN npx prisma generate
RUN npm run build

EXPOSE 3003
CMD ["sh", "-c", "npx prisma migrate deploy && npm start"]
