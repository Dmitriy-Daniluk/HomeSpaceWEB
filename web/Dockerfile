FROM node:20-bookworm-slim
WORKDIR /app
COPY package*.json ./
RUN npm install --include=optional
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev"]
