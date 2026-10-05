import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { Sale, SaleSchema } from 'src/sale/schemas/sale.schema';
import {
  ProductStock,
  ProductStockSchema,
} from 'src/stock/schemas/product-stock.schema';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Sale.name, schema: SaleSchema },
      { name: ProductStock.name, schema: ProductStockSchema },
    ]),
    JwtModule.register({}),
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
