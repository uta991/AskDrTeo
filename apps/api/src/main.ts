import 'reflect-metadata';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { join } from 'node:path';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get(ConfigService);
  const prefix = config.get<string>('apiPrefix', 'api/v1');

  // helmet-ის ნაგულისხმევი CORP ბლოკავს სურათებს სხვა წყაროდან —
  // ატვირთული ავატარები აპლიკაციაში არ ჩაიტვირთებოდა
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.enableCors({ origin: true, credentials: true });
  app.setGlobalPrefix(prefix);
  // ატვირთვები პრეფიქსის გარეშე ისმევა: /uploads/<file>
  app.useStaticAssets(join(process.cwd(), 'uploads'), { prefix: '/uploads/' });
  app.set('trust proxy', 1); // req.ip სწორად რომ იმუშაოს reverse proxy-ს უკან

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  if (config.get<string>('env') !== 'production') {
    const doc = SwaggerModule.createDocument(
      app,
      new DocumentBuilder()
        .setTitle('Baby Pediatry API')
        .setVersion('1.0')
        .addBearerAuth()
        .build(),
    );
    SwaggerModule.setup(`${prefix}/docs`, app, doc);
  }

  const port = config.get<number>('port', 3000);
  await app.listen(port);
  new Logger('Bootstrap').log(`API გაშვებულია: http://localhost:${port}/${prefix}`);
}

void bootstrap();
