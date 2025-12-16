## Multi-stage build for Expo Web App
# 1. Builder Stage: Build the Expo web application
FROM node:22-alpine AS builder

# Set the working directory inside the container
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci --legacy-peer-deps

# Copy application source code
COPY . .

# Build the Expo web app (outputs to dist directory)
RUN npm run build

# 2. Production Stage: Serve the built web application
FROM node:22-alpine

# Set the working directory
WORKDIR /app

# Install 'serve' utility globally for serving static files
RUN npm install -g serve

# Expose port 3000
EXPOSE 3000

# Copy the built assets from the builder stage
# Expo export outputs to 'dist' directory by default
COPY --from=builder /app/dist /app/dist

# Start the app using 'serve' in SPA mode
# The '-s' flag enables Single Page Application mode (serves index.html for all routes)
# The '-l' flag sets the port to 3000
CMD ["serve", "-s", "dist", "-l", "3000"]