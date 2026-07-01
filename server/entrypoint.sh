#!/bin/sh
set -e

echo "Running migrations..."
node_modules/.bin/prisma migrate deploy

if [ "$NODE_ENV" = "development" ]; then
  echo "Seeding database..."
  node node_modules/.bin/ts-node prisma/seed.ts
fi

echo "Starting server..."
npm run start
