// import 'reflect-metadata';
// import 'dotenv/config';
// import { ValidationPipe } from '@nestjs/common';
// import { NestFactory } from '@nestjs/core';
// import { AppModule } from './app.module';

// async function bootstrap() {
//   const app = await NestFactory.create(AppModule);

//   // Simplified CORS for local development with Expo Go
//   app.enableCors({
//     origin: true, // This allows any origin to connect during development
//     methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
//     credentials: true,
//   });

//   // ONLY ONE Global Pipe
//   app.useGlobalPipes(
//     new ValidationPipe({
//       whitelist: true,
//       transform: true,
//       // Set this to false for now so image uploads don't fail
//       // if 'avatar' isn't explicitly in your DTO whitelist
//       forbidNonWhitelisted: false,
//     }),
//   );

//   // Listen on 0.0.0.0 to allow your phone (192.168.1.172) to connect
//   await app.listen(3000, '0.0.0.0');

//   console.log(`🚀 Server is live on: http://192.168.1.172:3000`);
// }

// bootstrap().catch((err) => {
//   console.error('Failed to start application:', err);
//   process.exit(1);
// });

import 'reflect-metadata';
import 'dotenv/config';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Allow connections from your phone
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  // Listen on 0.0.0.0 is CRITICAL for Expo Go
  await app.listen(3000, '0.0.0.0');

  console.log(`🚀 Server is listening on all interfaces`);
  console.log(`📱 For Expo Go, use: http://192.168.1.172:3000`);
}

bootstrap().catch((err) => {
  console.error('Failed to start application:', err);
});
