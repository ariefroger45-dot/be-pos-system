import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ProductModule } from './product/product.module';
import { MongooseModule } from '@nestjs/mongoose';
import { CacheModule } from '@nestjs/cache-manager';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AuditLogsModule } from './audit-logs/audit-log.module';
import { FilesModule } from './files/files.module';
import { OutletModule } from './outlet/outlet.module';
import { CategoryModule } from './category/category.module';
import { StockModule } from './stock/stock.module';
import { SaleModule } from './sale/sale.module';
import { ReportModule } from './report/report.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { AuditLogInterceptor } from './common/intersecptors/audit-log.interceptor';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const uri =
          process.env.MONGODB_URI ??
          process.env.MONGO_URL ??
          process.env.MONGODB_URL ??
          process.env.DATABASE_URL ??
          config.get<string>('MONGODB_URI') ??
          config.get<string>('MONGO_URL') ??
          config.get<string>('MONGODB_URL');

        if (!uri) {
          throw new Error(
            'Missing MongoDB connection string. Set MONGODB_URI (or MONGO_URL / MONGODB_URL / DATABASE_URL) in the environment. Check the [env] diagnostic line above.',
          );
        }

        return { uri };
      },
    }),
    CacheModule.register({
      isGlobal: true,
      ttl: 60 * 1000,
      max: 100,
    }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    ProductModule,
    UsersModule,
    AuthModule,
    AuditLogsModule,
    FilesModule,
    OutletModule,
    CategoryModule,
    StockModule,
    SaleModule,
    ReportModule,
    DashboardModule,
  ],
  controllers: [AppController],

  providers: [
    AppService,
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditLogInterceptor,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
