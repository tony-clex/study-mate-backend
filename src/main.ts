import 'reflect-metadata';
import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { json } from 'express';
import { AppModule } from './app.module';

async function bootstrap() {
  try {
    const app = await NestFactory.create(AppModule);

    const port = Number(process.env.PORT || 3000);

    app.use(json({ limit: '50mb' }));

    app.enableCors({
      origin: '*',
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
      allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
      credentials: false,
    });

    await app.listen(port, '0.0.0.0');

    console.log(`✅ App running on port ${port}`);
  } catch (err) {
    console.error('🔥 BOOTSTRAP ERROR:', err);
  }
}

void bootstrap();
