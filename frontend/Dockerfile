# ── Planazo frontend — Vite + React (dev image) ────────────────────────────────
# Runs the Vite dev server with HMR inside the container. The docker-compose
# service bind-mounts the source over /app, so this build only needs to lock
# in a matching node runtime and prime node_modules for the first boot.

FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 5173

# --host 0.0.0.0 is required so the dev server is reachable from outside the
# container (from the host browser via the published port).
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
