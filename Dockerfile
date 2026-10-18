FROM node:20-alpine
WORKDIR /usr/src/app

ENV NODE_ENV=production

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy the rest of your application code
COPY . .

# Expose the port your utils service runs on
EXPOSE 3001

USER node

CMD ["node", "server.js"]