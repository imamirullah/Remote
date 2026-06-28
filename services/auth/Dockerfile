FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY packages/shared-types ./packages/shared-types
COPY packages/shared-utils ./packages/shared-utils
COPY services/auth ./services/auth
RUN npm install
RUN npm run build --workspace=packages/shared-types
RUN npm run build --workspace=packages/shared-utils
RUN npm run build --workspace=services/auth

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app /app
EXPOSE 5001
CMD ["npm", "start", "--workspace=services/auth"]
