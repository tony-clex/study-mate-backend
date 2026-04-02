

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
import { AppModule } from './app.module';

async function bootstrap() {
  // Create the NestJS application
  const app = await NestFactory.create(AppModule);

  // 1. ENABLE CORS: This allows your mobile app to talk to the server
  app.enableCors({
    origin: '*', // Allows all origins (essential for development)
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  // 2. VALIDATION: Ensures incoming data (like Chat JSON) is formatted correctly
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  // 3. NETWORK BINDING: '0.0.0.0' tells the server to listen to your local Wi-Fi, 
  // not just your laptop's internal loop.
  await app.listen(3000, '0.0.0.0');

  // Logs to help you verify the connection
  console.log(`\n--- STUDY-MATE BACKEND STARTED ---`);
  console.log(`🚀 Server is listening on all interfaces`);
  console.log(`📱 For Expo Go, use: http://192.168.1.172:3000`);
  console.log(`-----------------------------------\n`);
}
bootstrap().catch((err) => {
  console.error('CRITICAL: Failed to start application:', err);
});