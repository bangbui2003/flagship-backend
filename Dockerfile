# --- syntax=docker/dockerfile:1

ARG NODE_VERSION=22
FROM node:${NODE_VERSION}-alpine AS base
WORKDIR /usr/src/app

# --- Stage 1: Install ALL dependencies (including dev) ---
FROM base AS deps

COPY prisma ./prisma/
COPY package.json package-lock.json ./
RUN --mount=type=cache,id=s/6fb2f68a-363b-4ed1-b8cf-fa49db118320-/root/.npm,target=/root/.npm \
    npm ci

RUN npx prisma generate

# --- Stage 2: Build the app (TypeScript to JS) ---
FROM deps AS build
COPY . .

# Generate prisma client
RUN npx prisma generate

# Build the TypeScript code to JavaScript (output in dist/)
RUN npm run build:ts

# --- Stage 3: Final Production Image ---
FROM base AS final
ENV NODE_ENV production

# Copy the prisma schema and generated client from the build stage
COPY --from=build /usr/src/app/prisma ./prisma

# Install only production dependencies
COPY package.json package-lock.json ./
RUN --mount=type=cache,id=s/6fb2f68a-363b-4ed1-b8cf-fa49db118320-/root/.npm,target=/root/.npm \
    npm ci --omit=dev

RUN npx prisma generate

# RUN mkdir -p dist/core dist/modules

# Copy only the necessary files from the build stage
COPY --from=build /usr/src/app/dist ./dist
COPY --from=build /usr/src/app/package.json ./package.json

# Security purpose: Run the app with low level user instead of root
RUN chown -R node:node /usr/src/app
USER node

EXPOSE 8080

# Running the app with Fastify CLI
CMD ["npx", "fastify", "start", "-a", "0.0.0.0", "-p", "8080", "-l", "info", "dist/src/app.js"]
