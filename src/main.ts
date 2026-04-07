// import 'reflect-metadata';
// import 'dotenv/config';
// import { ValidationPipe } from '@nestjs/common';
// import { NestFactory } from '@nestjs/core';
// import { AppModule } from './app.module';

// async function bootstrap() {
//   const app = await NestFactory.create(AppModule);

//   // Allow connections from your phone
//   app.enableCors({
//     origin: '*',
//     methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
//     credentials: true,
//   });

//   app.useGlobalPipes(
//     new ValidationPipe({
//       whitelist: true,
//       transform: true,
//       forbidNonWhitelisted: false,
//     }),
//   );

//   // Listen on 0.0.0.0 is CRITICAL for Expo Go
//   await app.listen(3000, '0.0.0.0');

//   console.log(`🚀 Server is listening on all interfaces`);
//   console.log(`📱 For Expo Go, use: http://192.168.1.172:3000`);
// }

// bootstrap().catch((err) => {
//   console.error('Failed to start application:', err);
// });

import 'reflect-metadata';
import 'dotenv/config';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { json } from 'express';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Increase body limit for large file uploads (images, PDFs from mobile)
  app.use(json({ limit: '50mb' }));

  // 1. ENABLE CORS
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  // 2. VALIDATION
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  // 3. NETWORK BINDING
  await app.listen(3000, '0.0.0.0');

  console.log(`\n--- STUDY-MATE BACKEND STARTED ---`);
  console.log(`🚀 Server is listening on all interfaces`);
  console.log(`📱 For Expo Go, use: http://192.168.1.172:3000`);
  console.log(`📁 File upload limit: 50MB`);
  console.log(`-----------------------------------\n`);
}
bootstrap().catch((err) => {
  console.error('CRITICAL: Failed to start application:', err);
});
