import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { HttpExceptionFilter } from './common/interceptors/http-exception.filter';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { apiReference } from '@scalar/nestjs-api-reference';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'error', 'warn', 'debug'],
  });
  const apiVersion = process.env.API_VERSION || 'api/v1';

  app.setGlobalPrefix(apiVersion);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Swagger configuration
  const config = new DocumentBuilder()
    .setTitle('REA API Docs')
    .setDescription('API documentation for REA Interactive Bible Backend')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config, {
    operationIdFactory: (controllerKey, methodKey) => methodKey,
  });
  SwaggerModule.setup(`/${apiVersion}/docs`, app, document);

  app.use(
    `/${apiVersion}/reference`,
    apiReference({
      content: document,
    }),
  );

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
