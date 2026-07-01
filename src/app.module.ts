import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { LoggingModule } from './common/logging/logging.module';
import { DatabaseModule } from './database/database.module';
import { ExternalApiModule } from './external-api/external-api.module';
import { CanonicalLogInterceptor } from './common/interceptors/canonical-log.interceptor';
import { AuthSimulationMiddleware } from './common/middleware/auth-simulation.middleware';

@Module({
  imports: [LoggingModule, DatabaseModule, ExternalApiModule],
  controllers: [AppController],
  providers: [
    AppService,
    // Bind CanonicalLogInterceptor globally to capture all HTTP requests
    {
      provide: APP_INTERCEPTOR,
      useClass: CanonicalLogInterceptor,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Apply the AuthSimulationMiddleware to all routes so it runs inside the Cls context
    consumer.apply(AuthSimulationMiddleware).forRoutes('*');
  }
}
