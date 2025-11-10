FROM node:20-alpine

WORKDIR /app

# Install Docker CLI (needed to read cloudflared logs), bash, and coreutils (for timeout)
RUN apk add --no-cache docker-cli bash coreutils

# Install Expo CLI globally
RUN npm install -g expo-cli@latest

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy app files
COPY . .

# Copy entrypoint script
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Expose Expo port
EXPOSE 8081

# Use entrypoint script that extracts tunnel URL
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]

