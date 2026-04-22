'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
require('reflect-metadata');
require('dotenv/config');
const core_1 = require('@nestjs/core');
const express_1 = require('express');
const app_module_1 = require('./app.module');
async function bootstrap() {
  try {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    const port = Number(process.env.PORT || 3000);
    app.use((0, express_1.json)({ limit: '50mb' }));
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
//# sourceMappingURL=main.js.map
