# Analysis Engine Dockerfile (includes Playwright for screenshots)
# Build from project root: docker build -f analysis-engine/Dockerfile -t analysis-engine .
FROM mcr.microsoft.com/playwright:v1.40.0-jammy

WORKDIR /app

# Install Node.js 20
RUN apt-get update && apt-get install -y curl
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
RUN apt-get install -y nodejs

# Copy database-tools first (shared dependency)
COPY database-tools ./database-tools

# Copy package files
COPY analysis-engine/package*.json ./

# Install dependencies
RUN npm ci --only=production

# Install Playwright Chromium
RUN npx playwright install chromium --with-deps

# Copy service source code
COPY analysis-engine ./

# Expose port
EXPOSE 3001

# Start the service
CMD ["node", "server.js"]
