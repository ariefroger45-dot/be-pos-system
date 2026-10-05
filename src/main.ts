import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { TransformInterceptor } from './common/intersecptors/transform.intersecptor';
import { GlovalExceptionFilter } from './common/filter/http-exception.filter';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

function logEnvDiagnostics() {
  const keys = ['MONGODB_URI', 'MONGO_URL', 'MONGODB_URL', 'DATABASE_URL'];
  const present = keys.filter((key) => Boolean(process.env[key]));
  const missing = keys.filter((key) => !process.env[key]);
  console.log(
    `[env] total=${Object.keys(process.env).length} port=${
      process.env.PORT ?? '-'
    } nodeEnv=${process.env.NODE_ENV ?? '-'} present=[${present.join(
      ',',
    )}] missing=[${missing.join(',')}]`,
  );
}

async function bootstrap() {
  logEnvDiagnostics();
  const app = await NestFactory.create(AppModule);

  const config = new DocumentBuilder()
    .setTitle('POS System API')
    .setDescription('Dokumentasi API POS System')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  app.useGlobalInterceptors(new TransformInterceptor());
  app.useGlobalFilters(new GlovalExceptionFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
