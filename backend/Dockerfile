FROM node:22-alpine

WORKDIR /app

# Install build dependencies for native modules like bcrypt
RUN apk add --no-cache python3 make g++

COPY package*.json ./

RUN npm install --omit=dev

COPY . .

EXPOSE 8000

CMD ["npm", "start"]

