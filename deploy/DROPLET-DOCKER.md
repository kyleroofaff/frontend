# Droplet + Docker (frontend image)

## What the `Dockerfile` does

1. **Build stage:** `npm ci` → `npm run build` → `dist/`
2. **Runtime:** Nginx serves `dist/` on port **80**

## What is often missing or wrong

### 1. Production `VITE_*` at **build** time (critical)

`ARG` defaults in the Dockerfile are **localhost** — fine for local compose, **wrong for production**.

The browser runs your JS and calls `VITE_API_BASE_URL`. If you built with localhost, the live site will try to reach the **visitor’s** machine, not your API.

**On the Droplet, build with:**

```bash
docker build \
  --build-arg VITE_API_BASE_URL=https://api.thailandpanties.com \
  --build-arg VITE_APP_BASE_URL=https://thailandpanties.com \
  -t tp-frontend:latest .
```

(Use your real API and site URLs.)

### 2. Explicit `CMD` (clarity)

The official `nginx` image already starts nginx, but an explicit `CMD ["nginx", "-g", "daemon off;"]` makes behavior obvious and matches most tutorials.

### 3. HTTPS on the Droplet

The container only exposes **HTTP :80**. Usually you put **Caddy**, **Traefik**, or **host nginx** in front with **TLS** (443) and proxy to `127.0.0.1:5173` (or whatever port you map). The Dockerfile alone does not obtain certificates.

### 4. Backend CORS

Backend **`CLIENT_ORIGIN`** must include your real frontend origin, e.g. `https://thailandpanties.com` (not only `http://localhost:5173`).

### 5. Firewall

**UFW:** allow 22 (SSH), 80, 443 as needed.

---

## Commands to view logs (run on the Droplet over SSH)

Replace `CONTAINER` with your container name or ID (`docker ps`).

```bash
# All containers (find name / ID)
docker ps -a

# Last 200 lines of container stdout/stderr (app + nginx)
docker logs CONTAINER --tail 200

# Follow logs live (Ctrl+C to stop)
docker logs -f CONTAINER

# If using docker compose (from the directory with compose file)
docker compose ps
docker compose logs frontend --tail 200
docker compose logs -f frontend
```

**Nginx inside the container** (config errors, 404s):

```bash
docker exec CONTAINER nginx -t
docker exec CONTAINER cat /var/log/nginx/access.log | tail -n 100
docker exec CONTAINER cat /var/log/nginx/error.log | tail -n 100
```

**Build failures** (no running container yet):

```bash
docker build --progress=plain --no-cache -t tp-frontend:test . 2>&1 | tee build.log
```

---

## Quick health checks

```bash
curl -sI http://127.0.0.1:PORT/   # PORT = host port mapped to container 80
curl -s http://127.0.0.1:PORT/ | head -n 20   # should contain index.html / app-build meta if synced
```

---

*If logs show `exit 1` or nginx “emerg” errors, paste **error.log** lines (redact secrets).*
