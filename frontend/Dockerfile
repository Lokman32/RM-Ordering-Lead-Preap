# Use Node for building and serving
FROM node:20

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install --legacy-peer-deps

# Copy source and build app
COPY . .
RUN npm run build

# Install serve tools for preview (Vite's own or general serve)
RUN npm install -g vite

# Expose desired port
EXPOSE 3013

# Use Vite's preview server (production preview)
CMD ["npm", "run", "start", "--host"]
