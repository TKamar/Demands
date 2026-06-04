#!/bin/bash
set -e

echo "POSTGRES_USER: $POSTGRES_USER"
echo "POSTGRES_MULTIPLE_DATABASES: $POSTGRES_MULTIPLE_DATABASES"

if [ -n "$POSTGRES_MULTIPLE_DATABASES" ]; then
    echo "Creating databases..."
    for db in $(echo $POSTGRES_MULTIPLE_DATABASES | tr ',' ' '); do
        echo "Creating database: $db"
        psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --no-password -c "CREATE DATABASE $db;" 2>&1 || echo "Database $db may already exist"
    done
else
    echo "POSTGRES_MULTIPLE_DATABASES not set"
fi

echo "Database initialization complete"

