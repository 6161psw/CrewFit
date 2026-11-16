FROM node:22-alpine AS builder
WORKDIR /app
RUN apk add --no-cache openssl
# 의존성 레이어 캐시: package*.json 이 안 바뀌면 install 재사용
COPY package.json package-lock.json* ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi
COPY prisma ./prisma
RUN npx prisma generate
COPY nest-cli.json tsconfig.json tsconfig.build.json ./
COPY src ./src
RUN npm run build && npm prune --omit=dev

FROM node:22-alpine
WORKDIR /app
ENV TZ=Asia/Seoul NODE_ENV=production
RUN apk add --no-cache openssl tzdata
COPY --chown=node:node --from=builder /app/package.json ./
COPY --chown=node:node --from=builder /app/node_modules ./node_modules
COPY --chown=node:node --from=builder /app/dist ./dist
COPY --chown=node:node --from=builder /app/prisma ./prisma
RUN mkdir -p /app/uploads && chown node:node /app/uploads
USER node
EXPOSE 3000
CMD ["npm", "run", "start:deploy"]
