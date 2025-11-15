import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { HttpExceptionFilter } from './common/interceptors/http-exception.filter';

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

  // global interceptor for successful responses
  app.useGlobalInterceptors(new ResponseInterceptor());

  // global exception filter for error responses
  app.useGlobalFilters(new HttpExceptionFilter());

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
