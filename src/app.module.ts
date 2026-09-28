import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ProductModule } from './product/product.module';
import { MongooseModule } from '@nestjs/mongoose';
import { CacheModule } from '@nestjs/cache-manager';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AuditLogsModule } from './audit-logs/audit-log.module';
import { AuditLogInterceptor } from './common/intersecptors/audit-log.interceptor';

@Module({
  imports: [
    MongooseModule.forRoot(
      'mongodb+srv://ariefroger45_db_user:liThAX3O3gIOuHFZ@cluster0.mvqc9to.mongodb.net/?appName=Cluster0',
    ),
    CacheModule.register({
      isGlobal: true,
      ttl: 60 * 1000,
      max: 100,
    }),
    ProductModule,
    UsersModule,
    AuthModule,
    AuditLogsModule,
  ],
  controllers: [AppController],

  providers: [
    AppService,
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditLogInterceptor,
    },
  ],
})
export class AppModule {}
