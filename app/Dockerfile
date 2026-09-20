FROM node:24.15.0-alpine

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY app.ts instrumentation.ts ./

ENV NODE_ENV=production
EXPOSE 3000
CMD ["npm", "start"]

