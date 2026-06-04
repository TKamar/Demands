import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import 'dotenv/config';
import routes from './routes';
import { setupSwagger } from './docs/swagger';
import { settings } from './lib/settings';

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(helmet({ contentSecurityPolicy: false }));
app.use(morgan('dev'));

// Root routes
app.get('/', (_req, res) => {
    res.json({ message: 'Resource Demand Management System API' });
});

app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Swagger docs
setupSwagger(app);

// API routes
app.use('/api', routes);

// Start Server
app.listen(settings.port, () => {
    console.log(`Server is running on port ${settings.port}`);
});
