import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { csv, Env } from './config/env.validation';

import cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get<ConfigService<Env, true>>(ConfigService);

  app.set('trust proxy', 1); // 프록시 뒤 secure 쿠키
  app.use(cookieParser());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableShutdownHooks();

  const origins = [
    config.get('WEB_URL', { infer: true }),
    config.get('ADMIN_URL', { infer: true }),
    ...csv(config.get('CORS_ALLOWED_ORIGINS', { infer: true })),
  ].map((o) => new URL(o).origin);
  app.enableCors({ origin: origins, credentials: true });

  if (config.get('SWAGGER_ENABLED', { infer: true })) {
    const doc = new DocumentBuilder().setTitle('CrewFit API').setVersion('0.1').addBearerAuth().build();
    SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, doc), {
      swaggerOptions: { persistAuthorization: true },
    });
  }

  const port = config.get('PORT', { infer: true });
  await app.listen(port, '0.0.0.0');
  new Logger('Bootstrap').log(`CrewFit API :${port}`);
}
void bootstrap();
