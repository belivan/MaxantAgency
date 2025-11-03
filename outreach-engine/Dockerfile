# Outreach Engine Dockerfile
# Build from project root: docker build -f outreach-engine/Dockerfile -t outreach-engine .
FROM node:20-slim

WORKDIR /app

# Copy database-tools first (shared dependency)
COPY database-tools ./database-tools

# Copy package files
COPY outreach-engine/package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy service source code
COPY outreach-engine ./

# Expose port
EXPOSE 3002

# Start the service
CMD ["node", "server.js"]
