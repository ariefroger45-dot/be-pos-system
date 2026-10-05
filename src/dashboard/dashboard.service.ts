import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { QueryFilter, Model } from 'mongoose';
import { Sale, SaleDocument } from 'src/sale/schemas/sale.schema';
import {
  ProductStock,
  ProductStockDocument,
} from 'src/stock/schemas/product-stock.schema';

const LOW_STOCK_THRESHOLD = 5;

interface SalesTotal {
  total: number;
  count: number;
}

@Injectable()
export class DashboardService {
  constructor(
    @InjectModel(Sale.name) private saleModel: Model<SaleDocument>,
    @InjectModel(ProductStock.name)
    private stockModel: Model<ProductStockDocument>,
  ) {}

  async summary(outletId?: string) {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const saleFilter: QueryFilter<SaleDocument> = {
      status: 'COMPLETED',
      createdAt: { $gte: startOfDay },
    };
    if (outletId) saleFilter.outletId = outletId;

    const stockFilter: QueryFilter<ProductStockDocument> = {
      quantity: { $lte: LOW_STOCK_THRESHOLD },
    };
    if (outletId) stockFilter.outletId = outletId;

    const [totals, lowStockCount, recentSales] = await Promise.all([
      this.saleModel.aggregate<SalesTotal>([
        { $match: saleFilter },
        {
          $group: { _id: null, total: { $sum: '$total' }, count: { $sum: 1 } },
        },
      ]),
      this.stockModel.countDocuments(stockFilter).exec(),
      this.saleModel.find(saleFilter).sort({ createdAt: -1 }).limit(5).exec(),
    ]);

    return {
      todaySalesTotal: totals[0]?.total ?? 0,
      todayTransactionCount: totals[0]?.count ?? 0,
      lowStockCount,
      recentSales,
    };
  }
}
