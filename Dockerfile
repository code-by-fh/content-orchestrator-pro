FROM node:18-alpine

WORKDIR /app

# Copy root config if any (none critical)

# Setup Server
COPY server/package*.json ./server/
WORKDIR /app/server
RUN npm install
COPY server/ ./

# Setup Client
WORKDIR /app
COPY client/package*.json ./client/
WORKDIR /app/client
RUN npm install
COPY client/ ./
RUN npm run build

# Build Server
WORKDIR /app/server
RUN npm run build
# Generate Prisma Client
RUN npx prisma generate

# Expose Port
EXPOSE 3000

# Start command (run migration then start server)
# Note: In production, migration should be run carefully. For this setup, we'll try to run it.
CMD ["sh", "-c", "npx prisma migrate deploy && npm start"]
