export const settings = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || "development",

  // DB
  databaseUrl: process.env.DATABASE_URL || "postgresql://user:password@localhost:5432/demands",
  postgresMulipleDatabases: process.env.POSTGRES_MULTIPLE_DATABASES || ['demands', 'keycloak'],

  // OIDC
  oidcDiscoveryUrl: process.env.OIDC_DISCOVERY_URL || '',
  authAudience: process.env.AUTH_AUDIENCE || 'demands-api',
  authIssuer: process.env.AUTH_ISSUER || '',
  authGroupClaimPath: process.env.AUTH_GROUP_CLAIM_PATH || 'groups',
  authAdminGroup: process.env.AUTH_ADMIN_GROUP || 'admin',
  authModeratorGroup: process.env.AUTH_MODERATOR_GROUP || 'moderator',

  // Auth Client
  authClientType: process.env.AUTH_CLIENT_TYPE || 'keycloak',

  // Keycloak
  keycloakUrl: process.env.KEYCLOAK_URL || '',
  keycloakRealm: process.env.KEYCLOAK_REALM || '',
  keycloakClientId: process.env.KEYCLOAK_CLIENT_ID || '',
  keycloakClientSecret: process.env.KEYCLOAK_CLIENT_SECRET || '',

  // Custom
  customAuthClientUrl: process.env.CUSTOM_AUTH_CLIENT_URL || '',
  customAuthClientApiKey: process.env.CUSTOM_AUTH_CLIENT_API_KEY || '',
};
