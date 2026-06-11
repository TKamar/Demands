#!/bin/sh
set -e

echo "Running prisma generate..."
node_modules/.bin/prisma generate

echo "Running migrations..."
node_modules/.bin/prisma migrate deploy

if [ "$NODE_ENV" = "development" ]; then
  echo "Seeding database..."
  node_modules/.bin/prisma db seed
fi

echo "Starting server..."
npm run start
