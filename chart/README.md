# Demands Helm Chart

Deploys the full Demands stack on any Kubernetes cluster:
- **Client** — React/Vite frontend served by nginx
- **Server** — Node.js/Express API with Prisma ORM
- **PostgreSQL** — Database (StatefulSet with PVC)
- **Keycloak** — Identity provider with realm auto-import

## Prerequisites

- Kubernetes 1.24+
- Helm 3.x
- Docker images built and accessible (local or registry)

## Build Images

```bash
# From repo root
docker build -t demands-server:latest ./server
docker build -t demands-client:latest ./client \
  --build-arg VITE_API_URL=http://localhost:3000/api \
  --build-arg VITE_OIDC_AUTHORITY=http://localhost:8080/realms/demands \
  --build-arg VITE_OIDC_CLIENT_ID=demands-web \
  --build-arg VITE_OIDC_REDIRECT_URI=http://localhost:5173/callback
```

## Install

```bash
helm install demands ./chart/demands --namespace demands --create-namespace
```

## Create Keycloak Realm ConfigMap

The chart expects a ConfigMap with the Keycloak realm config:

```bash
kubectl create configmap demands-keycloak-realm \
  -n demands \
  --from-file=demands-realm.json=./docker/keycloak/demands-realm.json
```

## Port-forward (local development)

```bash
kubectl port-forward -n demands svc/demands-client 5173:5173 &
kubectl port-forward -n demands svc/demands-server 3000:3000 &
kubectl port-forward -n demands svc/demands-keycloak 8080:8080 &
```

Then access:
- Client: http://localhost:5173
- Server: http://localhost:3000
- Keycloak Admin: http://localhost:8080 (admin/admin)

## Seed Database

```bash
kubectl exec -n demands deploy/demands-server -- sh -c "NODE_ENV=development npx prisma db seed"
```

## Configuration

See `values.yaml` for all configurable parameters. Key settings:

| Parameter | Description | Default |
|-----------|-------------|---------|
| `server.authIssuerExternal` | External Keycloak URL (must match JWT issuer) | `http://localhost:8080/realms/demands` |
| `client.env.VITE_OIDC_AUTHORITY` | Keycloak authority URL for browser | `http://localhost:8080/realms/demands` |
| `postgres.storage.size` | PVC size for PostgreSQL | `5Gi` |
| `ingress.enabled` | Enable ingress | `true` |

## Test Users

| Username | Password | Role |
|----------|----------|------|
| admin1/admin2 | admin123 | admin |
| mod1-mod7 | mod123 | moderator |
| user1-user3 | user123 | user |
