#!/bin/sh
set -e

echo "Running prisma generate..."
npx prisma generate

echo "Running migrations..."
npx prisma migrate deploy

if [ "$NODE_ENV" = "development" ]; then
  echo "Seeding database..."
  npx prisma db seed
fi

echo "Starting server..."
npm run start
