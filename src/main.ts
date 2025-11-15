import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'error', 'warn', 'debug'],
  });

  app.setGlobalPrefix(process.env.API_VERSION || 'api/v1');

  app.enableCors({
    origin: true,
    credentials: true,
  });

  const port = process.env.PORT || 3000;

  await app.listen(port);

  logger.log(`REA Backend is running on: http://localhost:${port}/`);
  logger.log(
    `Home: http://localhost:${port}/${process.env.API_VERSION || 'api/v1'}`,
  );
  logger.log(
    `Health: http://localhost:${port}/${process.env.API_VERSION || 'api/v1'}/health`,
  );
}
bootstrap().catch((error) => {
  console.error('Failed to start application', error);
  process.exit(1);
});
