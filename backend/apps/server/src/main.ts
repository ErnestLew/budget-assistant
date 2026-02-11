/**
 * Consolidated server — boots the HTTP gateway + all microservices
 * in a single Node.js process. Used for production deployment where
 * running 5 separate processes is impractical (e.g., Render free tier).
 *
 * Requires Redis (Upstash free tier works) for inter-service messaging.
 */
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';

import { AppModule } from '../../gateway/src/app.module';
import { AuthModule } from '../../auth-service/src/auth.module';
import { CoreModule } from '../../core-service/src/core.module';
import { AiModule } from '../../ai-service/src/ai.module';
import { NotificationModule } from '../../notification-service/src/notification.module';
import { AllExceptionsFilter } from '../../gateway/src/filters/http-exception.filter';

async function bootstrap() {
  const redisOptions = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    ...(process.env.REDIS_PASSWORD && { password: process.env.REDIS_PASSWORD }),
    ...(process.env.REDIS_PASSWORD && { tls: {} }),
  };

  // 1. Start HTTP Gateway
  const gateway = await NestFactory.create(AppModule);

  gateway.enableCors({
    origin: (process.env.CORS_ORIGINS || 'http://localhost:3000').split(','),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  gateway.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
  gateway.useGlobalFilters(new AllExceptionsFilter());
  gateway.setGlobalPrefix('api/v1');

  const port = process.env.PORT || 8000;
  await gateway.listen(port, '0.0.0.0');
  console.log(`Gateway is running on port ${port}`);

  // 2. Start microservices (Redis transport)
  const microserviceConfig: MicroserviceOptions = {
    transport: Transport.REDIS,
    options: redisOptions,
  };

  const services = [
    { module: AuthModule, name: 'Auth Service' },
    { module: CoreModule, name: 'Core Service' },
    { module: AiModule, name: 'AI Service' },
    { module: NotificationModule, name: 'Notification Service' },
  ];

  for (const { module, name } of services) {
    const svc = await NestFactory.createMicroservice<MicroserviceOptions>(
      module,
      microserviceConfig,
    );
    await svc.listen();
    console.log(`${name} is running (Redis transport)`);
  }

  console.log('All services started successfully');
}

bootstrap();
