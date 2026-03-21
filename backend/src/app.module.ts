import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { LoggerModule } from 'nestjs-pino';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from './infrastructure/prisma/prisma.module';
import { RedisModule } from './infrastructure/redis/redis.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { WorkspacesModule } from './workspaces/workspaces.module';
import { ServicesModule } from './services/services.module';
import { TeamModule } from './team/team.module';
import { MacrosModule } from './macros/macros.module';
import { CustomFieldsModule } from './custom-fields/custom-fields.module';
import { AuditModule } from './audit/audit.module';
import { TicketsModule } from './tickets/tickets.module';
import { MessagesModule } from './messages/messages.module';
import { CustomersModule } from './customers/customers.module';
import { GatewayModule } from './gateway/gateway.module';
import { MinioModule } from './infrastructure/minio/minio.module';
import { AttachmentsModule } from './attachments/attachments.module';
import { ReportsModule } from './reports/reports.module';
import { JobsModule } from './jobs/jobs.module';
import { CorrelationIdMiddleware } from './common/middleware/correlation-id.middleware';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { AuditLogInterceptor } from './common/interceptors/audit-log.interceptor';
import { HealthController } from './common/health/health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    LoggerModule.forRoot({
      pinoHttp: {
        transport: process.env.NODE_ENV !== 'production'
          ? { target: 'pino-pretty', options: { colorize: true } }
          : undefined,
        redact: [
          'req.headers.authorization',
          'req.headers.cookie',
          'req.body.initData',
          'req.body.refreshToken',
        ],
      },
    }),
    PrismaModule,
    RedisModule,
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const url = new URL(config.getOrThrow<string>('REDIS_URL'));
        return {
          connection: {
            host: url.hostname,
            port: parseInt(url.port || '6379', 10),
            password: url.password || undefined,
          },
        };
      },
    }),
    MinioModule,
    AttachmentsModule,
    ReportsModule,
    JobsModule,
    AuthModule,
    UsersModule,
    WorkspacesModule,
    ServicesModule,
    TeamModule,
    MacrosModule,
    CustomFieldsModule,
    AuditModule,
    TicketsModule,
    MessagesModule,
    CustomersModule,
    GatewayModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
    { provide: APP_INTERCEPTOR, useClass: AuditLogInterceptor },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(CorrelationIdMiddleware).forRoutes('*');
  }
}
