import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import hpp from 'hpp';
import { rateLimit } from 'express-rate-limit';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  // Logger
  app.useLogger(app.get(Logger));

  // Security
  app.use(helmet());
  app.use(hpp());
  app.use(cookieParser());

  // Global rate limit
  app.use(
    rateLimit({
      windowMs: 60 * 1000,
      max: Number(process.env.RATE_LIMIT_GLOBAL_PER_MIN) || 100,
      standardHeaders: true,
      legacyHeaders: false,
      keyGenerator: (req) => req.ip || 'unknown',
      message: { status: 429, code: 'RATE_LIMIT_EXCEEDED', message: 'Too many requests' },
    }),
  );

  // Auth-specific stricter rate limit
  app.use(
    '/api/v1/auth',
    rateLimit({
      windowMs: 60 * 1000,
      max: Number(process.env.RATE_LIMIT_AUTH_PER_MIN) || 10,
      standardHeaders: true,
      legacyHeaders: false,
      keyGenerator: (req) => req.ip || 'unknown',
      message: { status: 429, code: 'RATE_LIMIT_EXCEEDED', message: 'Too many auth requests' },
    }),
  );

  // CORS
  app.enableCors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
  });

  // Global prefix (exclude health endpoints for Docker/K8s probes)
  app.setGlobalPrefix('api/v1', { exclude: ['health', 'health/ready'] });

  const port = process.env.PORT || 3000;
  await app.listen(port);
}
bootstrap();
