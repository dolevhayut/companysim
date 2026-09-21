FROM node:24-bookworm-slim AS build
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.32.1 --activate
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages ./packages
COPY apps ./apps
COPY docs/skills/companysim ./docs/skills/companysim
COPY tsconfig*.json ./
RUN pnpm install --frozen-lockfile && pnpm build
RUN CI=true pnpm prune --prod

FROM node:24-bookworm-slim AS runtime
ENV NODE_ENV=production COMPANYSIM_DATA_DIR=/data
WORKDIR /app
COPY --from=build --chown=node:node /app/package.json ./
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/apps/web/dist ./apps/web/dist
RUN mkdir /data && chown node:node /data
USER node
EXPOSE 4545
VOLUME ["/data"]
HEALTHCHECK --interval=5s --timeout=3s --start-period=10s --retries=5 CMD node -e "fetch('http://127.0.0.1:4545/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
ENTRYPOINT ["node","dist/packages/cli/src/index.js"]
CMD ["serve","--host","0.0.0.0","--port","4545"]
