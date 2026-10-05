import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { MailModule } from 'src/mail/mail.module';
import { Product, ProductSchema } from 'src/product/schemas/product.schema';
import { StockModule } from 'src/stock/stock.module';
import { SaleController } from './sale.controller';
import { SaleService } from './sale.service';
import { Sale, SaleSchema } from './schemas/sale.schema';
import { SaleItem, SaleItemSchema } from './schemas/sale-item.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Sale.name, schema: SaleSchema },
      { name: SaleItem.name, schema: SaleItemSchema },
      { name: Product.name, schema: ProductSchema },
    ]),
    StockModule,
    MailModule,
    JwtModule.register({}),
  ],
  controllers: [SaleController],
  providers: [SaleService],
  exports: [SaleService],
})
export class SaleModule {}
