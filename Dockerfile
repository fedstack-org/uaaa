FROM node:22 AS server-deps
RUN corepack enable
WORKDIR /app
COPY package.json yarn.lock .yarnrc.yml ./
COPY packages/core/package.json ./packages/core/
COPY packages/server/package.json ./packages/server/

FROM server-deps AS server-builder
RUN yarn workspaces focus @uaaa/server
COPY . .
RUN yarn workspaces foreach -Rp --topological-dev --from @uaaa/server run build

FROM node:22 AS server
RUN corepack enable
WORKDIR /app
COPY package.json yarn.lock .yarnrc.yml ./
COPY packages/core/package.json ./packages/core/
COPY packages/server/package.json ./packages/server/
RUN yarn workspaces focus @uaaa/server --production
COPY --from=server-builder /app/packages/core/lib ./packages/core/lib
COPY --from=server-builder /app/packages/server/lib ./packages/server/lib
USER node
VOLUME [ "/etc/uaaa" ]
ENV UAAA_SERVER_CONFIG_PATH=/etc/uaaa/config.json
ENTRYPOINT ["node", "packages/server/lib/cli/index.js"]
CMD ["serve"]

FROM server-deps AS proxy-deps
COPY packages/proxy/package.json ./packages/proxy/

FROM proxy-deps AS proxy-builder
RUN yarn workspaces focus @uaaa/proxy
COPY . .
RUN yarn workspaces foreach -Rp --topological-dev --from @uaaa/proxy run build

FROM node:22 AS proxy
RUN corepack enable
WORKDIR /app
COPY package.json yarn.lock .yarnrc.yml ./
COPY packages/core/package.json ./packages/core/
COPY packages/proxy/package.json ./packages/proxy/
RUN yarn workspaces focus @uaaa/proxy --production
COPY --from=proxy-builder /app/packages/core/lib ./packages/core/lib
COPY --from=proxy-builder /app/packages/proxy/lib ./packages/proxy/lib
USER node
VOLUME [ "/etc/uaaa-proxy" ]
ENV UAAA_SERVER_CONFIG_PATH=/etc/uaaa-proxy/config.json
ENTRYPOINT ["node", "packages/proxy/lib/cli/index.js"]
CMD ["serve"]

FROM server-deps AS ui-deps
COPY packages/ui/package.json ./packages/ui/

FROM ui-deps AS ui-builder
RUN yarn workspaces focus @uaaa/ui
COPY . .
RUN yarn workspaces foreach -Rp --topological-dev --from @uaaa/ui run build

FROM caddy:latest AS ui
COPY --from=ui-builder /app/packages/ui/.output/public /var/www/uaaa

FROM server AS server-full
COPY --from=ui-builder /app/packages/ui/.output/public /var/www/uaaa
