# Pipeline Orchestrator Dockerfile
# Build from project root: docker build -f pipeline-orchestrator/Dockerfile -t pipeline-orchestrator .
FROM node:20-slim

WORKDIR /app

# Copy database-tools first (shared dependency)
COPY database-tools ./database-tools

# Copy package files
COPY pipeline-orchestrator/package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy service source code
COPY pipeline-orchestrator ./

# Expose port
EXPOSE 3020

# Start the service
CMD ["node", "server.js"]
