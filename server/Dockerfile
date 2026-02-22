FROM node:18-alpine

WORKDIR /app

# Install dependencies
RUN apk add --no-cache openssl
COPY package*.json ./
RUN npm install

# Copy application code
COPY . .

# Build TypeScript code
RUN npm run build
# Generate Prisma Client
RUN npx prisma generate

EXPOSE 3003

# Command starts migrate and the built app
CMD ["sh", "-c", "npx prisma migrate deploy && npm start"]
