import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger as PinoLogger } from 'nestjs-pino';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  // Enable bufferLogs to buffer logs during the bootstrap process
  // until the custom Pino logger is retrieved and registered
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  // Use Pino Logger as the system logger for NestJS
  app.useLogger(app.get(PinoLogger));

  const port = process.env.PORT ?? 3001;
  await app.listen(port);

  Logger.log(
    `Application is running on: http://localhost:${port}`,
    'Bootstrap',
  );
}
bootstrap();
