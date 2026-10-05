import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { Sale, SaleSchema } from 'src/sale/schemas/sale.schema';
import { SaleItem, SaleItemSchema } from 'src/sale/schemas/sale-item.schema';
import { ReportController } from './report.controller';
import { ReportService } from './report.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Sale.name, schema: SaleSchema },
      { name: SaleItem.name, schema: SaleItemSchema },
    ]),
    JwtModule.register({}),
  ],
  controllers: [ReportController],
  providers: [ReportService],
})
export class ReportModule {}
