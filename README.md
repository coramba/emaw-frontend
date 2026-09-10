# Frontend — Stock Movement Monitor

Vue 3 + TypeScript + Vite SPA. Mobile-first. Runs inside the shared `node`
container, same as the sibling projects.

## One-time: mount this dir into the `node` container

The `node` service in `/home/corwin/docker/docker-compose.yaml` has a fixed list
of volume mounts and this repo is not one of them. Add:

```yaml
  npm:
    volumes:
      - /var/www/emaw/frontend/:/home/node/emaw
```

then recreate the container:

```bash
cd /home/corwin/docker && docker compose up -d npm
```

## Run

```bash
docker exec -it node pnpm -C /home/node/emaw install
docker exec -it node pnpm -C /home/node/emaw run dev
# → http://localhost:5173  (NODE_PORT in .env; 5171/5172 are taken)
```

`vite.config.ts` proxies `/api` to the existing backend nginx vhost
`api-emaw.do.com`. The container can't resolve that name, so the target is the
docker-host gateway (`VITE_API_TARGET=http://172.30.49.1`) with the vhost name
sent as `VITE_API_HOST_HEADER`. The browser only talks to `localhost:5173`, so
the Symfony session cookie works with no CORS / SameSite handling. Nothing to
start on the backend side — nginx + php-8.2 FPM are part of the shared stack.

```bash
docker exec -it node pnpm -C /home/node/emaw run build   # vue-tsc + prod build
```
