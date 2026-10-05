import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { QueryFilter, Model, Types } from 'mongoose';
import { CreateStockMovementDto, StockQueryDto } from './dto/stock.dto';
import {
  ProductStock,
  ProductStockDocument,
} from './schemas/product-stock.schema';
import {
  StockMovement,
  StockMovementDocument,
  StockMovementType,
} from './schemas/stock-movement.schema';

@Injectable()
export class StockService {
  constructor(
    @InjectModel(ProductStock.name)
    private stockModel: Model<ProductStockDocument>,
    @InjectModel(StockMovement.name)
    private movementModel: Model<StockMovementDocument>,
  ) {}

  // Decrement only if enough stock exists. Returns new quantity or null.
  async decrease(
    productId: string | Types.ObjectId,
    outletId: string | Types.ObjectId,
    quantity: number,
  ): Promise<number | null> {
    const doc = await this.stockModel
      .findOneAndUpdate(
        { productId, outletId, quantity: { $gte: quantity } },
        { $inc: { quantity: -quantity } },
        { new: true },
      )
      .exec();
    return doc ? doc.quantity : null;
  }

  // Increment, creating the stock row if it does not exist.
  async increase(
    productId: string | Types.ObjectId,
    outletId: string | Types.ObjectId,
    quantity: number,
  ): Promise<number> {
    const doc = await this.stockModel
      .findOneAndUpdate(
        { productId, outletId },
        { $inc: { quantity } },
        { new: true, upsert: true, setDefaultsOnInsert: true },
      )
      .exec();
    return doc.quantity;
  }

  async createMovement(payload: {
    productId: string | Types.ObjectId;
    outletId: string | Types.ObjectId;
    type: StockMovementType;
    quantity: number;
    balanceAfter?: number;
    reason?: string;
    saleId?: string | Types.ObjectId;
    userId?: string | Types.ObjectId;
  }): Promise<StockMovementDocument> {
    return this.movementModel.create(payload);
  }

  async adjust(
    type: 'STOCK_IN' | 'STOCK_OUT',
    dto: CreateStockMovementDto,
    userId?: string,
  ): Promise<StockMovementDocument> {
    let balanceAfter: number | null;
    if (type === 'STOCK_IN') {
      balanceAfter = await this.increase(
        dto.productId,
        dto.outletId,
        dto.quantity,
      );
    } else {
      balanceAfter = await this.decrease(
        dto.productId,
        dto.outletId,
        dto.quantity,
      );
      if (balanceAfter === null) {
        throw new BadRequestException('Insufficient stock');
      }
    }

    return this.createMovement({
      productId: dto.productId,
      outletId: dto.outletId,
      type,
      quantity: dto.quantity,
      balanceAfter,
      reason: dto.reason,
      userId,
    });
  }

  async history(query: StockQueryDto) {
    const filter: QueryFilter<StockMovementDocument> = {};
    if (query.productId) filter.productId = query.productId;
    if (query.outletId) filter.outletId = query.outletId;
    if (query.type) filter.type = query.type as StockMovementType;
    if (query.from || query.to) {
      filter.createdAt = {};
      if (query.from) filter.createdAt.$gte = query.from;
      if (query.to) filter.createdAt.$lte = query.to;
    }

    const [data, total] = await Promise.all([
      this.movementModel
        .find(filter)
        .populate('productId', 'title sku')
        .sort({ createdAt: -1 })
        .skip(query.skip)
        .limit(query.limit)
        .exec(),
      this.movementModel.countDocuments(filter).exec(),
    ]);

    return { data, total, page: query.page, limit: query.limit };
  }

  level(outletId?: string) {
    const filter = outletId ? { outletId } : {};
    return this.stockModel
      .find(filter)
      .populate('productId', 'title sku')
      .exec();
  }
}
