import { Module } from '@nestjs/common';
import { ClsModule } from 'nestjs-cls';
import { LoggerModule } from 'nestjs-pino';

@Module({
  imports: [
    // Configure CLS module globally to mount CLS middleware for all routes automatically
    ClsModule.forRoot({
      global: true,
      middleware: {
        mount: true,
      },
    }),

    // Configure Pino HTTP Logger
    LoggerModule.forRoot({
      pinoHttp: {
        // Disable automatic logging of every request/response by Pino HTTP itself
        // so that we only print our canonical log line.
        autoLogging: false,
        level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
        transport:
          process.env.NODE_ENV === 'production'
            ? undefined
            : {
                target: 'pino-pretty',
                options: {
                  colorize: true,
                  singleLine: false,
                  translateTime: 'SYS:standard',
                },
              },
      },
    }),
  ],
  exports: [ClsModule, LoggerModule],
})
export class LoggingModule {}
