FROM node:20-alpine
WORKDIR /usr/src/app

ENV NODE_ENV=production

# Install build dependencies for compiling native modules (like bcrypt)
RUN apk add --no-cache --virtual .build-deps python3 make g++

# Copy package files and install production dependencies
COPY package*.json ./
RUN npm ci --omit=dev \
    && apk del .build-deps \
    && chown -R node:node /usr/src/app

# Copy application source code
COPY --chown=node:node . .

# Expose the port the auth service runs on
EXPOSE 3001

USER node

CMD ["node", "server.js"]