# SRE handover — Quick Commerce Delivery Simulator

This deploys an **internal testing simulator** for the delivery workflow.
It mimics the order/dispatch lifecycle but runs no production logic and
holds no customer data.

## Prerequisites on the deploy host

- Docker Engine 24+ (or Docker Desktop on dev hosts)
- Docker Compose plugin (built into modern Docker)
- ~2 GB RAM, ~3 GB disk for images + Mongo/Postgres data
- Outbound HTTPS access to `docker.io` (to pull images) and
  `nominatim.openstreetmap.org` (the portal does reverse-geocoding for
  drop-pin selection)

## What gets pulled

Two app images we publish:

| Image | Source |
| --- | --- |
| `samuelbills/delivery-api` | Public Docker Hub |
| `samuelbills/delivery-worker` | Public Docker Hub |
| `samuelbills/delivery-portal` | Public Docker Hub |

Plus standard public images compose pulls automatically:

```
mongo:7.0
postgres:16
temporalio/auto-setup:1.27.2
temporalio/ui:2.37.2
mongo-express:1.0.2     (only if --profile ops is used)
```

## Files needed on the deploy host

Copy these from the repo to the deploy directory:

```
docker-compose.deploy.yml
infra/temporal/development-sql.yaml
.env                     (created from .env.example, see below)
```

Minimum directory layout on the host:

```
delivery-sim/
├── docker-compose.deploy.yml
├── .env
└── infra/
    └── temporal/
        └── development-sql.yaml
```

## .env

Create a `.env` next to the compose file. Minimum:

```env
# A specific image version, e.g. the commit sha from the GitHub Actions
# build. Use `latest` while iterating; pin to a sha for stable rollouts.
IMAGE_TAG=latest

# Replace in any environment that holds non-throwaway data.
JWT_SECRET=replace-me-with-a-real-secret
```

## Bring up the stack

```sh
docker compose -f docker-compose.deploy.yml pull
docker compose -f docker-compose.deploy.yml up -d
```

That's it. Boot order is wired with healthchecks — apps wait until Mongo
is healthy and Temporal is up.

To include the optional Mongo Express browser:

```sh
docker compose -f docker-compose.deploy.yml --profile ops up -d
```

## Verify

```sh
docker compose -f docker-compose.deploy.yml ps
```

All five core services should be `running` (`healthy` where applicable).
Then hit the URLs:

| URL | What you should see |
| --- | --- |
| `http://<host>:13000` | The portal (Hubtel-branded UI) |
| `http://<host>:14001/api/v1/orders` | JSON list of orders (seed data) |
| `http://<host>:18080` | Temporal Web UI |

A quick functional test: open the portal, click an order, hit "Dispatch",
watch a `simulator-order-<id>` workflow appear in the Temporal UI.

## Updating to a new build

When a new image is published (e.g. by the GitHub Actions pipeline), pull
and restart:

```sh
# Optional: pin to a specific commit sha for predictable deploys
export IMAGE_TAG=<sha>

docker compose -f docker-compose.deploy.yml pull api worker portal
docker compose -f docker-compose.deploy.yml up -d api worker portal
```

The infra services (Mongo, Postgres, Temporal) don't need to restart for
app updates.

## Ports

| Service | Host port | Container port |
| --- | --- | --- |
| portal | 13000 | 3000 |
| api | 14001 | 4001 |
| temporal-ui | 18080 | 8080 |
| temporal (gRPC) | 17233 | 7233 |
| mongo | 37017 | 27017 |
| temporalpg | (internal only) | 5432 |
| mongo-express *(ops)* | 18081 | 8081 |

If any of these collide with other services on the host, edit the
`ports:` mappings in `docker-compose.deploy.yml`.

## Stop / wipe

```sh
# Stop, keep data
docker compose -f docker-compose.deploy.yml down

# Stop and nuke Mongo + Postgres data (full reset)
docker compose -f docker-compose.deploy.yml down -v
```

## Logs

```sh
docker compose -f docker-compose.deploy.yml logs -f api worker portal
```

## Common issues

- **"address already in use"** — something on the host is already on one
  of the ports above. Either stop the conflicting process or edit the
  `ports:` mapping in the compose file.
- **Apps restart-looping** — most often Temporal hasn't finished its
  schema migration yet (~30s on first boot). Wait, then check
  `docker compose logs temporal`.
- **Portal hits API but gets connection errors in browser** — the
  portal's API URL is **baked at image build time**. If your deploy host
  isn't reachable at `http://localhost:14001`, request a portal image
  rebuilt with `NEXT_PUBLIC_API_BASE_URL` pointing at your host's public
  URL.

## Contact

For image / config / deployment questions: **Samuel Biliksuun**
(biliksuunsamuel@gmail.com)
