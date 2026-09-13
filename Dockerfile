FROM node:24.19.0-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:24.19.0-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /app /app
EXPOSE 4173
CMD ["sh", "-c", "npm run cloud:start -- --port ${PORT:-4173}"]
