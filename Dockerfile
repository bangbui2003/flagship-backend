ARG NODE_VERSION=22
FROM node:${NODE_VERSION}-alpine AS base
WORKDIR /usr/src/app

# --- Stage 1: Install ALL dependencies (including dev) ---
FROM base AS deps

COPY prisma ./prisma/
COPY package.json package-lock.json ./
RUN npm ci

RUN npx prisma generate

# --- Stage 2: Build the app (TypeScript to JS) ---
FROM deps AS build
COPY . .

RUN npx prisma generate
RUN npm run build:ts

# --- Stage 3: Final Production Image ---
FROM base AS final
ENV NODE_ENV production

COPY --from=build /usr/src/app/prisma ./prisma
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

RUN npx prisma generate

COPY --from=build /usr/src/app/dist ./dist
COPY --from=build /usr/src/app/package.json ./package.json

RUN chown -R node:node /usr/src/app
USER node

EXPOSE 8080

CMD ["node", "dist/src/server.js"]
