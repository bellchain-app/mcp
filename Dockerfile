# Bellchain MCP server over stdio, built from this repository. Without a key it starts and lists its tools; every
# tool then says how to add one.
#
#   docker build -t bellchain-mcp .
#   docker run --rm -i -e BELLCHAIN_API_KEY bellchain-mcp
FROM node:24.22.1-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts --no-audit --no-fund
COPY tsconfig.json tsconfig.build.json ./
COPY src ./src
RUN npm run build && npm prune --omit=dev

FROM node:24.22.1-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY LICENSE README.md ./
USER node
ENTRYPOINT ["node", "dist/cli.js"]
