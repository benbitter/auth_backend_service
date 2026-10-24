FROM node:20-alpine

WORKDIR /usr/src/app

# Copy package descriptors first to leverage Docker layer caching
COPY package*.json ./

# Install only production dependencies
RUN npm install

# Copy application source code
COPY . .

# Expose your application port (change 5000 if your server uses 3000/8080)
EXPOSE 3002

# Start the application
CMD ["node", "server.js"]