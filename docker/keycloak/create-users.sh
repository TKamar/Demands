#!/bin/bash
set -e

# Get admin token
TOKEN=$(curl -s -X POST http://localhost:8080/realms/master/protocol/openid-connect/token \
  -d "grant_type=client_credentials" \
  -d "client_id=admin-cli" \
  -d "client_secret=" \
  -H "Content-Type: application/x-www-form-urlencoded" | jq -r '.access_token')

echo "Creating test users in Keycloak..."

# Create users
USERS=("admin1" "user1" "mod1")
PASSWORD="test123"

for USER in "${USERS[@]}"; do
  echo "Creating user: $USER"
  curl -s -X POST http://localhost:8080/admin/realms/demands/users \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
      \"username\": \"$USER\",
      \"email\": \"$USER@example.com\",
      \"firstName\": \"${USER^}\",
      \"lastName\": \"Test\",
      \"enabled\": true
    }" > /dev/null

  # Get user ID
  USER_ID=$(curl -s -X GET "http://localhost:8080/admin/realms/demands/users?username=$USER" \
    -H "Authorization: Bearer $TOKEN" | jq -r '.[0].id')

  # Set password
  curl -s -X PUT http://localhost:8080/admin/realms/demands/users/$USER_ID/reset-password \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
      \"type\": \"password\",
      \"value\": \"$PASSWORD\",
      \"temporary\": false
    }" > /dev/null

  echo "✓ Created $USER with password: $PASSWORD"
done

echo "Done!"
