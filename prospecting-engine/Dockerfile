# Prospecting Engine Dockerfile
# Build from project root: docker build -f prospecting-engine/Dockerfile -t prospecting-engine .
FROM node:20-slim

WORKDIR /app

# Copy database-tools first (shared dependency)
COPY database-tools ./database-tools

# Copy package files
COPY prospecting-engine/package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy service source code
COPY prospecting-engine ./

# Expose port
EXPOSE 3010

# Start the service
CMD ["node", "server.js"]
