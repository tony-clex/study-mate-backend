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
import { setDefaultResultOrder } from 'node:dns';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  setDefaultResultOrder('ipv4first');
  const port = Number(process.env.PORT || 3000);
  const host = '0.0.0.0';

  // Increase body limit for large file uploads (images, PDFs from mobile)
  app.use(json({ limit: '50mb' }));

  // 1. ENABLE CORS
  // Authorization is sent via Bearer tokens, so credentials are not needed.
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    credentials: false,
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
  await app.listen(port, host);

  console.log(`\n--- STUDY-MATE BACKEND STARTED ---`);
  console.log(`🚀 Server is listening on all interfaces`);
  console.log(`🌐 Server URL: http://localhost:${port}`);
  console.log(`📱 For Expo Go, use your machine LAN IP on port ${port}`);
  console.log(`📁 File upload limit: 50MB`);
  console.log(`-----------------------------------\n`);
}
bootstrap().catch((err) => {
  console.error('CRITICAL: Failed to start application:', err);
});
