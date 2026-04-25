# Production Dockerfile for Express Backend
FROM node:22-alpine

# Set working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy server source code
COPY . .

# PORT defaults to 80; SERVER_ENV must be supplied at runtime via --env-file
ENV PORT=80
EXPOSE 80

# Start the server (runs as root to bind to port 80)
CMD ["node", "index.js"]
