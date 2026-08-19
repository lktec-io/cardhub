import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import { v1Router } from './routes/v1/index.js';
import { generalLimiter } from './middleware/rateLimiter.js';
import { requestLogger } from './middleware/requestLogger.js';
import { notFoundHandler } from './middleware/notFound.js';
import { errorHandler } from './middleware/errorHandler.js';

export const app = express();

app.disable('x-powered-by');
app.set('trust proxy', 1);

// This API serves dynamic JSON, never static assets — Express's default
// ETag generation + a client's conditional GET (If-None-Match) can
// legitimately produce a genuine 304 Not Modified here. axios's default
// validateStatus only resolves 2xx, so a 304 was silently reaching the
// frontend's `.catch()` and rendering as "Couldn't load cards" even
// though the server was perfectly healthy (confirmed against the
// production log evidence: repeated /templates 304s alongside healthy
// 200s for the same route). Disabling etag/caching here removes the
// conditional-GET mechanism at the source, so a 304 is never generated
// for this API in the first place — see also src/services/api.js on the
// frontend, which now also treats a 304 as non-fatal defensively.
app.set('etag', false);
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

app.use(helmet());
app.use(
  cors({
    origin: env.frontendUrl,
    credentials: true,
  })
);
app.use(compression());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());
app.use(requestLogger);
app.use(generalLimiter);

app.use('/api/v1', v1Router);

app.use(notFoundHandler);
app.use(errorHandler);
