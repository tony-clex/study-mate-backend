import 'reflect-metadata';
import 'dotenv/config';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS for Expo/React Native web and mobile
  app.enableCors({
    origin: [
      'http://localhost:8081',
      'http://localhost:8082',
      'http://localhost:3000',
      'http://127.0.0.1:8081',
      'http://127.0.0.1:8082',
      'http://127.0.0.1:3000',
      'http://192.168.1.172:8081',
      'http://192.168.1.172:3000',
      'exp://192.168.1.172:8081',
    ],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  // Use validation pipe but with better error formatting
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: false, // Allow all fields
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  await app.listen(3000, '0.0.0.0');

  const url = await app.getUrl();

  console.log(`Application is running on: ${url}`);
}

bootstrap().catch((err) => {
  console.error('Failed to start application:', err);
  process.exit(1);
});
