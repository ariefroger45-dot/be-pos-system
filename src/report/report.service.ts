import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { QueryFilter, Model } from 'mongoose';
import { Sale, SaleDocument } from 'src/sale/schemas/sale.schema';
import { SaleItem, SaleItemDocument } from 'src/sale/schemas/sale-item.schema';
import { ReportQueryDto } from './dto/report.dto';

interface GroupedSales {
  _id: string;
  total: number;
  count: number;
}

export interface BestSeller {
  productId: string;
  title?: string;
  sku?: string;
  quantity: number;
  revenue: number;
}

@Injectable()
export class ReportService {
  constructor(
    @InjectModel(Sale.name) private saleModel: Model<SaleDocument>,
    @InjectModel(SaleItem.name) private saleItemModel: Model<SaleItemDocument>,
  ) {}

  private saleMatch(query: ReportQueryDto): QueryFilter<SaleDocument> {
    const match: QueryFilter<SaleDocument> = { status: 'COMPLETED' };
    if (query.outletId) match.outletId = query.outletId;
    if (query.from || query.to) {
      match.createdAt = {};
      if (query.from) match.createdAt.$gte = query.from;
      if (query.to) match.createdAt.$lte = query.to;
    }
    return match;
  }

  private itemMatch(query: ReportQueryDto): QueryFilter<SaleItemDocument> {
    const match: QueryFilter<SaleItemDocument> = {};
    if (query.outletId) match.outletId = query.outletId;
    if (query.from || query.to) {
      match.createdAt = {};
      if (query.from) match.createdAt.$gte = query.from;
      if (query.to) match.createdAt.$lte = query.to;
    }
    return match;
  }

  private async groupBy(
    match: QueryFilter<SaleDocument>,
    format: string,
  ): Promise<GroupedSales[]> {
    const rows = await this.saleModel.aggregate<GroupedSales>([
      { $match: match },
      {
        $group: {
          _id: { $dateToString: { format, date: '$createdAt' } },
          total: { $sum: '$total' },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);
    return rows;
  }

  async daily(query: ReportQueryDto) {
    const rows = await this.groupBy(this.saleMatch(query), '%Y-%m-%d');
    return rows.map((r) => ({ date: r._id, total: r.total, count: r.count }));
  }

  async monthly(query: ReportQueryDto) {
    const rows = await this.groupBy(this.saleMatch(query), '%Y-%m');
    return rows.map((r) => ({ month: r._id, total: r.total, count: r.count }));
  }

  async revenue(query: ReportQueryDto) {
    const rows = await this.groupBy(this.saleMatch(query), '%Y-%m-%d');
    const totalRevenue = rows.reduce((sum, r) => sum + r.total, 0);
    return {
      totalRevenue,
      breakdown: rows.map((r) => ({
        date: r._id,
        total: r.total,
        count: r.count,
      })),
    };
  }

  bestSellers(query: ReportQueryDto): Promise<BestSeller[]> {
    return this.saleItemModel.aggregate<BestSeller>([
      { $match: this.itemMatch(query) },
      {
        $group: {
          _id: '$productId',
          quantity: { $sum: '$quantity' },
          revenue: { $sum: '$lineTotal' },
        },
      },
      { $sort: { quantity: -1 } },
      { $limit: query.limit ?? 10 },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'product',
        },
      },
      { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 0,
          productId: '$_id',
          title: '$product.title',
          sku: '$product.sku',
          quantity: 1,
          revenue: 1,
        },
      },
    ]);
  }
}
