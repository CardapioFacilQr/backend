import { Logger, RequestMethod, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';
import type { AppConfig } from './config/configuration.js';

function parseCorsOrigin(value: string): boolean | string[] {
  if (value.trim() === '*') return true;
  return value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get<ConfigService<AppConfig, true>>(ConfigService);
  const logger = new Logger('Bootstrap');

  // Atrás de proxy reverso (Traefik/Nginx) para req.ip / req.protocol corretos.
  app.set('trust proxy', 1);

  app.setGlobalPrefix('api', {
    exclude: [{ path: 'm/:publicSlug', method: RequestMethod.GET }],
  });
  app.enableCors({
    origin: parseCorsOrigin(config.get('corsOrigin', { infer: true })),
  });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  // Permite encerrar conexões com o banco ao receber SIGTERM do Swarm.
  app.enableShutdownHooks();

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Cardápio QR API')
    .setDescription(
      'Cadastro de restaurantes, upload de cardápios e geração de QR Code',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('api/docs', app, () =>
    SwaggerModule.createDocument(app, swaggerConfig),
  );

  if (
    config.get('isProduction', { infer: true }) &&
    config.get('db', { infer: true }).synchronize
  ) {
    logger.warn(
      'DB_SYNCHRONIZE=true em produção: use apenas no primeiro deploy.',
    );
  }

  const port = config.get('port', { infer: true });
  await app.listen(port, '0.0.0.0');
  logger.log(`API ouvindo em http://0.0.0.0:${port} (docs em /api/docs)`);
}
await bootstrap();
