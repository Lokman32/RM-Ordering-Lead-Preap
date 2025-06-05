# Stage 1: Build
FROM node:20 AS builder

WORKDIR /app

# Avoid broken optional deps by deleting lockfile
COPY package*.json ./
RUN rm -f package-lock.json && npm install --legacy-peer-deps

# Copy source code
COPY . .
# Build your app (React Router build)
RUN npm run build

# Stage 2: Serve built app
FROM node:20

WORKDIR /app

# Only install serve (lightweight)
RUN npm install -g serve

# Copy built files from builder
COPY --from=builder /app/build ./build

# Expose the port
EXPOSE 3013

# Start the app using the `serve` tool directly
CMD ["serve", "-s", "build/client", "-l", "3013"]
