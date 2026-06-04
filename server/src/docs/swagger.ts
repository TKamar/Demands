import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
import path from 'path';
import { Express } from 'express';

export function setupSwagger(app: Express): void {
  const swaggerDocument = YAML.load(
    path.join(__dirname, 'openapi.yaml')
  );

app.use(
  '/api-docs',
  swaggerUi.serve as any,
  swaggerUi.setup(swaggerDocument, {
    customSiteTitle: 'Resource Demand Management API',
    customCss: '.swagger-ui .topbar { display: none }',
  }) as any);

  app.get('/api-docs.json', (_req, res) => {
    res.json(swaggerDocument);
  });
}
