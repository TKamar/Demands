# Demands

Resource Demand Management System — replaces an Excel-based process for requesting infrastructure resources (CPU, RAM, etc.) with a centralized application featuring an Excel-like UI with dense tables, bulk actions, and filters.

## Tech Stack

| Layer | Stack |
|-------|-------|
| Backend | Node.js, Express, TypeScript, Prisma |
| Database | PostgreSQL |
| Frontend | React, Vite, TypeScript |

## Project Structure

```
demands/
├── client/          # Frontend (React + Vite)
├── server/          # Backend (Express + Prisma)
└── docker-compose.yml
```

## Running with Docker Compose

### Development

Starts the server, PostgreSQL, and Keycloak. Seeds the database automatically.

```bash
NODE_ENV=development docker compose --profile dev up --build
```

| Service | URL |
|---------|-----|
| Server | http://localhost:3000 |
| PostgreSQL | localhost:5432 |
| Keycloak | http://localhost:8080 |

Keycloak admin credentials: `admin` / `admin`

#### Seeded Users (realm: demands)

| Group | Username | Password |
|-------|----------|----------|
| admin | admin1, admin2 | admin123 |
| moderator | mod1, mod2 | mod123 |
| user | user1, user2, user3 | user123 |

### Production

Starts only the server. Requires an external database — pass the connection string via `DATABASE_URL`.

```bash
DATABASE_URL=postgresql://user:password@host:5432/demands docker compose up --build
```

## Running Locally (without Docker)

```bash
# Install dependencies
npm install

# Run both client and server
npm run dev

# Run only the server
npm run dev:server

# Run only the client
npm run dev:client
```

### Environment Variables

#### server/.env

```
PORT=3000
DATABASE_URL=postgresql://user:password@localhost:5432/demands
```

#### client/.env

```
VITE_API_URL=http://localhost:3000
```

## Building

```bash
# Build both client and server
npm run build

# Build only the server
npm run build:server

# Build only the client
npm run build:client
```

## Domain Model

- **Organization**: Center → Branch → Section
- **Location**: Base + Environment + Network
- **Service**: Service → Resource (with unit of measurement)
- **Capacity**: Available resources at a specific location
- **Project**: Groups related demands
- **Demand**: Individual resource request with approval tracking
