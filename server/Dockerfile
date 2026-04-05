# Production Dockerfile for Express Backend
FROM node:22-alpine

# Set working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy server source code
COPY . .

# Expose the port (defaulting to 80 for Fargate health checks)
ENV PORT=80
ENV SERVER_ENV=production
EXPOSE 80

# Start the server (runs as root to bind to port 80)
CMD ["node", "index.js"]
