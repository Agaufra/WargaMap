FROM node:20-alpine

WORKDIR /app

# Copy root package files
COPY package*.json ./
COPY server/package*.json ./server/

# Install dependencies
RUN npm install
RUN cd server && npm install

# Copy application files
COPY server/ ./server/

EXPOSE 3001

CMD ["npm", "start"]
