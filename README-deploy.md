# Deploying the simulator

The repo ships with a single root `docker-compose.yml` that brings up the
entire stack on one host. Per-project `Dockerfile`s also work standalone if
you want to run the apps on Kubernetes / Cloud Run / etc.

## Services in the compose stack

Host-side ports are deliberately shifted into a high range so they don't
collide with anything you might already run locally (e.g. a dev API on
4001, native Mongo on 27017). Internal service-to-service ports are
unchanged — only the host bindings move.

| Service              | Host port | Container port | Purpose                                                |
| -------------------- | --------- | -------------- | ------------------------------------------------------ |
| `mongo`              | `37017`   | 27017          | MongoDB — primary datastore for the apps               |
| `temporalpg`         | —         | —              | Postgres — persistence for Temporal                    |
| `temporal`           | `17233`   | 7233           | Temporal frontend (workflow gRPC)                      |
| `temporal-ui`        | `18080`   | 8080           | Temporal Web UI                                        |
| `api`                | `14001`   | 4001           | NestJS API (`delivery-api`)                            |
| `worker`             | —         | —              | Temporal worker (`delivery-worker`, headless)          |
| `portal`             | `13000`   | 3000           | Next.js portal (`delivery-portal`)                     |
| `mongo-express`      | `18081`   | 8081           | _ops profile_ — Mongo browser                          |

## First boot

```sh
cp .env.example .env       # edit if needed
docker compose up -d --build
```

Boot order is wired with `depends_on` + healthchecks:

1. `mongo` boots → ready to accept connections.
2. `temporalpg` boots → `temporal` auto-sets up its schema.
3. `api`, `worker`, and `portal` boot once Mongo is healthy and Temporal's
   container is started. Apps with `restart: unless-stopped` retry until
   Temporal answers gRPC, so transient timing isn't fatal.

To include Mongo Express:

```sh
docker compose --profile ops up -d
```

## Rebuilding when code changes

```sh
docker compose build api worker portal
docker compose up -d api worker portal
```

The Dockerfiles use BuildKit cache mounts on `/root/.npm`, so repeat
builds only re-install the packages that actually changed.

## Production overrides

- Replace `JWT_SECRET` in `.env`.
- Set `NEXT_PUBLIC_API_BASE_URL` to your public API URL **before** running
  `docker compose build portal` — it's baked into the browser bundle.
- Lock `mongo` behind auth — drop the public `27017` port mapping and
  switch the connection string to use credentials.

## Per-project images (without compose)

Each app builds independently:

```sh
docker build -t delivery-api      ./delivery-api
docker build -t delivery-worker   ./delivery-worker
docker build -t delivery-portal \
  --build-arg NEXT_PUBLIC_API_BASE_URL=https://api.example.com \
  --build-arg NEXT_PUBLIC_API_MODE=real \
  ./delivery-portal
```

Run any of them against external Mongo / Temporal by passing the same env
vars the compose stack uses.

## The legacy `delivery-worker/docker-compose.yml`

That file pre-dates the root compose and only brings up Temporal + UI for
solo worker dev. It's kept for the `start:dev` workflow. Because the root
stack publishes Temporal on host port `17233` (not `7233`), the two no
longer fight for the same port — but you'd then need to point a local
worker at `localhost:17233` to talk to the dockerised Temporal.
